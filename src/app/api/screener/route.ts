/**
 * GET /api/screener
 * Returns verified gap-up signals from Yahoo Finance data.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { signals, stocks } from "@/db/schema";
import { eq, and, gte, inArray, desc, sql } from "drizzle-orm";

export const runtime = "nodejs";

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
      sql`coalesce(${signals.gapPct}, 0) >= ${minGap}`,
      sql`coalesce(${signals.premarketVolume}, 0) >= ${minVol}`,
    ];
    if (grades.length > 0) conditions.push(inArray(signals.grade, grades));
    if (requireCatalyst) conditions.push(eq(signals.hasCatalyst, true));

    const rows = await db
      .select({
        signalId: signals.id,
        ticker: signals.ticker,
        date: signals.date,
        finalScore: signals.finalScore,
        grade: signals.grade,
        entryStatus: signals.entryStatus,
        gapPct: signals.gapPct,
        premarketVol: signals.premarketVolume,
        rvol: signals.rvol,
        premarketPrice: signals.premarketPrice,
        hasCatalyst: signals.hasCatalyst,
        catalystType: signals.catalystType,
        isTradeable: signals.isTradeable,
        dataSource: signals.dataSource,
        calculationMode: signals.calculationMode,
        lastUpdated: signals.lastUpdated,
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

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      meta: { date, filters: { grades, minGap, minVol, requireCatalyst }, mode: "real" },
    });
  } catch (err) {
    console.error("[screener] critical error:", err);
    return NextResponse.json({ error: "Critical error" }, { status: 500 });
  }
}
