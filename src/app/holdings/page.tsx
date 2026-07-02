"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatShares } from "@/lib/utils";

interface ChangeItem {
  cusip: string;
  issuerName: string;
  changeType: string;
  sharesDelta: number;
  valueDelta: number;
  valueCurrent: number;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialCik = searchParams.get("cik") ?? "";
  const [cik, setCik] = useState(initialCik);
  const [fromPeriod, setFromPeriod] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cik) return;
    fetch(`/api/institutions/${cik}/filings`)
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as { filings?: { periodEnd: string }[] };
        const periods = (data.filings ?? []).map(
          (f: { periodEnd: string }) => f.periodEnd
        );
        if (periods.length >= 2) {
          setFromPeriod(periods[1]);
          setToPeriod(periods[0]);
        } else if (periods.length === 1) {
          setToPeriod(periods[0]);
        }
      });
  }, [cik]);

  const loadChanges = () => {
    if (!cik || !toPeriod) return;
    setLoading(true);
    fetch(
      `/api/institutions/${cik}/changes?period=${encodeURIComponent(toPeriod)}`
    )
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as { changes?: ChangeItem[] };
        setChanges(data.changes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (cik && toPeriod) loadChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cik, toPeriod]);

  const changeColor = (type: string) => {
    if (type === "new" || type === "increased") return "text-green-600";
    if (type === "closed" || type === "decreased") return "text-red-600";
    return "text-muted-foreground";
  };

  const changeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new: "新建仓",
      increased: "加仓",
      decreased: "减仓",
      closed: "清仓",
      unchanged: "不变",
    };
    return labels[type] ?? type;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">季度对比</h1>
      <p className="text-muted-foreground mb-8">
        对比两个报告期之间的持仓变化，绿色为加仓，红色为减仓
      </p>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cik">机构 CIK</Label>
              <Input
                id="cik"
                value={cik}
                onChange={(e) => setCik(e.target.value)}
                placeholder="0001067983"
              />
            </div>
            <div>
              <Label htmlFor="from">对比起始期</Label>
              <Input
                id="from"
                value={fromPeriod}
                onChange={(e) => setFromPeriod(e.target.value)}
                placeholder="2024-06-30"
              />
            </div>
            <div>
              <Label htmlFor="to">对比目标期</Label>
              <Input
                id="to"
                value={toPeriod}
                onChange={(e) => setToPeriod(e.target.value)}
                placeholder="2024-09-30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : changes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无对比数据，请输入 CIK 并确保已抓取多个季度数据
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>持仓变化 ({changes.length} 项)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4">标的</th>
                    <th className="pb-3 pr-4">变化类型</th>
                    <th className="pb-3 pr-4 text-right">股数变化</th>
                    <th className="pb-3 text-right">市值变化</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.cusip} className="border-b">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.issuerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.cusip}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            c.changeType === "new" || c.changeType === "increased"
                              ? "success"
                              : c.changeType === "closed" ||
                                  c.changeType === "decreased"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {changeLabel(c.changeType)}
                        </Badge>
                      </td>
                      <td
                        className={`py-3 pr-4 text-right ${changeColor(c.changeType)}`}
                      >
                        {c.sharesDelta > 0 ? "+" : ""}
                        {formatShares(c.sharesDelta)}
                      </td>
                      <td
                        className={`py-3 text-right ${changeColor(c.changeType)}`}
                      >
                        {c.valueDelta > 0 ? "+" : ""}
                        {formatUsd(Math.abs(c.valueDelta))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function HoldingsComparePage() {
  return (
    <Suspense fallback={<p className="p-8">加载中...</p>}>
      <CompareContent />
    </Suspense>
  );
}
