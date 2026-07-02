import type { Database } from "@/lib/db";
import {
  getInstitutionSummary,
  getHoldingChanges,
} from "@/lib/db/queries";
import { periodToQuarterLabel } from "@/lib/sec/client";

export interface AnalysisContext {
  institution: string;
  cik: string;
  periodEnd: string;
  totalValueUsd: number;
  topHoldings: Array<{
    issuerName: string;
    cusip: string;
    valueUsd: number;
    shares: number;
  }>;
  quarterlyChanges: {
    newPositions: number;
    increased: number;
    decreased: number;
    closed: number;
  };
}

export async function buildAnalysisContext(
  db: Database,
  institutionId: number,
  cik: string,
  institutionName: string
): Promise<AnalysisContext | null> {
  const summary = await getInstitutionSummary(db, institutionId);
  if (!summary) return null;

  const changes = await getHoldingChanges(
    db,
    institutionId,
    summary.latestFiling.periodEnd
  );

  return {
    institution: institutionName,
    cik,
    periodEnd: summary.latestFiling.periodEnd,
    totalValueUsd: summary.totalValue,
    topHoldings: summary.topHoldings.map((h) => ({
      issuerName: h.issuerName,
      cusip: h.cusip,
      valueUsd: h.valueUsd,
      shares: h.shares,
    })),
    quarterlyChanges: {
      newPositions: changes.filter((c) => c.changeType === "new").length,
      increased: changes.filter((c) => c.changeType === "increased").length,
      decreased: changes.filter((c) => c.changeType === "decreased").length,
      closed: changes.filter((c) => c.changeType === "closed").length,
    },
  };
}

export const SYSTEM_PROMPT = `你是一位专业的 13F 持仓分析专家，擅长解读美国 SEC 13F-HR 文件中的机构持仓数据。
请用简体中文回答，分析应具体、有数据支撑，避免空泛描述。
当分析持仓变化时，关注：新增仓位、加仓、减仓、清仓及其可能的投资逻辑。
输出格式：先给出核心结论（1-2句），再展开详细分析。`;

export function buildAnalysisMessages(
  context: AnalysisContext,
  history: Array<{ role: string; content: string }>,
  userQuestion: string,
  summary?: string
) {
  const contextBlock = JSON.stringify(context, null, 2);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `以下是 ${context.institution} 的最新 13F 持仓上下文（截至 ${periodToQuarterLabel(context.periodEnd)}）：\n\`\`\`json\n${contextBlock}\n\`\`\``,
    },
    {
      role: "assistant",
      content: "我已了解该机构的最新持仓数据，请提出您想分析的问题。",
    },
  ];

  if (summary) {
    messages.push({
      role: "user",
      content: `[历史对话摘要] ${summary}`,
    });
  }

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: userQuestion });
  return messages;
}

export function compressHistoryIfNeeded(
  messages: Array<{ role: string; content: string }>,
  maxMessages = 20
): { messages: typeof messages; needsSummary: boolean } {
  if (messages.length <= maxMessages) {
    return { messages, needsSummary: false };
  }
  return {
    messages: messages.slice(-maxMessages),
    needsSummary: true,
  };
}
