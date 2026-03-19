"use client";

/**
 * Watchlist Page — /watchlist
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Trash2, ArrowRight } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import EntryStatusBadge from "@/components/EntryStatusBadge";

interface WatchlistItem {
  id: number;
  ticker: string;
  name: string | null;
  exchange: string | null;
  notes: string | null;
  addedAt: string;
  finalScore: number | null;
  grade: "A" | "B" | "C" | "avoid" | null;
  entryStatus: "Watch" | "Near Trigger" | "Breakout Triggered" | "Avoid" | null;
  gapPct: number | null;
  isTradeable: boolean | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setItems(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (ticker: string) => {
    await fetch(`/api/watchlist?ticker=${ticker}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.ticker !== ticker));
  };

  return (
    <div className="animate-in">
      <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
        <Star size={20} style={{ color: "#f59e0b" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
            Watchlist
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {items.length} saved ticker{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 6, borderRadius: 6 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Star size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              No stocks in watchlist yet.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
              Click the ☆ star on any stock in the screener to add it here.
            </p>
            <Link
              href="/screener"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 16,
                color: "var(--accent-blue)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Go to Screener <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <table className="screener-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Gap%</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Tradeable</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      href={`/stocks/${item.ticker}`}
                      style={{
                        color: "#60a5fa",
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.ticker}
                    </Link>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {item.name ?? "—"}
                    </span>
                  </td>
                  <td>
                    {item.gapPct != null ? (
                      <span className="chip chip-gap">+{item.gapPct.toFixed(1)}%</span>
                    ) : "—"}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {item.finalScore ?? "—"}
                    </span>
                  </td>
                  <td>
                    {item.grade ? (
                      <ScoreBadge grade={item.grade} size="sm" />
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No signal</span>
                    )}
                  </td>
                  <td>
                    {item.entryStatus ? (
                      <EntryStatusBadge status={item.entryStatus} size="sm" />
                    ) : "—"}
                  </td>
                  <td>
                    {item.isTradeable ? (
                      <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓ Yes</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Discovery</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => remove(item.ticker)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "2px 4px",
                        borderRadius: 4,
                        transition: "color 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      title="Remove from watchlist"
                    >
                      <Trash2 size={13} />
                    </button>
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
