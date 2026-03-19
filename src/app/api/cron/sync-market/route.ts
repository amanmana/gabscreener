import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { stocks, premarketSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchLiveMarketData } from "@/lib/market-data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Auth check
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      secret !== process.env.CRON_SECRET
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 1. Get watchlist tickers
    const allStocks = await db.select({ ticker: stocks.ticker }).from(stocks);
    const tickers = allStocks.map((s) => s.ticker);

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: "No stocks in database" });
    }

    // 2. Fetch live data (via Proxy)
    const { results, source } = await fetchLiveMarketData(tickers);
    const today = new Date().toISOString().split("T")[0];

    // 3. Upsert into database
    let syncedCount = 0;
    for (const data of results) {
      await db
        .insert(premarketSnapshots)
        .values({
          ticker: data.symbol,
          date: today,
          timestamp: data.dataTimestamp,
          prevClose: data.previousClose,
          premarketPrice: data.currentPrice,
          premarketHigh: data.high,
          premarketLow: data.low,
          premarketVolume: data.premarketVolume,
          gapPct: data.gapPct,
          calculationMode: data.calculationMode,
        })
        .onConflictDoUpdate({
          target: [premarketSnapshots.ticker, premarketSnapshots.date],
          set: {
            timestamp: data.dataTimestamp,
            premarketPrice: data.currentPrice,
            premarketHigh: data.high,
            premarketLow: data.low,
            premarketVolume: data.premarketVolume,
            gapPct: data.gapPct,
            calculationMode: data.calculationMode,
          },
        });
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      count: tickers.length,
      date: today,
      source,
      debug: results.length > 0 ? {
        symbol: results[0].symbol,
        prevClose: results[0].previousClose,
        currentPrice: results[0].currentPrice,
        mode: results[0].calculationMode
      } : null
    });
  } catch (error: any) {
    console.error("[cron/sync-market] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
