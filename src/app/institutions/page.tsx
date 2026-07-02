"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";

interface Institution {
  id: number;
  cik: string;
  name: string;
  ticker: string | null;
  tier: string;
  summary?: {
    totalValue: number;
    periodEnd: string;
    holdingsCount: number;
  } | null;
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/institutions${params}`)
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as { institutions?: Institution[] };
        setInstitutions(data.institutions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">机构浏览</h1>
        <p className="text-muted-foreground">
          精选 100+ 顶级投资机构，数据来自 SEC 13F-HR 申报
        </p>
      </div>

      <Input
        placeholder="搜索机构名称、CIK 或代码..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mb-8"
      />

      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : institutions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无机构数据。请先运行数据回填（POST /api/admin/backfill 或 ingestion worker）。
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => (
            <Link key={inst.id} href={`/institutions/${inst.cik}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{inst.name}</CardTitle>
                    <Badge variant="secondary">{inst.tier}</Badge>
                  </div>
                  <CardDescription>CIK: {inst.cik}</CardDescription>
                </CardHeader>
                <CardContent>
                  {inst.summary ? (
                    <div className="space-y-1 text-sm">
                      <p>
                        持仓总值:{" "}
                        <span className="font-medium">
                          {formatUsd(inst.summary.totalValue)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {inst.summary.holdingsCount} 个持仓 · 截至{" "}
                        {inst.summary.periodEnd}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无持仓数据</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
