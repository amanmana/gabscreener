/**
 * Stock Detail Page — /stocks/[ticker]
 * Direct Server Component querying the database.
 * No API call means NO domain/VERCEL_URL mismatch issues.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Zap, ExternalLink } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import EntryStatusBadge from "@/components/EntryStatusBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import RiskCalculator from "@/components/RiskCalculator";

// Database
import { db } from "@/db/client";
import {
  stocks,
  signals,
  premarketSnapshots,
  intradayMetrics,
  catalysts,
  shariahUniverse,
  dailyPrices,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const revalidate = 30; // 30s ISR

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  const today = new Date().toISOString().split("T")[0];

  // 1. Fetch data in parallel directly from DB (FAST!)
  const [
    [stockRow],
    [shariahRow],
    [signal],
    [premarket],
    [intraday],
    [catalyst],
    priceHistory,
  ] = await Promise.all([
    db.select().from(stocks).where(eq(stocks.ticker, upper)).limit(1),
    db.select().from(shariahUniverse).where(eq(shariahUniverse.ticker, upper)).limit(1),
    db.select().from(signals).where(and(eq(signals.ticker, upper), eq(signals.date, today))).limit(1),
    db.select().from(premarketSnapshots).where(and(eq(premarketSnapshots.ticker, upper), eq(premarketSnapshots.date, today))).limit(1),
    db.select().from(intradayMetrics).where(and(eq(intradayMetrics.ticker, upper), eq(intradayMetrics.date, today))).limit(1),
    db.select().from(catalysts).where(and(eq(catalysts.ticker, upper), eq(catalysts.date, today))).limit(1),
    db.select().from(dailyPrices).where(eq(dailyPrices.ticker, upper)).orderBy(desc(dailyPrices.date)).limit(30).catch(() => []),
  ]);

  if (!stockRow) notFound();

  // Handle data format normalization
  const stock = stockRow;
  const shariah = shariahRow ?? null;

  return (
    <div className="animate-in">
      {/* Back nav */}
      <Link
        href="/screener"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={13} />
        Back to Screener
      </Link>

      {/* Stock header */}
      <div
        className="surface"
        style={{ padding: "20px 24px", marginBottom: 20 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#60a5fa",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {stock.ticker}
              </h1>
              <span className="chip chip-shariah">
                <Shield size={9} />
                Shariah
              </span>
              {signal?.hasCatalyst && (
                <span className="chip chip-catalyst">
                  <Zap size={9} />
                  {signal.catalystType ?? "Catalyst"}
                </span>
              )}
            </div>
            <div style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 500 }}>
              {stock.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {stock.exchange} · {stock.sector ?? "Technology"} · {stock.industry ?? ""}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>
              ${premarket?.premarketPrice?.toFixed(2) ?? "—"}
            </div>
            {premarket && (
              <div style={{ fontSize: 14, fontWeight: 600, color: premarket.gapPct >= 0 ? "#10b981" : "#f43f5e" }}>
                {premarket.gapPct >= 0 ? "+" : ""}{premarket.gapPct.toFixed(2)}%
              </div>
            )}
            <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {signal && (
                <>
                  <ScoreBadge grade={signal.grade} score={signal.finalScore} size="md" />
                  <EntryStatusBadge status={signal.entryStatus} size="md" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Score Breakdown */}
        {signal ? (
          <ScoreBreakdown
            gapScore={signal.gapScore}
            premarketVolScore={signal.premarketVolScore}
            rvolScore={signal.rvolScore}
            structureScore={signal.structureScore}
            liquidityScore={signal.liquidityScore}
            catalystScore={signal.catalystScore}
            totalPenalty={signal.totalPenalty}
            finalScore={signal.finalScore}
            grade={signal.grade}
          />
        ) : (
          <div className="card">
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No signal data for today.
            </p>
          </div>
        )}

        {/* Risk Calculator */}
        {(() => {
          const entry = premarket?.premarketPrice ?? 0;
          const stop = premarket?.premarketVwap ? premarket.premarketVwap * 0.98 : 0;
          const riskPerShare = entry - stop;
          const target = riskPerShare > 0 ? entry + riskPerShare * 2 : 0;

          return (
            <RiskCalculator
              key={stock.ticker}
              defaultEntry={Number(entry.toFixed(2))}
              defaultStop={Number(stop.toFixed(2))}
              defaultTarget={Number(target.toFixed(2))}
            />
          );
        })()}
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {/* Premarket Snapshot */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Premarket Snapshot
          </h3>
          {premarket ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <MetricRow label="PM Price" value={`$${premarket.premarketPrice.toFixed(2)}`} />
              <MetricRow label="Prev Close" value={`$${premarket.prevClose.toFixed(2)}`} />
              <MetricRow label="PM High" value={premarket.premarketHigh ? `$${premarket.premarketHigh.toFixed(2)}` : "—"} />
              <MetricRow label="PM VWAP" value={premarket.premarketVwap ? `$${premarket.premarketVwap.toFixed(2)}` : "—"} />
              <MetricRow
                label="PM Volume"
                value={
                  premarket.premarketVolume == null ? "—" :
                  premarket.premarketVolume >= 1_000_000
                    ? `${(premarket.premarketVolume / 1_000_000).toFixed(1)}M`
                    : `${(premarket.premarketVolume / 1_000).toFixed(0)}K`
                }
                highlight
              />
              <MetricRow label="Gap %" value={`${premarket.gapPct >= 0 ? "+" : ""}${premarket.gapPct.toFixed(2)}%`} highlight />
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No premarket data</p>
          )}
        </div>

        {/* Intraday Metrics */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Intraday Conditions
          </h3>
          {intraday ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <MetricRow label="RVOL" value={`${intraday.rvol?.toFixed(1) ?? "1.0"}x`} highlight />
              <MetricRow label="Spread %" value={intraday.spreadPct ? `${intraday.spreadPct.toFixed(2)}%` : "—"} />
              <BoolRow label="Holds above VWAP" value={intraday.holdsAboveVwap} />
              <BoolRow label="Near PM High" value={intraday.nearPremarketHigh} />
              <BoolRow label="Tight Consolidation" value={intraday.tightConsolidation} />
              <BoolRow label="Weak Rejection" value={intraday.weakRejection} negative />
              <BoolRow label="Choppy Structure" value={intraday.choppyStructure} negative />
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No intraday data</p>
          )}
        </div>

        {/* Shariah Info */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Shariah Compliance
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MetricRow
              label="Status"
              value={stock.shariahStatus === "compliant" ? "✓ Compliant" : stock.shariahStatus}
              highlight={stock.shariahStatus === "compliant"}
            />
            {shariah && (
              <>
                <MetricRow label="Source" value={shariah.source} />
                {shariah.complianceScore && (
                  <MetricRow
                    label="Score"
                    value={`${shariah.complianceScore.toFixed(0)}/100`}
                  />
                )}
                {shariah.lastReviewedAt && (
                  <MetricRow
                    label="Last Reviewed"
                    value={new Date(shariah.lastReviewedAt).toLocaleDateString()}
                  />
                )}
                {shariah.notes && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {shariah.notes}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Catalyst */}
      {catalyst && (
        <div
          className="card"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} style={{ color: "#a78bfa" }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>
              Catalyst — {catalyst.type.charAt(0).toUpperCase() + catalyst.type.slice(1)}
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {catalyst.headline}
          </p>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
            Source: {catalyst.source}
          </div>
          {catalyst.url && (
            <a
              href={catalyst.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
                fontSize: 12,
                color: "#a78bfa",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={11} />
              Read more
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: highlight ? 700 : 500,
          color: highlight ? "var(--text-primary)" : "var(--text-secondary)",
          fontFamily: "monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BoolRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: boolean | null;
  negative?: boolean;
}) {
  const isGood = negative ? !value : value;
  const color = isGood ? "#10b981" : value ? "#f43f5e" : "var(--text-muted)";
  const icon = isGood ? "✓" : value ? "✗" : "—";

  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 12, color, fontWeight: value != null ? 600 : 400 }}>
        {icon}
      </span>
    </div>
  );
}
