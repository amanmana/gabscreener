/**
 * GET /api/cron/score
 * Vercel Cron Job: Re-runs the scoring engine over the latest premarket
 * snapshots and intraday metrics, then upserts the signals table.
 *
 * Cron schedule: "0 14 * * 1-5"  (9am ET = 14:00 UTC, weekdays)
 * Configure in vercel.json under "crons".
 *
 * Protected by CRON_SECRET env variable.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  premarketSnapshots,
  intradayMetrics,
  catalysts,
  signals,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeFullScore, getEntryStatus } from "@/lib/scoring";

export const runtime = "nodejs"; // cron jobs use nodejs runtime

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  let processed = 0;

  try {
    // Fetch all premarket snapshots for today that qualify
    const snapshots = await db
      .select()
      .from(premarketSnapshots)
      .where(eq(premarketSnapshots.date, today));

    for (const snap of snapshots) {
      // Get intraday metrics
      const intra = await db
        .select()
        .from(intradayMetrics)
        .where(
          and(
            eq(intradayMetrics.ticker, snap.ticker),
            eq(intradayMetrics.date, today)
          )
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!intra) continue;

      // Check catalyst
      const catalyst = await db
        .select()
        .from(catalysts)
        .where(
          and(eq(catalysts.ticker, snap.ticker), eq(catalysts.date, today))
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      const hasCatalyst = !!catalyst;

      const penalties = {
        spreadTooWide: (intra.spreadPct ?? 0) > 0.3,
        weakRejectionAfterOpen: intra.weakRejection ?? false,
        belowPremarketVwap:
          !(intra.holdsAboveVwap ?? false) &&
          (intra.currentPrice ?? snap.premarketPrice) < (snap.premarketVwap ?? snap.premarketPrice),
        extendedFromBase: intra.extendedFromBase ?? false,
        choppyStructure: intra.choppyStructure ?? false,
        poorLiquidityAfterOpen: intra.poorLiquidityAfterOpen ?? false,
      };

      const score = computeFullScore({
        gapPct: snap.gapPct,
        premarketVol: snap.premarketVolume ?? 0,
        rvol: intra.rvol ?? 1,
        structure: {
          holdsAboveVwap: intra.holdsAboveVwap ?? false,
          nearPremarketHigh: intra.nearPremarketHigh ?? false,
          tightConsolidation: intra.tightConsolidation ?? false,
        },
        liquidity: {
          tightSpread: (intra.spreadPct ?? 99) < 0.2, // Conservative
          strongDollarVolume: (intra.dollarVolume ?? 0) > 80_000_000, // Higher conviction
        },
        hasCatalyst,
        penalties,
      });

      const entryStatus = getEntryStatus(score.grade, {
        penalties,
        structure: {
          holdsAboveVwap: intra.holdsAboveVwap ?? false,
          nearPremarketHigh: intra.nearPremarketHigh ?? false,
          tightConsolidation: intra.tightConsolidation ?? false,
        },
        finalScore: score.finalScore,
      });

      await db
        .insert(signals)
        .values({
          ticker: snap.ticker,
          date: today,
          gapScore: score.gapScore,
          premarketVolScore: score.premarketVolScore,
          rvolScore: score.rvolScore,
          structureScore: score.structureScore,
          liquidityScore: score.liquidityScore,
          catalystScore: score.catalystScore,
          totalPenalty: score.totalPenalty,
          finalScore: score.finalScore,
          grade: score.grade,
          entryStatus,
          gapPct: snap.gapPct,
          premarketVolume: snap.premarketVolume,
          rvol: intra.rvol,
          premarketPrice: snap.premarketPrice,
          hasCatalyst,
          catalystType: hasCatalyst ? catalyst?.type : null,
          isTradeable: score.isTradeable,
          dataSource: snap.dataSource,
          calculationMode: snap.calculationMode,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [signals.ticker, signals.date],
          set: {
            finalScore: score.finalScore,
            grade: score.grade,
            entryStatus,
            isTradeable: score.isTradeable,
            dataSource: snap.dataSource,
            calculationMode: snap.calculationMode,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          },
        });


      processed++;
    }

    return NextResponse.json({ success: true, processed, date: today });
  } catch (err) {
    console.error("[cron/score]", err);
    return NextResponse.json({ error: "Scoring cron failed" }, { status: 500 });
  }
}
