/**
 * GET /api/signals
 * Returns signal history across all dates.
 *
 * Query params:
 *   ticker  - filter by ticker
 *   date    - exact date filter
 *   grade   - comma-separated grades
 *   outcome - Win, Loss, Open
 *   page    - page number (default: 1)
 *   limit   - rows per page (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { signals, stocks } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const ticker = searchParams.get("ticker")?.toUpperCase();
    const dateFilter = searchParams.get("date");
    const gradeParam = searchParams.get("grade");
    const grades = gradeParam?.split(",").filter(Boolean) as ("A"|"B"|"C"|"avoid")[] | undefined;
    const outcomeFilter = searchParams.get("outcome");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (ticker) conditions.push(eq(signals.ticker, ticker));
    if (dateFilter) conditions.push(eq(signals.date, dateFilter));
    if (grades && grades.length > 0) conditions.push(inArray(signals.grade, grades));
    if (outcomeFilter) conditions.push(eq(signals.outcome, outcomeFilter as "Win" | "Loss" | "Open"));

    const rows = await db
      .select({
        id: signals.id,
        ticker: signals.ticker,
        date: signals.date,
        finalScore: signals.finalScore,
        grade: signals.grade,
        entryStatus: signals.entryStatus,
        gapPct: signals.gapPct,
        premarketVolume: signals.premarketVolume,
        rvol: signals.rvol,
        hasCatalyst: signals.hasCatalyst,
        isTradeable: signals.isTradeable,
        outcome: signals.outcome,
        outcomeNotes: signals.outcomeNotes,
        name: stocks.name,
        sector: stocks.sector,
      })
      .from(signals)
      .innerJoin(stocks, eq(signals.ticker, stocks.ticker))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(signals.date), desc(signals.finalScore))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(signals)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[signals]", err);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
