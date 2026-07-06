"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/locale-context";

interface AdminStatus {
  counts: {
    institutions: number;
    filings: number;
    holdings: number;
    holdingChanges: number;
    users: number;
  };
  secrets: {
    deepseekApiKey: boolean;
    betterAuthSecret: boolean;
    adminSecret: boolean;
    secUserAgent: boolean;
    googleOAuth: boolean;
  };
  pipeline: {
    institutionsSeeded: boolean;
    backfillComplete: boolean;
    ingestionWorker: string;
    ingestQueue: string;
  };
}

const ADMIN_SECRET_KEY = "holdingskit-admin-secret";

type CountKey = keyof AdminStatus["counts"];

function SecretBadge({
  configured,
  labels,
}: {
  configured: boolean;
  labels: { configured: string; notConfigured: string };
}) {
  return (
    <Badge variant={configured ? "success" : "destructive"}>
      {configured ? labels.configured : labels.notConfigured}
    </Badge>
  );
}

export default function AdminPage() {
  const { dict } = useLocale();
  const t = dict.admin;

  const [adminSecret, setAdminSecret] = useState("");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_SECRET_KEY);
    if (saved) setAdminSecret(saved);
  }, []);

  const authHeaders = useCallback(
    () => ({
      "X-Admin-Secret": adminSecret,
    }),
    [adminSecret],
  );

  const loadStatus = useCallback(async () => {
    if (!adminSecret) {
      setMessage(t.enterAdminSecret);
      return;
    }
    setLoading(true);
    setMessage("");
    sessionStorage.setItem(ADMIN_SECRET_KEY, adminSecret);
    try {
      const res = await fetch("/api/admin/status", { headers: authHeaders() });
      if (!res.ok) {
        setStatus(null);
        setMessage(res.status === 401 ? t.invalidAdminSecret : t.loadStatusFailed);
        return;
      }
      setStatus((await res.json()) as AdminStatus);
    } catch {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  }, [adminSecret, authHeaders, t]);

  const triggerRepair = async () => {
    if (!adminSecret) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/repair-values", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ recomputeChanges: true }),
      });
      const data = (await res.json()) as {
        holdingsFixed?: number;
        institutionsRecomputed?: number;
        error?: string;
      };
      if (res.ok) {
        setMessage(
          t.repairDone
            .replace("{holdings}", String(data.holdingsFixed ?? 0))
            .replace("{recomputed}", String(data.institutionsRecomputed ?? 0))
        );
        await loadStatus();
      } else {
        setMessage(data.error ?? t.repairFailed);
      }
    } catch {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  const triggerBackfill = async () => {
    if (!adminSecret) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/backfill", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = (await res.json()) as {
        queued?: number;
        error?: string;
      };
      if (res.ok) {
        setMessage(t.backfillQueued.replace("{count}", String(data.queued ?? 0)));
        await loadStatus();
      } else {
        setMessage(data.error ?? t.backfillFailed);
      }
    } catch {
      setMessage(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  const badgeLabels = { configured: t.configured, notConfigured: t.notConfigured };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.authTitle}</CardTitle>
          <CardDescription>{t.authDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="admin-secret">ADMIN_SECRET</Label>
            <Input
              id="admin-secret"
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder={t.adminSecretPlaceholder}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={loadStatus} disabled={loading}>
              {t.refreshStatus}
            </Button>
            <Button
              variant="outline"
              onClick={triggerRepair}
              disabled={loading || !adminSecret}
            >
              {t.repairValues}
            </Button>
            <Button
              variant="outline"
              onClick={triggerBackfill}
              disabled={loading || !adminSecret}
            >
              {t.triggerBackfill}
            </Button>
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </CardContent>
      </Card>

      {status && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t.d1Stats}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {(Object.entries(status.counts) as [CountKey, number][]).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between border-b pb-2">
                      <dt className="text-muted-foreground">{t.counts[key]}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ),
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.secretsTitle}</CardTitle>
              <CardDescription>{t.secretsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>DEEPSEEK_API_KEY</span>
                <SecretBadge configured={status.secrets.deepseekApiKey} labels={badgeLabels} />
              </div>
              <div className="flex items-center justify-between">
                <span>BETTER_AUTH_SECRET</span>
                <SecretBadge configured={status.secrets.betterAuthSecret} labels={badgeLabels} />
              </div>
              <div className="flex items-center justify-between">
                <span>ADMIN_SECRET</span>
                <SecretBadge configured={status.secrets.adminSecret} labels={badgeLabels} />
              </div>
              <div className="flex items-center justify-between">
                <span>SEC_USER_AGENT</span>
                <SecretBadge configured={status.secrets.secUserAgent} labels={badgeLabels} />
              </div>
              <div className="flex items-center justify-between">
                <span>Google OAuth</span>
                <SecretBadge configured={status.secrets.googleOAuth} labels={badgeLabels} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.configureDeepSeek}</CardTitle>
              <CardDescription>{t.configureDeepSeekDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t.runInTerminal}</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                {`pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm exec wrangler secret put DEEPSEEK_BASE_URL  # optional, default api.deepseek.com`}
              </pre>
              <p>{t.secUserAgentNote}</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                {`pnpm exec wrangler secret put SEC_USER_AGENT -c wrangler.ingestion.jsonc`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.pipelineTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {t.institutionsSeeded}{" "}
                <SecretBadge
                  configured={status.pipeline.institutionsSeeded}
                  labels={badgeLabels}
                />
              </p>
              <p>
                {t.backfillComplete}{" "}
                <SecretBadge
                  configured={status.pipeline.backfillComplete}
                  labels={badgeLabels}
                />
              </p>
              <p className="text-muted-foreground">
                {t.ingestionWorker
                  .replace("{worker}", status.pipeline.ingestionWorker)
                  .replace("{queue}", status.pipeline.ingestQueue)}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
