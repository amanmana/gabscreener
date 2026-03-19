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

    // 3. Upsert into database (Careful with nullability vs schema .notNull())
    let syncedCount = 0;
    for (const data of results) {
      const snapshotValues = {
        ticker: data.symbol,
        date: today,
        timestamp: data.dataTimestamp,
        // Drizzle needs number, not number | null for .notNull() columns
        prevClose: data.previousClose ?? 0,
        premarketPrice: data.currentPrice ?? data.todayOpen ?? 0,
        premarketHigh: data.high,
        premarketLow: data.low,
        premarketVolume: data.premarketVolume,
        todayOpen: data.todayOpen,
        gapPct: data.gapPct ?? 0,
        dataSource: data.dataSource,
        calculationMode: data.calculationMode,
        capturedAt: new Date(),
      };

      await db
        .insert(premarketSnapshots)
        .values(snapshotValues)
        .onConflictDoUpdate({
          target: [premarketSnapshots.ticker, premarketSnapshots.date],
          set: {
            timestamp: snapshotValues.timestamp,
            premarketPrice: snapshotValues.premarketPrice,
            premarketHigh: snapshotValues.premarketHigh,
            premarketLow: snapshotValues.premarketLow,
            premarketVolume: snapshotValues.premarketVolume,
            todayOpen: snapshotValues.todayOpen,
            gapPct: snapshotValues.gapPct,
            calculationMode: snapshotValues.calculationMode,
            capturedAt: snapshotValues.capturedAt,
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
