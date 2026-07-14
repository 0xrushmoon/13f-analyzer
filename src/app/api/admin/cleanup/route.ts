import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";
import {
  cleanupInstitutionsWithoutHoldings,
  countInstitutionsWithHoldings,
  deleteFailedFilings,
} from "@/lib/ingest/cleanup";

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getCloudflareEnv();
  const db = await getDb();

  if (!env?.DB || !db) {
    return NextResponse.json(
      { error: "Cloudflare D1 未配置" },
      { status: 503 }
    );
  }

  const failedFilingsRemoved = await deleteFailedFilings(env.DB);
  const { deleted, ciks } = await cleanupInstitutionsWithoutHoldings(
    db,
    env.DB
  );
  const institutionsWithHoldings = await countInstitutionsWithHoldings(env.DB);

  return NextResponse.json({
    failedFilingsRemoved,
    institutionsDeleted: deleted,
    deletedCiks: ciks,
    institutionsWithHoldings,
  });
}
