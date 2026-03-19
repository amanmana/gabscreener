/**
 * Stock Detail Page — /stocks/[ticker]
 * Server component. Shows full signal breakdown, risk calculator,
 * catalyst card, and Shariah compliance info.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Zap, ExternalLink } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import EntryStatusBadge from "@/components/EntryStatusBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import RiskCalculator from "@/components/RiskCalculator";

export const revalidate = 30;

async function getStockData(ticker: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/stocks/${ticker}`, {
    next: { revalidate: 30 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch stock");
  return res.json();
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const data = await getStockData(ticker.toUpperCase());

  if (!data || !data.stock) notFound();

  const { stock, shariahUniverse, signal, premarket, intraday, catalyst } = data;

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
              <div style={{ fontSize: 14, fontWeight: 600, color: "#10b981" }}>
                +{premarket.gapPct.toFixed(2)}%
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
        <RiskCalculator
          defaultEntry={premarket?.premarketPrice ?? 0}
          defaultStop={
            premarket?.premarketVwap
              ? premarket.premarketVwap * 0.98
              : 0
          }
        />
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
                  premarket.premarketVolume >= 1_000_000
                    ? `${(premarket.premarketVolume / 1_000_000).toFixed(1)}M`
                    : `${(premarket.premarketVolume / 1_000).toFixed(0)}K`
                }
                highlight
              />
              <MetricRow label="Gap %" value={`+${premarket.gapPct.toFixed(2)}%`} highlight />
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
              <MetricRow label="RVOL" value={`${intraday.rvol?.toFixed(1)}x`} highlight />
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
            {shariahUniverse && (
              <>
                <MetricRow label="Source" value={shariahUniverse.source} />
                {shariahUniverse.complianceScore && (
                  <MetricRow
                    label="Score"
                    value={`${shariahUniverse.complianceScore.toFixed(0)}/100`}
                  />
                )}
                {shariahUniverse.lastReviewedAt && (
                  <MetricRow
                    label="Last Reviewed"
                    value={new Date(shariahUniverse.lastReviewedAt).toLocaleDateString()}
                  />
                )}
                {shariahUniverse.notes && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {shariahUniverse.notes}
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
