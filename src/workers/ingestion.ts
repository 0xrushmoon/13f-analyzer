import { eq, sql } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { institutions } from "@/lib/db/schema";
import {
  BACKFILL_QUARTER_COUNT,
  cleanupInstitutionsWithoutHoldings,
  deleteFailedFilings,
  deleteInstitutionsNotInSeed,
} from "@/lib/ingest/cleanup";
import { processFilingIngest, type IngestMessage } from "@/lib/ingest/processor";
import { getRecentQuarterEnds, SecEdgarClient } from "@/lib/sec/client";
import seedData from "@/data/institutions.seed.json";

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  INGEST_QUEUE: Queue;
  SEC_USER_AGENT?: string;
  ADMIN_SECRET?: string;
}

function normalizeCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

async function seedInstitutions(db: ReturnType<typeof createDb>) {
  const seen = new Set<string>();
  for (const item of seedData) {
    const cik = normalizeCik(item.cik);
    if (seen.has(cik)) continue;
    seen.add(cik);
    await db
      .insert(institutions)
      .values({
        cik,
        name: item.name,
        ticker: item.ticker ?? undefined,
        tier: "curated",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: institutions.cik,
        set: {
          name: item.name,
          ticker: item.ticker ?? undefined,
          isActive: true,
          updatedAt: sql`(datetime('now'))`,
        },
      });
  }
}

function buildBackfillMessages(
  institutionCiks: string[],
  force: boolean
): IngestMessage[] {
  const quarters = getRecentQuarterEnds(BACKFILL_QUARTER_COUNT);
  const messages: IngestMessage[] = [];
  for (const cik of institutionCiks) {
    for (const periodEnd of quarters) {
      messages.push({ cik, periodEnd, type: "backfill", force });
    }
  }
  return messages;
}

async function enqueueMessages(env: Env, messages: IngestMessage[]) {
  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    await env.INGEST_QUEUE.sendBatch(
      messages.slice(i, i + batchSize).map((body) => ({ body }))
    );
  }
}

async function handleQueueBatch(
  batch: MessageBatch<IngestMessage>,
  env: Env
) {
  const db = createDb(env.DB);
  const secClient = new SecEdgarClient(env.SEC_USER_AGENT);

  for (const message of batch.messages) {
    try {
      await processFilingIngest(db, env.DB, env.R2, secClient, message.body);
      message.ack();
    } catch (error) {
      console.error("Ingest failed:", error);
      message.retry();
    }
  }
}

async function enqueueBackfill(env: Env, force = false) {
  const db = createDb(env.DB);
  await seedInstitutions(db);

  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const messages = buildBackfillMessages(
    allInstitutions.map((i) => i.cik),
    force
  );
  await enqueueMessages(env, messages);

  return {
    queued: messages.length,
    institutions: allInstitutions.length,
    quarters: BACKFILL_QUARTER_COUNT,
    force,
  };
}

async function enqueueDailySync(env: Env) {
  const db = createDb(env.DB);
  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  for (const inst of allInstitutions) {
    await env.INGEST_QUEUE.send({
      cik: inst.cik,
      type: "sync",
    });
  }

  return { queued: allInstitutions.length };
}

async function resyncFromSeed(env: Env) {
  const db = createDb(env.DB);
  const seedCiks = seedData.map((item) => normalizeCik(item.cik));

  const removedOutsideSeed = await deleteInstitutionsNotInSeed(
    db,
    env.DB,
    seedCiks
  );
  await seedInstitutions(db);

  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const messages = buildBackfillMessages(
    allInstitutions.map((i) => i.cik),
    true
  );
  await enqueueMessages(env, messages);

  return {
    removedOutsideSeed,
    institutions: allInstitutions.length,
    queued: messages.length,
    quarters: BACKFILL_QUARTER_COUNT,
  };
}

async function runCleanup(env: Env) {
  const db = createDb(env.DB);
  const failedFilingsRemoved = await deleteFailedFilings(env.DB);
  const { deleted, ciks } = await cleanupInstitutionsWithoutHoldings(
    db,
    env.DB
  );
  return { failedFilingsRemoved, institutionsDeleted: deleted, deletedCiks: ciks };
}

function verifyAdmin(request: Request, env: Env): boolean {
  const adminSecret = request.headers.get("X-Admin-Secret");
  return Boolean(adminSecret && adminSecret === env.ADMIN_SECRET);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname.startsWith("/admin/")) {
      if (!verifyAdmin(request, env)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (url.pathname === "/admin/backfill") {
        const result = await enqueueBackfill(env, false);
        return Response.json(result);
      }

      if (url.pathname === "/admin/resync") {
        const result = await resyncFromSeed(env);
        return Response.json(result);
      }

      if (url.pathname === "/admin/cleanup") {
        const result = await runCleanup(env);
        return Response.json(result);
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },

  async queue(batch: MessageBatch<IngestMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },

  async scheduled(
    controller: ScheduledController,
    env: Env
  ): Promise<void> {
    const cron = controller.cron ?? "";
    const isQuarterlyBackfill =
      cron === "0 6 15 1,4,7,10 *" || cron === "0 6 30 1,4,7,10 *";

    if (isQuarterlyBackfill) {
      await enqueueBackfill(env, false);
    } else {
      await enqueueDailySync(env);
    }
  },
};
