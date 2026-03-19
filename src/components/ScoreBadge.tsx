/**
 * ScoreBadge — shows the signal grade (A/B/C/avoid) with color coding
 * Optionally shows the numeric score.
 */

interface ScoreBadgeProps {
  grade: "A" | "B" | "C" | "avoid";
  score?: number;
  size?: "sm" | "md" | "lg";
}

const GRADE_LABELS: Record<string, string> = {
  A: "A Setup",
  B: "B Setup",
  C: "C Setup",
  avoid: "Avoid",
};

export default function ScoreBadge({ grade, score, size = "md" }: ScoreBadgeProps) {
  const pad = size === "sm" ? "2px 7px" : size === "lg" ? "6px 14px" : "3px 10px";
  const fontSize = size === "sm" ? "10px" : size === "lg" ? "14px" : "12px";
  const fontWeight = size === "lg" ? 700 : 600;

  return (
    <span
      className={`badge-${grade}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: pad,
        borderRadius: 999,
        fontSize,
        fontWeight,
        letterSpacing: "0.02em",
      }}
    >
      <span>{grade.toUpperCase()}</span>
      {score !== undefined && (
        <span style={{ opacity: 0.75 }}>· {score}</span>
      )}
    </span>
  );
}
