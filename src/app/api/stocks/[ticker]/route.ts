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

export const runtime = "nodejs"; // Must be nodejs — edge runtime does not support Postgres

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upper = ticker.toUpperCase();
    const today = new Date().toISOString().split("T")[0];

    // Stock master
    const [stockRow] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.ticker, upper))
      .limit(1);
    if (!stockRow) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    // Shariah status
    const [shariahRow] = await db
      .select()
      .from(shariahUniverse)
      .where(eq(shariahUniverse.ticker, upper))
      .limit(1);

    // Latest signal
    const signal = await db
      .select()
      .from(signals)
      .where(and(eq(signals.ticker, upper), eq(signals.date, today)))
      .limit(1)
      .then((r) => r[0] ?? null);

    // Premarket snapshot
    const premarket = await db
      .select()
      .from(premarketSnapshots)
      .where(
        and(eq(premarketSnapshots.ticker, upper), eq(premarketSnapshots.date, today))
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    // Intraday metrics
    const intraday = await db
      .select()
      .from(intradayMetrics)
      .where(
        and(eq(intradayMetrics.ticker, upper), eq(intradayMetrics.date, today))
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    // Today's catalyst
    const catalyst = await db
      .select()
      .from(catalysts)
      .where(and(eq(catalysts.ticker, upper), eq(catalysts.date, today)))
      .limit(1)
      .then((r) => r[0] ?? null);

    // Recent 30 days price history
    const priceHistory = await db
      .select()
      .from(dailyPrices)
      .where(eq(dailyPrices.ticker, upper))
      .orderBy(desc(dailyPrices.date))
      .limit(30);

    return NextResponse.json({
      stock: stockRow,
      shariahUniverse: shariahRow,
      signal,
      premarket,
      intraday,
      catalyst,
      priceHistory: priceHistory.reverse(),
    });
  } catch (err) {
    console.error("[stock detail] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stock detail" },
      { status: 500 }
    );
  }
}
