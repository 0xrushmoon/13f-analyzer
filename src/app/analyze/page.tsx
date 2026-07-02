"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const [cik, setCik] = useState(searchParams.get("cik") ?? "");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<number | null>(null);

  const sendMessage = async () => {
    if (!cik || !question.trim()) return;
    setLoading(true);
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cik, question: userMsg.content, sessionId }),
      });
      const data = (await res.json()) as {
        sessionId?: string;
        content?: string;
        error?: string;
        thinking?: string;
      };
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content ?? data.error ?? "分析失败",
          thinking: data.thinking,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请求失败，请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">AI 持仓分析</h1>
      <p className="text-muted-foreground mb-8">
        基于 DeepSeek 大模型，提供连贯的多轮 13F 持仓解读
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="cik">机构 CIK</Label>
              <Input
                id="cik"
                value={cik}
                onChange={(e) => setCik(e.target.value)}
                placeholder="0001067983（伯克希尔）"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle>对话</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              输入机构 CIK 并提出问题，例如：「分析伯克希尔最新持仓的行业分布」
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.thinking && (
                  <div className="mb-2">
                    <button
                      className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                      onClick={() =>
                        setExpandedThinking(expandedThinking === i ? null : i)
                      }
                    >
                      {expandedThinking === i ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      思考过程
                    </button>
                    {expandedThinking === i && (
                      <pre className="text-xs mt-1 whitespace-pre-wrap opacity-80 max-h-40 overflow-y-auto">
                        {msg.thinking}
                      </pre>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-muted-foreground text-sm animate-pulse">
              AI 正在分析中...
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入您的问题..."
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading || !cik}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p className="p-8">加载中...</p>}>
      <AnalyzeContent />
    </Suspense>
  );
}
