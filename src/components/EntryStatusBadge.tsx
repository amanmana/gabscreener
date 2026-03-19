/**
 * EntryStatusBadge — shows Watch / Near Trigger / Breakout Triggered / Avoid
 */

interface EntryStatusBadgeProps {
  status: "Watch" | "Near Trigger" | "Breakout Triggered" | "Avoid";
  size?: "sm" | "md";
}

const STATUS_CLASS: Record<string, string> = {
  "Watch": "status-watch",
  "Near Trigger": "status-near",
  "Breakout Triggered": "status-breakout",
  "Avoid": "status-avoid",
};

const STATUS_DOT: Record<string, string> = {
  "Watch": "#93c5fd",
  "Near Trigger": "#fbbf24",
  "Breakout Triggered": "#34d399",
  "Avoid": "#fb7185",
};

export default function EntryStatusBadge({ status, size = "md" }: EntryStatusBadgeProps) {
  const pad = size === "sm" ? "2px 7px" : "3px 10px";
  const fontSize = size === "sm" ? "10px" : "11px";

  return (
    <span
      className={STATUS_CLASS[status] ?? "status-watch"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: pad,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: STATUS_DOT[status],
          display: "inline-block",
        }}
      />
      {status}
    </span>
  );
}
