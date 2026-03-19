"use client";

import { useState, useCallback } from "react";
import { Filter, Zap, RotateCcw } from "lucide-react";

export interface FilterState {
  grades: ("A" | "B" | "C" | "avoid")[];
  minGap: number;
  minVol: number;
  requireCatalyst: boolean;
  showLower: boolean; // show C + avoid
}

const DEFAULT_FILTERS: FilterState = {
  grades: ["A", "B"],
  minGap: 4,
  minVol: 300000,
  requireCatalyst: false,
  showLower: false,
};

interface FilterPanelProps {
  value: FilterState;
  onChange: (f: FilterState) => void;
}

export default function FilterPanel({ value, onChange }: FilterPanelProps) {
  const GRADE_OPTIONS: Array<{ g: "A" | "B" | "C" | "avoid"; label: string; cls: string }> = [
    { g: "A", label: "A", cls: "badge-A" },
    { g: "B", label: "B", cls: "badge-B" },
    { g: "C", label: "C", cls: "badge-C" },
    { g: "avoid", label: "Avoid", cls: "badge-avoid" },
  ];

  const toggleGrade = useCallback(
    (g: "A" | "B" | "C" | "avoid") => {
      const has = value.grades.includes(g);
      const next = has
        ? value.grades.filter((x) => x !== g)
        : [...value.grades, g];
      onChange({ ...value, grades: next });
    },
    [value, onChange]
  );

  const handleReset = () => onChange(DEFAULT_FILTERS);

  return (
    <div
      className="surface"
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--text-muted)", fontSize: 12 }}>
        <Filter size={13} />
        <span>Filters</span>
      </div>

      {/* Grade toggles */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Grade:</span>
        {GRADE_OPTIONS.map(({ g, label, cls }) => (
          <button
            key={g}
            onClick={() => toggleGrade(g)}
            className={cls}
            style={{
              padding: "2px 9px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              opacity: value.grades.includes(g) ? 1 : 0.3,
              transition: "opacity 0.15s",
              background: value.grades.includes(g) ? undefined : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Min gap */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Min Gap:</span>
        <input
          type="number"
          className="input-dark"
          value={value.minGap}
          onChange={(e) => onChange({ ...value, minGap: parseFloat(e.target.value) || 4 })}
          style={{ width: 64, padding: "4px 8px" }}
          step="0.5"
          min="4"
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>%</span>
      </div>

      {/* Min premarket vol */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Min PM Vol:</span>
        <select
          className="input-dark"
          value={value.minVol}
          onChange={(e) =>
            onChange({ ...value, minVol: parseInt(e.target.value) })
          }
          style={{ width: 100, padding: "4px 8px" }}
        >
          <option value={300000}>300K</option>
          <option value={500000}>500K</option>
          <option value={1000000}>1M</option>
        </select>
      </div>

      {/* Catalyst toggle */}
      <label
        className="flex items-center gap-2"
        style={{ cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", userSelect: "none" }}
      >
        <input
          type="checkbox"
          checked={value.requireCatalyst}
          onChange={(e) => onChange({ ...value, requireCatalyst: e.target.checked })}
          style={{ accentColor: "var(--accent-blue)" }}
        />
        <Zap size={12} />
        <span>Catalyst only</span>
      </label>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Reset */}
      <button
        onClick={handleReset}
        className="btn-ghost"
        style={{ fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
      >
        <RotateCcw size={11} />
        Reset
      </button>
    </div>
  );
}

export { DEFAULT_FILTERS };
