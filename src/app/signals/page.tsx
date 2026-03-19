"use client";

/**
 * Signal History Page — /signals
 * Allows reviewing past signals with outcome tracking.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import EntryStatusBadge from "@/components/EntryStatusBadge";

interface SignalRow {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  date: string;
  finalScore: number;
  grade: "A" | "B" | "C" | "avoid";
  entryStatus: "Watch" | "Near Trigger" | "Breakout Triggered" | "Avoid";
  gapPct: number | null;
  premarketVolume: number | null;
  rvol: number | null;
  hasCatalyst: boolean;
  isTradeable: boolean;
  outcome: "Win" | "Loss" | "Open" | null;
  outcomeNotes: string | null;
}

const OUTCOME_STYLE: Record<string, { color: string; bg: string }> = {
  Win: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  Loss: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  Open: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (gradeFilter !== "all") params.set("grade", gradeFilter);

    setLoading(true);
    fetch(`/api/signals?${params}`)
      .then((r) => r.json())
      .then((d) => setSignals(d.data ?? []))
      .finally(() => setLoading(false));
  }, [gradeFilter]);

  const fmtVol = (n: number | null) => {
    if (!n) return "—";
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1_000).toFixed(0)}K`;
  };

  const wins = signals.filter((s) => s.outcome === "Win").length;
  const losses = signals.filter((s) => s.outcome === "Loss").length;

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-3">
          <History size={20} style={{ color: "var(--accent-blue)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
              Signal History
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Review past setups · Track what worked
            </p>
          </div>
        </div>

        {/* Win/Loss summary */}
        <div className="flex items-center gap-10">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{wins}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Wins</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f43f5e" }}>{losses}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Losses</div>
          </div>
          {wins + losses > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                {Math.round((wins / (wins + losses)) * 100)}%
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Win Rate</div>
            </div>
          )}
        </div>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Grade:</span>
        {["all", "A", "B", "C", "avoid"].map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={g === "all" ? "btn-ghost" : `badge-${g}`}
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              opacity: gradeFilter === g ? 1 : 0.45,
              transition: "opacity 0.15s",
            }}
          >
            {g === "all" ? "All" : g.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No signal history yet. Run the screener and collect some data.
          </div>
        ) : (
          <table className="screener-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Company</th>
                <th>Gap%</th>
                <th>PM Vol</th>
                <th>RVOL</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Catalyst</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {s.date}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/stocks/${s.ticker}`}
                      style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: "monospace" }}
                    >
                      {s.ticker}
                    </Link>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.name}</span>
                  </td>
                  <td>
                    {s.gapPct != null ? (
                      <span className="chip chip-gap">+{s.gapPct.toFixed(1)}%</span>
                    ) : "—"}
                  </td>
                  <td>
                    <span className="chip chip-vol">{fmtVol(s.premarketVolume)}</span>
                  </td>
                  <td>
                    <span className="chip chip-rvol">{s.rvol?.toFixed(1) ?? "—"}x</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>
                      {s.finalScore}
                    </span>
                  </td>
                  <td>
                    <ScoreBadge grade={s.grade} size="sm" />
                  </td>
                  <td>
                    <EntryStatusBadge status={s.entryStatus} size="sm" />
                  </td>
                  <td>
                    {s.hasCatalyst ? (
                      <span className="chip chip-catalyst">★</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td>
                    {s.outcome ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          color: OUTCOME_STYLE[s.outcome].color,
                          background: OUTCOME_STYLE[s.outcome].bg,
                        }}
                      >
                        {s.outcome}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Open</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
