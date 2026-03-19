/**
 * GET    /api/watchlist   - list watchlist entries
 * POST   /api/watchlist   - add ticker to watchlist
 * DELETE /api/watchlist   - remove ticker from watchlist
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { watchlists, signals, stocks } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  try {
    try {
      const rows = await db
        .select({
          id: watchlists.id,
          ticker: watchlists.ticker,
          notes: watchlists.notes,
          addedAt: watchlists.addedAt,
          // Current signal
          finalScore: signals.finalScore,
          grade: signals.grade,
          entryStatus: signals.entryStatus,
          gapPct: signals.gapPct,
          isTradeable: signals.isTradeable,
          // Stock info
          name: stocks.name,
          exchange: stocks.exchange,
        })
        .from(watchlists)
        .leftJoin(stocks, eq(watchlists.ticker, stocks.ticker))
        .leftJoin(
          signals,
          and(eq(signals.ticker, watchlists.ticker), eq(signals.date, today))
        )
        .orderBy(desc(watchlists.addedAt));

      return NextResponse.json({ data: rows, mode: "real" });
    } catch (dbErr) {
      console.warn("[watchlist GET] DB Error, returning empty:", dbErr);
      return NextResponse.json({ data: [], mode: "demo" });
    }
  } catch (err) {
    console.error("[watchlist GET] Critical error:", err);
    return NextResponse.json({ data: [], error: "Critical error" }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticker = (body.ticker as string)?.toUpperCase();
    const notes = (body.notes as string) ?? null;

    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const inserted = await db
      .insert(watchlists)
      .values({ ticker, notes })
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({ data: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("[watchlist POST]", err);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ticker = searchParams.get("ticker")?.toUpperCase();

    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    await db.delete(watchlists).where(eq(watchlists.ticker, ticker));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[watchlist DELETE]", err);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
