/**
 * GET /api/cron/sync-eod
 * Vercel Cron Job: Syncs end-of-day price data.
 * Runs at 5pm ET = 22:00 UTC weekdays.
 *
 * TODO: Integrate a real data provider (Polygon.io, FMP, Alpaca)
 * by replacing the simulated placeholder below.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: For production:
  // 1. Fetch EOD OHLCV for all stocks in stocks table
  // 2. Upsert into daily_prices table
  // 3. Update market_cap, shares_outstanding in stocks table

  return NextResponse.json({
    message: "EOD sync cron stub — wire up your data provider here",
    note: "See src/app/api/cron/sync-eod/route.ts for integration instructions",
  });
}
