import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import { getInstitutionByCik } from "@/lib/db/queries";
import { runAnalysis } from "@/lib/ai/deepseek";
import {
  createAnalysisSession,
  getSessionMessages,
  appendSessionMessages,
} from "@/lib/ai/sessions";
import {
  checkAiUsageLimit,
  incrementAiUsage,
  reportApiUsage,
} from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    cik: string;
    question: string;
    sessionId?: string;
    userId?: string;
  };

  if (!body.cik || !body.question) {
    return NextResponse.json(
      { error: "请提供 cik 和 question" },
      { status: 400 }
    );
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const institution = await getInstitutionByCik(db, body.cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  const userId = body.userId ?? "anonymous";
  if (userId !== "anonymous") {
    const usage = await checkAiUsageLimit(db, userId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "本月 AI 分析次数已用完，请升级专业版" },
        { status: 403 }
      );
    }
  }

  let sessionId = body.sessionId;
  if (!sessionId) {
    sessionId = await createAnalysisSession(
      db,
      userId,
      institution.id,
      `${institution.name} 分析`
    );
  }

  const history = await getSessionMessages(db, sessionId);

  const result = await runAnalysis(db, {
    institutionId: institution.id,
    cik: institution.cik,
    institutionName: institution.name,
    question: body.question,
    history,
  });

  await appendSessionMessages(db, sessionId, [
    { role: "user", content: body.question },
    {
      role: "assistant",
      content: result.content,
      thinking: result.thinking,
    },
  ]);

  if (userId !== "anonymous") {
    await incrementAiUsage(db, userId);
    await reportApiUsage(db, userId, "ai_analysis", result.tokens);
  }

  return NextResponse.json({
    sessionId,
    content: result.content,
    thinking: result.thinking,
    tokens: result.tokens,
  });
}
