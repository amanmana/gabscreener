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
import { computeFullScore, getEntryStatus, overrideGradeByDataQuality } from "@/lib/scoring";

export const runtime = "nodejs"; // cron jobs use nodejs runtime

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  const urlSecret = req.nextUrl.searchParams.get("secret");
  const isValidSecret = 
    authHeader === `Bearer ${process.env.CRON_SECRET}` || 
    urlSecret === process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "development" && !isValidSecret) {
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
      // Get intraday metrics (or use defaults if market hasn't opened yet)
      const intra = await db.query.intradayMetrics.findFirst({
        where: and(eq(intradayMetrics.ticker, snap.ticker), eq(intradayMetrics.date, today))
      });

      // If no intraday data, use safe defaults for scoring (gap-only analysis)
      const metrics = intra || {
        rvol: 1.0,
        spreadPct: 0.1,
        dollarVolume: 50_000_000,
        holdsAboveVwap: true,
        nearPremarketHigh: true,
        tightConsolidation: true,
        weakRejection: false,
        extendedFromBase: false,
        choppyStructure: false,
        poorLiquidityAfterOpen: false,
      };

      const catalyst = await db.query.catalysts.findFirst({
        where: and(eq(catalysts.ticker, snap.ticker), eq(catalysts.date, today))
      });
      const hasCatalyst = !!catalyst;

      const penalties = {
        spreadTooWide: (metrics.spreadPct ?? 0) > 0.3,
        weakRejectionAfterOpen: metrics.weakRejection ?? false,
        belowPremarketVwap: !(metrics.holdsAboveVwap ?? true) && (snap.premarketPrice ?? 0) < (snap.premarketVwap ?? 0),
        extendedFromBase: metrics.extendedFromBase ?? false,
        choppyStructure: metrics.choppyStructure ?? false,
        poorLiquidityAfterOpen: metrics.poorLiquidityAfterOpen ?? false,
      };

      const score = computeFullScore({
        gapPct: snap.gapPct || 0,
        premarketVol: snap.premarketVolume || 0,
        rvol: metrics.rvol || 1.0,
        structure: {
          holdsAboveVwap: metrics.holdsAboveVwap ?? true,
          nearPremarketHigh: metrics.nearPremarketHigh ?? true,
          tightConsolidation: metrics.tightConsolidation ?? true,
        },
        liquidity: {
          tightSpread: (metrics.spreadPct ?? 0) < 0.2,
          strongDollarVolume: (metrics.dollarVolume ?? 0) > 80_000_000,
        },
        hasCatalyst,
        penalties,
      });

      const finalGrade = overrideGradeByDataQuality(score.grade, snap.calculationMode);
      
      const entryStatus = getEntryStatus(finalGrade, {
        penalties,
        structure: {
          holdsAboveVwap: metrics.holdsAboveVwap ?? true,
          nearPremarketHigh: metrics.nearPremarketHigh ?? true,
          tightConsolidation: metrics.tightConsolidation ?? true,
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
          grade: finalGrade,
          entryStatus,
          gapPct: snap.gapPct,
          premarketVolume: snap.premarketVolume,
          rvol: metrics.rvol ?? 1.0,
          premarketPrice: snap.premarketPrice,
          hasCatalyst,
          catalystType: hasCatalyst ? catalyst?.type : null,
          isTradeable: finalGrade !== "avoid" && score.isTradeable,
          dataSource: snap.dataSource,
          calculationMode: snap.calculationMode,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [signals.ticker, signals.date],
          set: {
            finalScore: score.finalScore,
            grade: finalGrade,
            entryStatus,
            isTradeable: finalGrade !== "avoid" && score.isTradeable,
            dataSource: snap.dataSource,
            calculationMode: snap.calculationMode,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          },
        });


      processed++;
    }

    return NextResponse.json({ success: true, processed, totalSnapshots: snapshots.length, date: today });
  } catch (err) {
    console.error("[cron/score]", err);
    return NextResponse.json({ error: "Scoring cron failed" }, { status: 500 });
  }
}
