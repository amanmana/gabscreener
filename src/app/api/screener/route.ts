/**
 * GET /api/screener
 * Returns gap-up signals filtered and sorted by score.
 *
 * Query params:
 *   grade    - comma-separated: A,B,C,avoid (default: A,B)
 *   minGap   - min gap % (default: 4)
 *   minVol   - min premarket volume (default: 300000)
 *   catalyst - "true" to require catalyst
 *   date     - YYYY-MM-DD (default: today)
 *   page     - page number (default: 1)
 *   limit    - rows per page (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { signals, stocks, catalysts, shariahUniverse } from "@/db/schema";
import { eq, and, gte, inArray, desc, sql } from "drizzle-orm";

export const runtime = "edge";

const DEMO_SIGNALS = [
  { ticker: "NVDA", name: "NVIDIA Corporation", finalScore: 96, grade: "A", entryStatus: "Breakout Triggered", gapPct: 12.4, premarketVolume: 1850000, rvol: 4.2, premarketPrice: 155.0, hasCatalyst: true, catalystType: "earnings", isTradeable: true, exchange: "NASDAQ", sector: "Technology" },
  { ticker: "CRWD", name: "CrowdStrike Holdings", finalScore: 89, grade: "A", entryStatus: "Near Trigger", gapPct: 8.7, premarketVolume: 1200000, rvol: 3.8, premarketPrice: 413.0, hasCatalyst: true, catalystType: "earnings", isTradeable: true, exchange: "NASDAQ", sector: "Technology" },
  { ticker: "AAPL", name: "Apple Inc.", finalScore: 72, grade: "B", entryStatus: "Watch", gapPct: 4.2, premarketVolume: 1450000, rvol: 2.8, premarketPrice: 232.0, hasCatalyst: true, catalystType: "analyst", isTradeable: false, exchange: "NASDAQ", sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft Corporation", finalScore: 68, grade: "C", entryStatus: "Watch", gapPct: 5.1, premarketVolume: 880000, rvol: 2.5, premarketPrice: 432.0, hasCatalyst: false, catalystType: null, isTradeable: true, exchange: "NASDAQ", sector: "Technology" },
  { ticker: "TSLA", name: "Tesla Inc.", finalScore: 62, grade: "C", entryStatus: "Avoid", gapPct: 32.0, premarketVolume: 4500000, rvol: 6.2, premarketPrice: 320.0, hasCatalyst: true, catalystType: "earnings", isTradeable: false, exchange: "NASDAQ", sector: "Consumer Discretionary" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const gradeParam = searchParams.get("grade") ?? "A,B";
    const grades = gradeParam.split(",").filter(Boolean) as ("A"|"B"|"C"|"avoid")[];
    const minGap = parseFloat(searchParams.get("minGap") ?? "3");
    const minVol = parseInt(searchParams.get("minVol") ?? "300000");
    const requireCatalyst = searchParams.get("catalyst") === "true";
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

    const offset = (page - 1) * limit;

    const conditions = [
      eq(signals.date, date),
      gte(signals.gapPct, minGap),
      gte(signals.premarketVolume, minVol),
    ];
    if (grades.length > 0) conditions.push(inArray(signals.grade, grades));
    if (requireCatalyst) conditions.push(eq(signals.hasCatalyst, true));

    try {
      const rows = await db
        .select({
          signalId: signals.id,
          ticker: signals.ticker,
          date: signals.date,
          finalScore: signals.finalScore,
          grade: signals.grade,
          entryStatus: signals.entryStatus,
          gapPct: signals.gapPct,
          premarketVolume: signals.premarketVolume,
          rvol: signals.rvol,
          premarketPrice: signals.premarketPrice,
          hasCatalyst: signals.hasCatalyst,
          catalystType: signals.catalystType,
          isTradeable: signals.isTradeable,
          name: stocks.name,
          exchange: stocks.exchange,
          sector: stocks.sector,
          marketCap: stocks.marketCap,
        })
        .from(signals)
        .innerJoin(stocks, eq(signals.ticker, stocks.ticker))
        .where(and(...conditions))
        .orderBy(desc(signals.finalScore))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(signals)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count ?? 0);

      // Falls back to demo if empty
      if (total === 0) throw new Error("No data");

      return NextResponse.json({
        data: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        meta: { date, filters: { grades, minGap, minVol, requireCatalyst }, mode: "real" },
      });
    } catch (dbErr) {
      console.warn("[screener] Falling back to demo data:", dbErr);
      return NextResponse.json({
        data: DEMO_SIGNALS.filter(s => grades.includes(s.grade as any)),
        pagination: { page: 1, limit: 50, total: DEMO_SIGNALS.length, totalPages: 1 },
        meta: { date, filters: { grades, minGap, minVol, requireCatalyst }, mode: "demo" },
      });
    }
  } catch (err) {
    console.error("[screener] critical error:", err);
    return NextResponse.json({ error: "Critical error" }, { status: 500 });
  }
}

