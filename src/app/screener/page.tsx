"use client";

/**
 * Screener Page — /screener
 * Client-rendered for real-time filter interaction.
 * Fetches /api/screener and re-queries on filter change.
 */

import { useState, useEffect, useCallback } from "react";
import { ScanLine, RefreshCw } from "lucide-react";
import FilterPanel, { FilterState, DEFAULT_FILTERS } from "@/components/FilterPanel";
import ScreenerTable, { ScreenerRow } from "@/components/ScreenerTable";

async function fetchScreener(filters: FilterState): Promise<ScreenerRow[]> {
  const params = new URLSearchParams({
    grade: filters.grades.join(","),
    minGap: filters.minGap.toString(),
    minVol: filters.minVol.toString(),
    catalyst: filters.requireCatalyst ? "true" : "false",
    limit: "100",
  });
  const res = await fetch(`/api/screener?${params}`);
  if (!res.ok) throw new Error("Screener fetch failed");
  const data = await res.json();
  return data.data ?? [];
}

async function fetchWatchlist(): Promise<string[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((r: { ticker: string }) => r.ticker);
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<ScreenerRow[]>([]);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const [rows, wl] = await Promise.all([fetchScreener(f), fetchWatchlist()]);
      setData(rows);
      setWatchlist(new Set(wl));
      setLastUpdated(new Date());
    } catch (e) {
      setError("Failed to load screener data. Make sure the database is seeded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const handleWatchlistToggle = useCallback(
    async (ticker: string) => {
      const inList = watchlist.has(ticker);
      try {
        if (inList) {
          await fetch(`/api/watchlist?ticker=${ticker}`, { method: "DELETE" });
          setWatchlist((prev) => {
            const next = new Set(prev);
            next.delete(ticker);
            return next;
          });
        } else {
          await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker }),
          });
          setWatchlist((prev) => new Set([...prev, ticker]));
        }
      } catch {
        // Silent fail — UI already toggled optimistically
      }
    },
    [watchlist]
  );

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="animate-in">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 20 }}
      >
        <div className="flex items-center gap-3">
          <ScanLine size={20} style={{ color: "var(--accent-blue)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
              Gap Screener
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {today} · Long-only · Shariah-compliant · A/B setups default
            </p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          {lastUpdated && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => load(filters)}
            className="btn-ghost"
            style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <FilterPanel value={filters} onChange={setFilters} />

      {/* Result count */}
      <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-muted)" }}>
        {loading ? (
          <span>Loading...</span>
        ) : (
          <span>
            Showing <strong style={{ color: "var(--text-secondary)" }}>{data.length}</strong> signals
            {filters.grades.length < 4 &&
              ` · Grade: ${filters.grades.join(", ")}`}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            background: "rgba(244,63,94,0.1)",
            border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: 8,
            fontSize: 13,
            color: "#fb7185",
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 38, marginBottom: 6, borderRadius: 6 }}
              />
            ))}
          </div>
        ) : (
          <ScreenerTable
            data={data}
            watchlistTickers={watchlist}
            onWatchlistToggle={handleWatchlistToggle}
          />
        )}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
        ★ Click star to save to watchlist · Click ticker for full detail + risk calculator ·
        C/Avoid setups hidden by default — toggle to reveal
      </div>
    </div>
  );
}
