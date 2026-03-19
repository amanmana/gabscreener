/**
 * ScoreBreakdown — visual breakdown of all score components and penalties
 * Used on the stock detail page.
 */

interface ScoreBreakdownProps {
  gapScore: number;
  premarketVolScore: number;
  rvolScore: number;
  structureScore: number;
  liquidityScore: number;
  catalystScore: number;
  totalPenalty: number;
  finalScore: number;
  grade: "A" | "B" | "C" | "avoid";
}

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  color: string;
  isNegative?: boolean;
}

function BarRow({ label, value, max, color, isNegative }: BarRowProps) {
  const pct = isNegative
    ? Math.abs(value / max) * 100
    : (value / max) * 100;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 160, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1 }}>
        <div className="score-bar">
          <div
            className="score-bar-fill"
            style={{ width: `${Math.min(100, pct)}%`, background: color }}
          />
        </div>
      </div>
      <div
        style={{
          width: 48,
          textAlign: "right",
          fontSize: 13,
          fontWeight: 600,
          color: isNegative ? "var(--grade-avoid)" : color,
          fontFamily: "var(--font-mono, monospace)",
          flexShrink: 0,
        }}
      >
        {isNegative && value < 0 ? value : `+${value}`}
      </div>
      <div style={{ width: 36, textAlign: "right", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        /{max}
      </div>
    </div>
  );
}

export default function ScoreBreakdown({
  gapScore,
  premarketVolScore,
  rvolScore,
  structureScore,
  liquidityScore,
  catalystScore,
  totalPenalty,
  finalScore,
  grade,
}: ScoreBreakdownProps) {
  const GRADE_COLOR: Record<string, string> = {
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    avoid: "#f43f5e",
  };

  const gradeColor = GRADE_COLOR[grade] ?? "#8b9cc8";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          Score Breakdown
        </h3>
        {/* Big score circle */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: `3px solid ${gradeColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${gradeColor}18`,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: gradeColor }}>
              {finalScore}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
            SCORE
          </div>
        </div>
      </div>

      <div>
        <BarRow label="Gap Score" value={gapScore} max={25} color="#06b6d4" />
        <BarRow label="Premarket Volume" value={premarketVolScore} max={20} color="#f59e0b" />
        <BarRow label="Relative Volume" value={rvolScore} max={15} color="#3b82f6" />
        <BarRow label="Structure" value={structureScore} max={20} color="#10b981" />
        <BarRow label="Liquidity" value={liquidityScore} max={10} color="#8b5cf6" />
        <BarRow label="Catalyst" value={catalystScore} max={10} color="#a78bfa" />

        {totalPenalty < 0 && (
          <>
            <div className="divider" style={{ margin: "12px 0" }} />
            <BarRow
              label="Penalties"
              value={totalPenalty}
              max={58}
              color="#f43f5e"
              isNegative
            />
          </>
        )}
      </div>

      <div
        className="divider"
        style={{ margin: "14px 0 12px" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Final Score (max 100)
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: gradeColor }}>
          {finalScore}
        </span>
      </div>
    </div>
  );
}
