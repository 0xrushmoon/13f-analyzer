import {
  buildAnalysisContext,
  buildAnalysisMessages,
  compressHistoryIfNeeded,
} from "./context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

export interface DeepSeekResponse {
  content: string;
  thinking?: string;
  tokens: number;
}

export async function callDeepSeek(
  messages: Array<{ role: string; content: string }>
): Promise<DeepSeekResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

  if (!apiKey) {
    return {
      content:
        "DeepSeek API 密钥未配置。请在环境变量中设置 DEEPSEEK_API_KEY 后重试。",
      tokens: 0,
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages,
      extra_body: { thinking: { type: "enabled" } },
      reasoning_effort: "high",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: {
        content: string;
        reasoning_content?: string;
      };
    }>;
    usage?: { total_tokens?: number };
  };

  const choice = data.choices[0]?.message;
  return {
    content: choice?.content ?? "分析完成，但未返回内容。",
    thinking: choice?.reasoning_content,
    tokens: data.usage?.total_tokens ?? 0,
  };
}

export async function runAnalysis(
  db: import("@/lib/db").Database,
  params: {
    institutionId: number;
    cik: string;
    institutionName: string;
    question: string;
    history: ChatMessage[];
    summary?: string;
  }
): Promise<DeepSeekResponse> {
  const context = await buildAnalysisContext(
    db,
    params.institutionId,
    params.cik,
    params.institutionName
  );

  if (!context) {
    return {
      content: "该机构暂无可用持仓数据，请先完成数据抓取。",
      tokens: 0,
    };
  }

  const { messages: trimmedHistory } = compressHistoryIfNeeded(params.history);
  const messages = buildAnalysisMessages(
    context,
    trimmedHistory,
    params.question,
    params.summary
  );

  return callDeepSeek(messages);
}
