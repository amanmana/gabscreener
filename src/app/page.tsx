/**
 * Dashboard Page — /
 * Server component. Shows summary stats and quick access.
 */

import Link from "next/link";
import { TrendingUp, Zap, Eye, Activity, ArrowRight, Shield, AlertTriangle } from "lucide-react";
import { db } from "@/db/client";
import { signals, stocks } from "@/db/schema";
import { eq, and, count, avg, sql } from "drizzle-orm";
import ScoreBadge from "@/components/ScoreBadge";
import EntryStatusBadge from "@/components/EntryStatusBadge";

export const revalidate = 60; // ISR: revalidate every 60s

// Mock data for "Demo Mode" when DB is not connected
const DEMO_DATA = {
  totalSignals: 42,
  aCount: 12,
  bCount: 18,
  tradeableCount: 8,
  avgScore: 72,
  topSignals: [
    { ticker: "NVDA", name: "NVIDIA Corporation", finalScore: 94, grade: "A", entryStatus: "Breakout Triggered", gapPct: 12.4, hasCatalyst: true, isTradeable: true, premarketPrice: 155.0 },
    { ticker: "CRWD", name: "CrowdStrike Holdings", finalScore: 88, grade: "A", entryStatus: "Near Trigger", gapPct: 8.7, hasCatalyst: true, isTradeable: true, premarketPrice: 413.0 },
    { ticker: "AAPL", name: "Apple Inc.", finalScore: 82, grade: "A", entryStatus: "Watch", gapPct: 4.2, hasCatalyst: true, isTradeable: false, premarketPrice: 232.0 },
    { ticker: "MSFT", name: "Microsoft Corporation", finalScore: 78, grade: "B", entryStatus: "Near Trigger", gapPct: 5.1, hasCatalyst: false, isTradeable: true, premarketPrice: 432.0 },
    { ticker: "TSM", name: "Taiwan Semiconductor Mfg", finalScore: 75, grade: "B", entryStatus: "Watch", gapPct: 4.8, hasCatalyst: false, isTradeable: false, premarketPrice: 185.5 },
    { ticker: "ADBE", name: "Adobe Inc.", finalScore: 72, grade: "B", entryStatus: "Watch", gapPct: 6.2, hasCatalyst: true, isTradeable: false, premarketPrice: 459.0 },
  ],
  isDemo: true,
};

async function getDashboardData() {
  const today = new Date().toISOString().split("T")[0];

  try {
    const [totalSignals, aCount, bCount, tradeableCount, topSignals, avgScoreResult] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(signals)
          .where(eq(signals.date, today))
          .then((r) => r[0]?.count ?? 0),

        db
          .select({ count: count() })
          .from(signals)
          .where(and(eq(signals.date, today), eq(signals.grade, "A")))
          .then((r) => r[0]?.count ?? 0),

        db
          .select({ count: count() })
          .from(signals)
          .where(and(eq(signals.date, today), eq(signals.grade, "B")))
          .then((r) => r[0]?.count ?? 0),

        db
          .select({ count: count() })
          .from(signals)
          .where(and(eq(signals.date, today), eq(signals.isTradeable, true)))
          .then((r) => r[0]?.count ?? 0),

        db
          .select({
            ticker: signals.ticker,
            name: stocks.name,
            finalScore: signals.finalScore,
            grade: signals.grade,
            entryStatus: signals.entryStatus,
            gapPct: signals.gapPct,
            hasCatalyst: signals.hasCatalyst,
            isTradeable: signals.isTradeable,
            premarketPrice: signals.premarketPrice,
          })
          .from(signals)
          .innerJoin(stocks, eq(signals.ticker, stocks.ticker))
          .where(
            and(
              eq(signals.date, today),
              sql`${signals.grade} IN ('A','B')`
            )
          )
          .orderBy(sql`${signals.finalScore} DESC`)
          .limit(6),

        db
          .select({ avg: avg(signals.finalScore) })
          .from(signals)
          .where(eq(signals.date, today))
          .then((r) => Math.round(Number(r[0]?.avg ?? 0))),
      ]);

    // If no signals today, might be unseeded
    if (totalSignals === 0) return DEMO_DATA;

    return { totalSignals, aCount, bCount, tradeableCount, topSignals, avgScore: avgScoreResult, isDemo: false };
  } catch (err) {
    console.warn("[Dashboard DB Error] Defaulting to Demo Mode:", err);
    return DEMO_DATA;
  }
}

