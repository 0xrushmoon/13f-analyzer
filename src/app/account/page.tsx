"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/contexts/locale-context";

export default function AccountPage() {
  const { dict } = useLocale();
  const t = dict.account;

  const [apiKeyName, setApiKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("free");
  const [usage, setUsage] = useState({ apiCalls: 0, aiAnalyses: 0 });
  const [keys, setKeys] = useState<
    Array<{ id: number; name: string; keyPrefix: string; lastUsedAt: string | null }>
  >([]);

  const loadAccount = async () => {
    const [usageRes, keysRes] = await Promise.all([
      fetch("/api/account/usage"),
      fetch("/api/account/api-keys"),
    ]);
    if (usageRes.ok) {
      const data = (await usageRes.json()) as {
        plan?: string;
        apiCalls?: number;
        aiAnalyses?: number;
      };
      setPlan(data.plan ?? "free");
      setUsage({
        apiCalls: data.apiCalls ?? 0,
        aiAnalyses: data.aiAnalyses ?? 0,
      });
    }
    if (keysRes.ok) {
      const data = (await keysRes.json()) as {
        keys?: Array<{
          id: number;
          name: string;
          keyPrefix: string;
          lastUsedAt: string | null;
        }>;
      };
      setKeys(data.keys ?? []);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const createApiKey = async () => {
    if (!apiKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: apiKeyName }),
      });
      const data = (await res.json()) as { key?: string };
      if (data.key) {
        setNewApiKey(data.key);
        setApiKeyName("");
        await loadAccount();
      }
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">{t.title}</h1>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">{t.subscriptionTab}</TabsTrigger>
          <TabsTrigger value="api-keys">{t.apiKeysTab}</TabsTrigger>
          <TabsTrigger value="usage">{t.usageTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>{t.currentPlan}</CardTitle>
              <CardDescription>{t.subscriptionDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                {t.currentPlanLabel}{" "}
                <strong>{plan === "pro" ? t.proPlan : t.freePlan}</strong>
              </p>
              {plan !== "pro" && (
                <Button onClick={startCheckout}>{t.upgradeToPro}</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>{t.apiKeysTitle}</CardTitle>
              <CardDescription>{t.apiKeysDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="key-name">{t.keyName}</Label>
                  <Input
                    id="key-name"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder={t.keyNamePlaceholder}
                  />
                </div>
                <Button
                  className="mt-6"
                  onClick={createApiKey}
                  disabled={loading}
                >
                  {t.generateKey}
                </Button>
              </div>
              {newApiKey && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">{t.saveKeyWarning}</p>
                  <code className="text-xs break-all">{newApiKey}</code>
                </div>
              )}
              {keys.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {keys.map((k) => (
                    <li
                      key={k.id}
                      className="flex justify-between border-b border-border pb-2"
                    >
                      <span>
                        {k.name}{" "}
                        <code className="text-xs text-muted-foreground">
                          {k.keyPrefix}…
                        </code>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {k.lastUsedAt ? k.lastUsedAt.slice(0, 10) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>{t.usageTitle}</CardTitle>
              <CardDescription>{t.usageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold num">{usage.apiCalls}</p>
                  <p className="text-sm text-muted-foreground">{t.apiCalls}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold num">{usage.aiAnalyses}</p>
                  <p className="text-sm text-muted-foreground">{t.aiAnalyses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
