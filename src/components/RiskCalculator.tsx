"use client";

import { useState, useEffect } from "react";
import { Calculator, AlertTriangle } from "lucide-react";

/**
 * RiskCalculator — position sizing calculator for gap trades
 * Inputs: account size, risk %, entry, stop, target
 * Outputs: risk amount, position size, R:R ratio
 */

interface RiskInputs {
  accountSize: number;
  riskPct: number;
  entry: number;
  stop: number;
  target: number;
}

export default function RiskCalculator({
  defaultEntry = 0,
  defaultStop = 0,
  defaultTarget = 0,
}: {
  defaultEntry?: number;
  defaultStop?: number;
  defaultTarget?: number;
}) {
  const [inputs, setInputs] = useState<RiskInputs>({
    accountSize: 25000,
    riskPct: 1,
    entry: defaultEntry,
    stop: defaultStop,
    target: defaultTarget,
  });

  // Use effect to sync props to state incase client components are cached
  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      entry: defaultEntry,
      stop: defaultStop,
      target: defaultTarget,
    }));
  }, [defaultEntry, defaultStop, defaultTarget]);

  const set = (k: keyof RiskInputs, v: string) =>
    setInputs((prev) => ({ ...prev, [k]: parseFloat(v) || 0 }));

  // Calculations
  const riskAmount = inputs.accountSize * (inputs.riskPct / 100);
  const riskPerShare = inputs.entry - inputs.stop;
  const targetDiff = inputs.target - inputs.entry;
  const positionSize =
    riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const estimatedLoss = positionSize * riskPerShare;
  const estimatedGain = positionSize * targetDiff;
  const rr = riskPerShare > 0 && targetDiff > 0 ? targetDiff / riskPerShare : 0;

  const rrColor =
    rr >= 2 ? "#10b981" : rr >= 1 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={15} style={{ color: "var(--accent-blue)" }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          Risk Calculator
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <InputField
          label="Account Size ($)"
          value={inputs.accountSize}
          onChange={(v) => set("accountSize", v)}
          prefix="$"
        />
        <InputField
          label="Max Risk (%)"
          value={inputs.riskPct}
          onChange={(v) => set("riskPct", v)}
          suffix="%"
        />
        <InputField
          label="Entry Price"
          value={inputs.entry}
          onChange={(v) => set("entry", v)}
          prefix="$"
        />
        <InputField
          label="Stop Loss"
          value={inputs.stop}
          onChange={(v) => set("stop", v)}
          prefix="$"
        />
        <InputField
          label="Target Price"
          value={inputs.target}
          onChange={(v) => set("target", v)}
          prefix="$"
        />
      </div>

      {/* Results */}
      {inputs.entry > 0 && inputs.stop > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="divider" style={{ marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ResultRow label="Risk Amount" value={`$${riskAmount.toFixed(2)}`} color="var(--text-primary)" />
            <ResultRow label="Position Size" value={`${positionSize} shares`} color="#60a5fa" />
            <ResultRow
              label="Max Loss"
              value={`$${estimatedLoss.toFixed(2)}`}
              color="#f43f5e"
            />
            {estimatedGain > 0 && (
              <ResultRow
                label="Est. Gain"
                value={`$${estimatedGain.toFixed(2)}`}
                color="#10b981"
              />
            )}
          </div>

          {/* R:R ratio */}
          {rr > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 8,
                background: `${rrColor}15`,
                border: `1px solid ${rrColor}30`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Reward : Risk
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: rrColor }}>
                {rr.toFixed(2)} : 1
              </span>
            </div>
          )}

          {/* Warning if R:R < 1.5 */}
          {rr > 0 && rr < 1.5 && (
            <div
              className="flex items-center gap-2"
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#f59e0b",
                padding: "6px 10px",
                background: "rgba(245,158,11,0.1)",
                borderRadius: 6,
              }}
            >
              <AlertTriangle size={12} />
              R:R below 1.5 — consider skipping this trade
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          className="input-dark"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: prefix ? 20 : 10, paddingRight: suffix ? 24 : 10 }}
          step="0.01"
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        background: "var(--bg-elevated)",
        borderRadius: 8,
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
