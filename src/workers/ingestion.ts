import { createDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { institutions } from "@/lib/db/schema";
import { processFilingIngest, type IngestMessage } from "@/lib/ingest/processor";
import { SecEdgarClient, getRecentQuarterEnds } from "@/lib/sec/client";
import seedData from "@/data/institutions.seed.json";

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  INGEST_QUEUE: Queue;
  SEC_USER_AGENT?: string;
}

async function seedInstitutions(db: ReturnType<typeof createDb>) {
  const seen = new Set<string>();
  for (const item of seedData) {
    const cik = item.cik.replace(/^0+/, "").padStart(10, "0");
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
      .onConflictDoNothing();
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

async function enqueueBackfill(env: Env) {
  const db = createDb(env.DB);
  await seedInstitutions(db);

  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const quarters = getRecentQuarterEnds(4);
  const messages: IngestMessage[] = [];

  for (const inst of allInstitutions) {
    for (const periodEnd of quarters) {
      messages.push({
        cik: inst.cik,
        periodEnd,
        type: "backfill",
      });
    }
  }

  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    await env.INGEST_QUEUE.sendBatch(
      messages.slice(i, i + batchSize).map((body) => ({ body }))
    );
  }

  return { queued: messages.length };
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/admin/backfill" && request.method === "POST") {
      const adminSecret = request.headers.get("X-Admin-Secret");
      if (!adminSecret || adminSecret !== (env as Env & { ADMIN_SECRET?: string }).ADMIN_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = await enqueueBackfill(env);
      return Response.json(result);
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
      await enqueueBackfill(env);
    } else {
      await enqueueDailySync(env);
    }
  },
};
