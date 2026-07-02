import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth-middleware";
import { getInstitutionByCik } from "@/lib/db/queries";
import { runAnalysis } from "@/lib/ai/deepseek";
import {
  createAnalysisSession,
  getSessionMessages,
  appendSessionMessages,
} from "@/lib/ai/sessions";
import { reportApiUsage } from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    cik: string;
    question: string;
    session_id?: string;
  };

  if (!body.cik || !body.question) {
    return NextResponse.json(
      { error: "请提供 cik 和 question" },
      { status: 400 }
    );
  }

  const institution = await getInstitutionByCik(auth.db, body.cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  let sessionId = body.session_id;
  if (!sessionId) {
    sessionId = await createAnalysisSession(
      auth.db,
      auth.userId,
      institution.id,
      `${institution.name} API 分析`
    );
  }

  const history = await getSessionMessages(auth.db, sessionId);
  const result = await runAnalysis(auth.db, {
    institutionId: institution.id,
    cik: institution.cik,
    institutionName: institution.name,
    question: body.question,
    history,
  });

  await appendSessionMessages(auth.db, sessionId, [
    { role: "user", content: body.question },
    {
      role: "assistant",
      content: result.content,
      thinking: result.thinking,
    },
  ]);

  await reportApiUsage(auth.db, auth.userId, "ai_analysis", result.tokens);

  return NextResponse.json({
    session_id: sessionId,
    content: result.content,
    thinking: result.thinking,
    tokens: result.tokens,
  });
}
