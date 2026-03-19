"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  Star,
  History,
  Settings,
  TrendingUp,
  Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screener", label: "Gap Screener", icon: ScanLine },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/signals", label: "Signal History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}
          >
            <TrendingUp size={16} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              SGS
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Shariah Gap Screener
            </div>
          </div>
        </div>
      </div>

      {/* Market Status Indicator */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Premarket
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <Moon size={12} />
          <span>Long-only · Shariah-only</span>
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          MVP — No auth required
        </div>
      </div>
    </aside>
  );
}
