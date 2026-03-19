"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUpDown, Star, StarOff, ChevronDown, ChevronUp } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import EntryStatusBadge from "./EntryStatusBadge";

export interface ScreenerRow {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  finalScore: number;
  grade: "A" | "B" | "C" | "avoid";
  entryStatus: "Watch" | "Near Trigger" | "Breakout Triggered" | "Avoid";
  gapPct: number | null;
  premarketVolume: number | null;
  rvol: number | null;
  premarketPrice: number | null;
  hasCatalyst: boolean;
  isTradeable: boolean;
  catalystType: string | null;
  dataSource?: string | null;
  calculationMode?: string | null;
  lastUpdated?: string | null;
}

type SortKey = "finalScore" | "gapPct" | "premarketVolume" | "rvol";
type SortDir = "asc" | "desc";

interface ScreenerTableProps {
  data: ScreenerRow[];
  watchlistTickers?: Set<string>;
  onWatchlistToggle?: (ticker: string) => void;
}

function fmt(n: number | null, decimals = 1, suffix = "") {
  if (n == null) return "—";
  return n.toFixed(decimals) + suffix;
}

function fmtVol(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

export default function ScreenerTable({
  data,
  watchlistTickers = new Set(),
  onWatchlistToggle,
}: ScreenerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("finalScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === "desc" ? (
      <ChevronDown size={11} style={{ color: "var(--accent-blue)" }} />
    ) : (
      <ChevronUp size={11} style={{ color: "var(--accent-blue)" }} />
    );
  };

  if (sorted.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        No signals found for current filters.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="screener-table">
        <thead>
          <tr>
            <th style={{ width: 28 }} />
            <th>Ticker</th>
            <th>Company</th>
            <th onClick={() => handleSort("gapPct")} style={{ cursor: "pointer" }}>
              <span className="flex items-center gap-1">
                Gap% <SortIcon k="gapPct" />
              </span>
            </th>
            <th onClick={() => handleSort("premarketVolume")} style={{ cursor: "pointer" }}>
              <span className="flex items-center gap-1">
                PM Vol <SortIcon k="premarketVolume" />
              </span>
            </th>
            <th onClick={() => handleSort("rvol")} style={{ cursor: "pointer" }}>
              <span className="flex items-center gap-1">
                RVOL <SortIcon k="rvol" />
              </span>
            </th>
            <th>Price</th>
            <th>Catalyst</th>
            <th onClick={() => handleSort("finalScore")} style={{ cursor: "pointer" }}>
              <span className="flex items-center gap-1">
                Score <SortIcon k="finalScore" />
              </span>
            </th>
            <th>Grade</th>
            <th>Data Source</th>
            <th>Last Verified</th>
            <th>Status</th>
            <th>Tradeable</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const inWatchlist = watchlistTickers.has(row.ticker);
            return (
              <tr key={row.ticker}>
                {/* Watchlist star */}
                <td>
                  <button
                    onClick={() => onWatchlistToggle?.(row.ticker)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: inWatchlist ? "#f59e0b" : "var(--text-muted)",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    {inWatchlist ? <Star size={13} fill="#f59e0b" /> : <StarOff size={13} />}
                  </button>
                </td>

                {/* Ticker */}
                <td>
                  <Link
                    href={`/stocks/${row.ticker}`}
                    style={{
                      color: "#60a5fa",
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: "none",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {row.ticker}
                  </Link>
                </td>

                {/* Company name */}
                <td>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 160 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.name}
                    </div>
                    {row.sector && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                        {row.sector}
                      </div>
                    )}
                  </div>
                </td>

                {/* Gap % */}
                <td>
                  <span className="chip chip-gap">
                    {row.calculationMode !== "unavailable" ? `+${fmt(row.gapPct, 1)}%` : "N/A"}
                  </span>
                </td>

                {/* Premarket Volume */}
                <td>
                  <span className="chip chip-vol">{fmtVol(row.premarketVolume)}</span>
                </td>

                {/* RVOL */}
                <td>
                  <span className="chip chip-rvol">{fmt(row.rvol, 1)}x</span>
                </td>

                {/* Price */}
                <td>
                  <span
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    ${fmt(row.premarketPrice, 2)}
                  </span>
                </td>

                {/* Catalyst */}
                <td>
                  {row.hasCatalyst ? (
                    <span className="chip chip-catalyst">
                      ★ {row.catalystType ?? "News"}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                  )}
                </td>

                {/* Score */}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 36, flexShrink: 0 }}>
                      <div className="score-bar">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${row.finalScore}%`,
                            background:
                              row.grade === "A"
                                ? "#10b981"
                                : row.grade === "B"
                                ? "#3b82f6"
                                : row.grade === "C"
                                ? "#f59e0b"
                                : "#f43f5e",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: "var(--font-mono, monospace)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.finalScore}
                    </span>
                  </div>
                </td>

                {/* Grade */}
                <td>
                  <ScoreBadge grade={row.grade} size="sm" />
                </td>

                {/* Data Source */}
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span 
                      style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        textTransform: "uppercase",
                        color: row.dataSource === "yahoo" ? "#10b981" : "#f59e0b",
                        letterSpacing: "0.05em"
                      }}
                    >
                      {row.dataSource || "unverified"}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                      {row.calculationMode === "premarket" ? "Premarket-based" : row.calculationMode === "open-based" ? "Open-based" : "N/A"}
                    </span>
                  </div>
                </td>

                {/* Last Verified */}
                <td>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {row.lastUpdated ? new Date(row.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </span>
                </td>

                {/* Entry Status */}
                <td>
                  <EntryStatusBadge status={row.entryStatus} size="sm" />
                </td>

                {/* Tradeable */}
                <td>
                  {row.isTradeable ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "#10b981",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#10b981",
                          display: "inline-block",
                        }}
                      />
                      Yes
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Discovery
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
