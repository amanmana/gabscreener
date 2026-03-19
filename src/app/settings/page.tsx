"use client";

/**
 * Settings Page — /settings
 */

import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle } from "lucide-react";

interface SettingsData {
  accountSize: number;
  maxRiskPct: number;
  shariahSource: string;
  minGapPct: number;
  minPremarketVol: number;
  showGradeC: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    accountSize: 25000,
    maxRiskPct: 1,
    shariahSource: "manual",
    minGapPct: 4,
    minPremarketVol: 300000,
    showGradeC: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof SettingsData, v: number | boolean | string) =>
    setSettings((prev) => ({ ...prev, [k]: v }));

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 52, marginBottom: 12, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ maxWidth: 640 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 28 }}>
        <Settings size={20} style={{ color: "var(--text-muted)" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
            Settings
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Configure screener defaults and risk parameters
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Account Settings */}
        <Section title="Account & Risk">
          <FieldRow label="Account Size (USD)" hint="Your trading capital">
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>$</span>
              <input
                type="number"
                className="input-dark"
                value={settings.accountSize}
                onChange={(e) => set("accountSize", parseFloat(e.target.value) || 0)}
                style={{ paddingLeft: 22 }}
                min="1000"
              />
            </div>
          </FieldRow>

          <FieldRow label="Max Risk Per Trade (%)" hint="1–2% recommended for gap trading">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={settings.maxRiskPct}
                onChange={(e) => set("maxRiskPct", parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent-blue)" }}
              />
              <span
                style={{
                  minWidth: 44,
                  textAlign: "right",
                  fontWeight: 700,
                  color:
                    settings.maxRiskPct > 2 ? "#f43f5e" : settings.maxRiskPct > 1.5 ? "#f59e0b" : "#10b981",
                  fontFamily: "monospace",
                }}
              >
                {settings.maxRiskPct}%
              </span>
            </div>
          </FieldRow>
        </Section>

        {/* Screener Defaults */}
        <Section title="Screener Defaults">
          <FieldRow label="Min Gap %" hint="Minimum gap-up to include (must be ≥ 4%)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                className="input-dark"
                value={settings.minGapPct}
                onChange={(e) => set("minGapPct", parseFloat(e.target.value) || 4)}
                min="4"
                step="0.5"
              />
              <span style={{ color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }}>%</span>
            </div>
          </FieldRow>

          <FieldRow label="Min Premarket Volume" hint="Minimum 300K required">
            <select
              className="input-dark"
              value={settings.minPremarketVol}
              onChange={(e) => set("minPremarketVol", parseInt(e.target.value))}
            >
              <option value={300000}>300,000 (minimum)</option>
              <option value={500000}>500,000</option>
              <option value={1000000}>1,000,000 (1M)</option>
            </select>
          </FieldRow>

          <FieldRow label="Show Grade C Setups" hint="Reveal marginal setups (score 50–64) in screener">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div
                onClick={() => set("showGradeC", !settings.showGradeC)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 999,
                  background: settings.showGradeC ? "var(--accent-blue)" : "var(--bg-elevated)",
                  border: `1px solid ${settings.showGradeC ? "var(--accent-blue)" : "var(--border)"}`,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: 2,
                    left: settings.showGradeC ? 20 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {settings.showGradeC ? "On" : "Off (default)"}
              </span>
            </label>
          </FieldRow>
        </Section>

        {/* Shariah Source */}
        <Section title="Shariah Compliance">
          <FieldRow label="Shariah Screening Source" hint="Which methodology to trust for compliance">
            <select
              className="input-dark"
              value={settings.shariahSource}
              onChange={(e) => set("shariahSource", e.target.value)}
            >
              <option value="manual">Manual / Custom</option>
              <option value="AAOIFI">AAOIFI Standard</option>
              <option value="MSCI">MSCI Islamic</option>
            </select>
          </FieldRow>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              padding: "10px 14px",
              background: "rgba(99,120,180,0.08)",
              borderRadius: 8,
              marginTop: 4,
            }}
          >
            ⚠️ This MVP uses manually curated Shariah data. Always verify compliance with a qualified Shariah advisor before trading.
          </div>
        </Section>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 24px",
            fontSize: 14,
            background: saved ? "#10b981" : undefined,
            transition: "background 0.3s",
          }}
        >
          {saved ? (
            <>
              <CheckCircle size={15} />
              Settings Saved
            </>
          ) : (
            <>
              <Save size={15} />
              {saving ? "Saving..." : "Save Settings"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{hint}</div>
      )}
      {children}
    </div>
  );
}
