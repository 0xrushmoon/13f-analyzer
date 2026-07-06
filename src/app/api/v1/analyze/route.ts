import { NextRequest, NextResponse } from "next/server";
import { withAgentAccess } from "@/lib/api/agent-access";
import { getInstitutionByCik } from "@/lib/db/queries";
import { runAnalysis } from "@/lib/ai/deepseek";
import {
  createAnalysisSession,
  getSessionMessages,
  appendSessionMessages,
} from "@/lib/ai/sessions";
import { reportApiUsage } from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  return withAgentAccess(request, "analyze", async ({ db, userId, payment }) => {
    const body = (await request.json()) as {
      cik: string;
      question: string;
      session_id?: string;
    };

    if (!body.cik || !body.question) {
      return NextResponse.json(
        { error: "cik and question are required" },
        { status: 400 },
      );
    }

    const institution = await getInstitutionByCik(db, body.cik);
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    let sessionId = body.session_id;
    if (!sessionId) {
      sessionId = await createAnalysisSession(
        db,
        userId,
        institution.id,
        `${institution.name} analysis`,
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

    if (payment === "api_key") {
      await reportApiUsage(db, userId, "ai_analysis", result.tokens);
    }

    return NextResponse.json({
      session_id: sessionId,
      content: result.content,
      thinking: result.thinking,
      tokens: result.tokens,
    });
  });
}
