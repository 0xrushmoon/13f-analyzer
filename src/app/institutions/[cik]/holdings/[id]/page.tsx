import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/cloudflare";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import {
  getInstitutionByCik,
  getHoldingById,
  getHoldingsByFiling,
  getFilingById,
} from "@/lib/db/queries";
import { formatUsd, formatShares, formatPrice, formatPercent } from "@/lib/utils";
import { getHoldingPriceContext } from "@/lib/market/prices";
import { getKnownSymbol } from "@/lib/market/symbols";
import { getChineseName } from "@/lib/market/chinese-names";
import { getHyperliquidLink } from "@/lib/market/hyperliquid";

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ cik: string; id: string }>;
}) {
  const { cik, id } = await params;
  const holdingId = Number(id);
  if (!Number.isFinite(holdingId)) notFound();

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const t = dict.holdingDetail;

  const db = await getDb();
  if (!db) notFound();

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) notFound();

  const holding = await getHoldingById(db, holdingId);
  if (!holding) notFound();

  const filing = await getFilingById(db, holding.filingId);
  if (!filing || filing.institutionId !== institution.id) notFound();

  const allHoldings = await getHoldingsByFiling(db, holding.filingId);
  const totalValue = allHoldings.reduce((s, h) => s + h.valueUsd, 0);
  const portfolioPct =
    totalValue > 0 ? (holding.valueUsd / totalValue) * 100 : 0;

  const priceCtx = await getHoldingPriceContext(
    holding.cusip,
    holding.shares,
    holding.valueUsd,
    filing.periodEnd
  );

  const symbol = priceCtx.symbol ?? getKnownSymbol(holding.cusip);
  const [chineseName, hlLink] = symbol
    ? await Promise.all([
        locale === "zh-CN" ? getChineseName(symbol) : Promise.resolve(null),
        getHyperliquidLink(symbol),
      ])
    : [null, null];

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 h-8">
        <Link href={`/institutions/${institution.cik}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.backToInstitution}
        </Link>
      </Button>

      <h1 className="text-xl font-semibold tracking-tight">
        {locale === "zh-CN" && chineseName ? (
          <>
            {chineseName}
            <span className="text-muted-foreground font-normal text-base ml-2">
              {holding.issuerName}
            </span>
          </>
        ) : (
          holding.issuerName
        )}
      </h1>
      <p className="text-sm text-muted-foreground mb-2">{institution.name}</p>
      {symbol && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="num text-xs text-primary font-medium">{symbol}</span>
          {locale === "zh-CN" && chineseName && (
            <span className="text-xs text-muted-foreground">({chineseName})</span>
          )}
          {hlLink ? (
            <a
              href={hlLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-terminal-ghost h-7 px-2 text-[10px]"
            >
              {t.tradeOnHyperliquid} · {hlLink.market}
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground">{t.hyperliquidUnavailable}</span>
          )}
        </div>
      )}
      {!symbol && <div className="mb-6" />}

      <div className="panel mb-4">
        <div className="panel-header">
          <h2 className="text-sm font-semibold">{t.title}</h2>
        </div>
        <div className="panel-body">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.cusip}</dt>
              <dd className="num mt-1">{holding.cusip}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.period}</dt>
              <dd className="num mt-1">{filing.periodEnd}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.shares}</dt>
              <dd className="num mt-1 font-medium">{formatShares(holding.shares)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.value}</dt>
              <dd className="num mt-1 font-medium">{formatUsd(holding.valueUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.portfolioPct}</dt>
              <dd className="num mt-1">{portfolioPct.toFixed(2)}%</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.putCall}</dt>
              <dd className="mt-1">{holding.putCall ?? t.putCallNone}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold">{t.marketData}</h2>
        </div>
        <div className="panel-body">
          {priceCtx.symbol ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.symbol}</dt>
                <dd className="num mt-1 font-medium">{priceCtx.symbol}</dd>
              </div>
              {locale === "zh-CN" && chineseName && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.chineseName}</dt>
                  <dd className="mt-1">{chineseName}</dd>
                </div>
              )}
              {priceCtx.impliedPriceAtFiling != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.impliedPriceAtFiling}</dt>
                  <dd className="num mt-1">{formatPrice(priceCtx.impliedPriceAtFiling)}</dd>
                </div>
              )}
              {priceCtx.priceAtFiling != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.priceAtFiling}</dt>
                  <dd className="num mt-1">{formatPrice(priceCtx.priceAtFiling)}</dd>
                </div>
              )}
              {priceCtx.currentPrice != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.currentPrice}</dt>
                  <dd className="num mt-1 font-medium">
                    {formatPrice(priceCtx.currentPrice)}
                    {priceCtx.currentAsOf && (
                      <span className="text-xs text-muted-foreground ml-1">({priceCtx.currentAsOf})</span>
                    )}
                  </dd>
                </div>
              )}
              {priceCtx.gainSinceFilingPct != null && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t.gainSinceFiling}</dt>
                  <dd
                    className={`num mt-1 font-medium ${
                      priceCtx.gainSinceFilingPct >= 0
                        ? "text-market-up"
                        : "text-market-down"
                    }`}
                  >
                    {formatPercent(priceCtx.gainSinceFilingPct)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t.priceUnavailable}</p>
          )}
        </div>
      </div>
    </div>
  );
}
