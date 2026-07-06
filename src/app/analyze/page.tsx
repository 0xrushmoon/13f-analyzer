"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

function AnalyzeContent() {
  const { dict } = useLocale();
  const t = dict.analyze;
  const pw = dict.paywall;

  const searchParams = useSearchParams();
  const [cik, setCik] = useState(searchParams.get("cik") ?? "");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<number | null>(null);
  const [paywall, setPaywall] = useState<"payment" | "email" | null>(null);

  const sendMessage = async () => {
    if (!cik || !question.trim()) return;
    setLoading(true);
    setPaywall(null);
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
        code?: string;
      };
      if (res.status === 402 || data.code === "PAYMENT_REQUIRED") {
        setPaywall("payment");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (res.status === 403 && data.code === "EMAIL_NOT_VERIFIED") {
        setPaywall("email");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (res.status === 401) {
        setPaywall("payment");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content ?? data.error ?? t.analysisFailed,
          thinking: data.thinking,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.requestFailed },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">
        AI · DeepSeek
      </p>
      <h1 className="text-2xl font-medium mb-2">{t.title}</h1>
      <p className="text-muted-foreground text-xs mb-6">{t.subtitle}</p>

      {paywall && (
        <div className="panel mb-6 border-primary/40">
          <div className="panel-body text-center py-6">
            <p className="text-sm font-medium">{pw.title}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {paywall === "email" ? pw.verifyEmail : pw.description}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {paywall === "email" ? (
                <Button size="sm" className="h-8 text-xs" asChild>
                  <Link href="/login">{dict.nav.login}</Link>
                </Button>
              ) : (
                <>
                  <Button size="sm" className="h-8 text-xs" asChild>
                    <Link href="/pricing">{pw.upgrade}</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                    <Link href="/login">{dict.nav.login}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="panel mb-4">
        <div className="panel-body">
          <Label htmlFor="cik" className="text-xs">
            {t.cikLabel}
          </Label>
          <Input
            id="cik"
            className="h-8 text-xs mt-1"
            value={cik}
            onChange={(e) => setCik(e.target.value)}
            placeholder={t.cikPlaceholder}
          />
        </div>
      </div>

      <div className="panel mb-4 min-h-[400px] flex flex-col">
        <div className="panel-header">{t.chatTitle}</div>
        <div className="panel-body flex-1 space-y-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              {t.emptyState}
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
                      {t.thinking}
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
            <p className="text-muted-foreground text-xs animate-pulse">
              {t.loading}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          className="h-9 text-xs"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.inputPlaceholder}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
          disabled={loading}
        />
        <Button className="h-9" onClick={sendMessage} disabled={loading || !cik}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const { dict } = useLocale();

  return (
    <Suspense fallback={<p className="p-8">{dict.analyze.pageLoading}</p>}>
      <AnalyzeContent />
    </Suspense>
  );
}
