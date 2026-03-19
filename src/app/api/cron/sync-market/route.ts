/**
 * GET /api/cron/sync-market
 * Syncs market data for the entire Shariah universe from Yahoo Finance.
 * Logic:
 * 1. Fetch all active stocks in our DB.
 * 2. Fetch latest quotes for each ticker (batched).
 * 3. Upsert into premarket_snapshots with normalized data.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { stocks, premarketSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marketData } from "@/lib/market-data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Protect with cron secret
  const authHeader = req.headers.get("authorization");
  const urlSecret = req.nextUrl.searchParams.get("secret");
  const isValidSecret = 
    authHeader === `Bearer ${process.env.CRON_SECRET}` || 
    urlSecret === process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "development" && !isValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  
  try {
    // 1. Get all tickers to sync
    const allStocks = await db.select({ ticker: stocks.ticker }).from(stocks).where(eq(stocks.isActive, true));
    const tickers = allStocks.map(s => s.ticker);

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, message: "No stocks to sync" });
    }

    // 2. Fetch market data from provider
    const results = await marketData.fetchQuotes(tickers);

    let synced = 0;
    
    // 3. Upsert snapshots
    for (const data of results) {
       // Even if calculationMode is unavailable (market closed), we sync if we have ANY price
       if (!data.previousClose && !data.currentPrice) continue;

       await db.insert(premarketSnapshots).values({
         ticker: data.symbol,
         date: today,
         prevClose: data.previousClose || 0,
         premarketPrice: data.premarketPrice || data.todayOpen || data.currentPrice || 0,
         todayOpen: data.todayOpen,
         premarketVolume: data.premarketVolume,
         gapPct: data.gapPct || 0,
         dataSource: data.dataSource,
         calculationMode: data.calculationMode,
         capturedAt: data.dataTimestamp
       }).onConflictDoUpdate({
         target: [premarketSnapshots.ticker, premarketSnapshots.date],
         set: {
            prevClose: data.previousClose || 0,
            premarketPrice: data.premarketPrice || data.todayOpen || data.currentPrice || 0,
            todayOpen: data.todayOpen,
            premarketVolume: data.premarketVolume,
            gapPct: data.gapPct || 0,
            dataSource: data.dataSource,
            calculationMode: data.calculationMode,
            capturedAt: data.dataTimestamp
         }
       });
       synced++;
    }

    return NextResponse.json({ success: true, synced, count: tickers.length, date: today });
    
  } catch (error) {
     console.error("[sync-market] Critical error:", error);
     return NextResponse.json({ error: "Market sync failed" }, { status: 500 });
  }
}
