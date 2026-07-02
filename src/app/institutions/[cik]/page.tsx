import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import { TopHoldingsChart } from "@/components/holdings/top-holdings-chart";
import { formatUsd } from "@/lib/utils";
import { getDb } from "@/lib/cloudflare";
import {
  getInstitutionByCik,
  getFilingsByInstitution,
  getLatestFiling,
  getHoldingsByFiling,
} from "@/lib/db/queries";

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ cik: string }>;
}) {
  const { cik } = await params;
  const db = await getDb();

  if (!db) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          数据库未连接。本地开发请配置 Cloudflare D1 绑定。
        </p>
      </div>
    );
  }

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) notFound();

  const filings = await getFilingsByInstitution(db, institution.id);
  const latestFiling = await getLatestFiling(db, institution.id);
  const holdingsList = latestFiling
    ? await getHoldingsByFiling(db, latestFiling.id)
    : [];
  const totalValue = holdingsList.reduce((s, h) => s + h.valueUsd, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{institution.name}</h1>
          <p className="text-muted-foreground mt-1">
            CIK: {institution.cik}
            {institution.ticker && ` · ${institution.ticker}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/holdings?cik=${institution.cik}`}>季度对比</Link>
          </Button>
          <Button asChild>
            <Link href={`/analyze?cik=${institution.cik}`}>AI 分析</Link>
          </Button>
        </div>
      </div>

      {latestFiling && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                持仓总值
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatUsd(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                持仓数量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{holdingsList.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                报告期
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{latestFiling.periodEnd}</p>
              <p className="text-xs text-muted-foreground mt-1">
                申报日期: {latestFiling.filedAt ?? "未知"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 持仓分布</CardTitle>
          </CardHeader>
          <CardContent>
            <TopHoldingsChart holdings={holdingsList.slice(0, 10)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>历史申报</CardTitle>
          </CardHeader>
          <CardContent>
            {filings.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无申报记录</p>
            ) : (
              <ul className="space-y-2">
                {filings.map((f) => (
                  <li
                    key={f.id}
                    className="flex justify-between text-sm border-b pb-2"
                  >
                    <span>{f.periodEnd}</span>
                    <span className="text-muted-foreground">{f.filedAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全部持仓</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={holdingsList} />
        </CardContent>
      </Card>
    </div>
  );
}
