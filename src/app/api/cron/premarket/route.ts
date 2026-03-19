/**
 * GET /api/cron/premarket
 * Vercel Cron Job: Fetches and updates premarket snapshots.
 * Runs at 8:30am ET = 13:30 UTC weekdays.
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

  // TODO: For production, fetch from data provider:
  // 1. GET premarket quotes for all stocks in shariah_universe
  // 2. Filter: price >= 2, gap >= 4%, premarket_vol >= 300k
  // 3. Upsert into premarket_snapshots table
  // 4. Trigger the /api/cron/score endpoint

  return NextResponse.json({
    message: "Premarket cron stub — wire up your data provider here",
    note: "See src/app/api/cron/premarket/route.ts for integration instructions",
  });
}
