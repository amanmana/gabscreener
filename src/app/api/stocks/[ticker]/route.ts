/**
 * GET /api/stocks/[ticker]
 * Returns full stock detail: signal breakdown, premarket snapshot,
 * intraday metrics, and catalyst for today's date.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  stocks,
  signals,
  premarketSnapshots,
  intradayMetrics,
  catalysts,
  shariahUniverse,
  dailyPrices,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const runtime = "nodejs"; // Always use nodejs for Postgres/Drizzle

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upper = ticker.toUpperCase();
    const today = new Date().toISOString().split("T")[0];

    // 1. Stock master (Crucial)
    const [stockRow] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.ticker, upper))
      .limit(1);

    if (!stockRow) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    // 2. Shariah status (Optional)
    const [shariahRow] = await db
      .select()
      .from(shariahUniverse)
      .where(eq(shariahUniverse.ticker, upper))
      .limit(1);

    // 3. Latest signal (Optional)
    const [signal] = await db
      .select()
      .from(signals)
      .where(and(eq(signals.ticker, upper), eq(signals.date, today)))
      .limit(1);

    // 4. Premarket snapshot (Optional)
    const [premarket] = await db
      .select()
      .from(premarketSnapshots)
      .where(
        and(eq(premarketSnapshots.ticker, upper), eq(premarketSnapshots.date, today))
      )
      .limit(1);

    // 5. Intraday metrics (Optional)
    const [intraday] = await db
      .select()
      .from(intradayMetrics)
      .where(
        and(eq(intradayMetrics.ticker, upper), eq(intradayMetrics.date, today))
      )
      .limit(1);

    // 6. Today's catalyst (Optional)
    const [catalyst] = await db
      .select()
      .from(catalysts)
      .where(and(eq(catalysts.ticker, upper), eq(catalysts.date, today)))
      .limit(1);

    // 7. Recent 30 days price history (Optional, wrap in try/catch in case table missing)
    let priceHistory: any[] = [];
    try {
      priceHistory = await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.ticker, upper))
        .orderBy(desc(dailyPrices.date))
        .limit(30);
    } catch (e) {
      console.warn("Could not fetch price history:", e);
    }

    return NextResponse.json({
      stock: stockRow,
      shariahUniverse: shariahRow ?? null,
      signal: signal ?? null,
      premarket: premarket ?? null,
      intraday: intraday ?? null,
      catalyst: catalyst ?? null,
      priceHistory: priceHistory.reverse(),
    });
  } catch (err) {
    console.error("[stock detail api] critical error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stock detail" },
      { status: 500 }
    );
  }
}
