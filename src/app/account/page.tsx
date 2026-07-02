"use client";

import { useState } from "react";
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

export default function AccountPage() {
  const [apiKeyName, setApiKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <h1 className="text-3xl font-bold mb-8">账户中心</h1>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">订阅管理</TabsTrigger>
          <TabsTrigger value="api-keys">API 密钥</TabsTrigger>
          <TabsTrigger value="usage">用量统计</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>当前套餐</CardTitle>
              <CardDescription>管理您的订阅计划</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                当前计划: <strong>免费版</strong>
              </p>
              <Button onClick={startCheckout}>升级至专业版 ($19/月)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API 密钥</CardTitle>
              <CardDescription>
                用于 Agent REST API 认证，格式: Authorization: Bearer sk-13f-xxx
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="key-name">密钥名称</Label>
                  <Input
                    id="key-name"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder="我的应用"
                  />
                </div>
                <Button
                  className="mt-6"
                  onClick={createApiKey}
                  disabled={loading}
                >
                  生成密钥
                </Button>
              </div>
              {newApiKey && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    请立即保存，此密钥仅显示一次：
                  </p>
                  <code className="text-xs break-all">{newApiKey}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>用量统计</CardTitle>
              <CardDescription>本月 API 与 AI 使用情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">API 调用</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">AI 分析次数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