export default async function DashboardPage() {
  const { totalSignals, aCount, bCount, tradeableCount, topSignals, isDemo } =
    await getDashboardData();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="animate-in">
      {/* DB Warning Banner */}
      {isDemo && (
        <div 
          style={{ 
            background: "rgba(245,158,11,0.1)", 
            border: "1px solid rgba(245,158,11,0.2)", 
            padding: "10px 16px", 
            borderRadius: 8, 
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <strong style={{ color: "#f59e0b" }}>Demo Mode:</strong> Database connection failed or unseeded. 
            Showing sample data. <Link href="/settings" style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>Configure DATABASE_URL</Link> to see real signals.
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3 mb-2">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            Gap Screener Dashboard
          </h1>
          <span className="chip chip-shariah">
            <Shield size={9} />
            Shariah-Compliant
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{today}</p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Total Signals"
          value={totalSignals.toString()}
          sub="gap-up setups today"
          color="#3b82f6"
        />
        <StatCard
          icon={<Zap size={18} />}
          label="A-Grade Setups"
          value={aCount.toString()}
          sub="score 80+"
          color="#10b981"
          highlight
        />
        <StatCard
          icon={<Eye size={18} />}
          label="B-Grade Setups"
          value={bCount.toString()}
          sub="score 65–79"
          color="#60a5fa"
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Tradeable"
          value={tradeableCount.toString()}
          sub="pass tradeability check"
          color="#8b5cf6"
        />
      </div>

      {/* Top setups */}
      <div className="surface" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Top Setups Today
          </h2>
          <Link
            href="/screener"
            style={{
              fontSize: 12,
              color: "var(--accent-blue)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div style={{ padding: "8px 0" }}>
          {topSignals.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No A/B signals today. Run a scan or seed the database.
            </div>
          ) : (
            topSignals.map((s) => (
              <Link
                key={s.ticker}
                href={`/stocks/${s.ticker}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="setup-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 20px",
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Ticker */}
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#60a5fa",
                        fontFamily: "monospace",
                      }}
                    >
                      {s.ticker}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      ${s.premarketPrice?.toFixed(2)}
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name}
                    </div>
                  </div>

                  {/* Gap */}
                  <span className="chip chip-gap">
                    +{s.gapPct?.toFixed(1)}%
                  </span>

                  {/* Catalyst */}
                  {s.hasCatalyst && (
                    <span className="chip chip-catalyst">★ Catalyst</span>
                  )}

                  {/* Score badge */}
                  <ScoreBadge grade={s.grade as "A"|"B"|"C"|"avoid"} score={s.finalScore} size="sm" />

                  {/* Entry status */}
                  <EntryStatusBadge status={s.entryStatus as "Watch"|"Near Trigger"|"Breakout Triggered"|"Avoid"} size="sm" />

                  {/* Tradeable */}
                  {s.isTradeable && (
                    <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✓ Tradeable</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="surface" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Product Philosophy
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Gap-up continuation only — no short setups",
              "Conservative: fewer but higher-quality signals",
              "Shariah-compliant US stocks only",
              "Long-only — capital preservation first",
              "Avoid wide spreads & poor liquidity",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 8 }}>
                <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Signal Grades
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { grade: "A", range: "80–100", desc: "Prime setup — act with confidence", color: "#10b981" },
              { grade: "B", range: "65–79", desc: "Good setup — proceed with caution", color: "#60a5fa" },
              { grade: "C", range: "50–64", desc: "Marginal — hidden by default", color: "#f59e0b" },
              { grade: "avoid", range: "< 50", desc: "Skip — risk exceeds reward", color: "#f43f5e" },
            ].map((g) => (
              <div key={g.grade} className="flex items-center gap-10">
                <ScoreBadge grade={g.grade as "A"|"B"|"C"|"avoid"} size="sm" />
                <span style={{ fontSize: 11, color: "var(--text-muted)", width: 50 }}>{g.range}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{g.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="stat-card"
      style={{
        borderColor: highlight ? `${color}40` : "var(--border)",
        background: highlight ? `${color}0a` : "var(--bg-surface)",
      }}
    >
      <div style={{ color, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: highlight ? color : "var(--text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}
