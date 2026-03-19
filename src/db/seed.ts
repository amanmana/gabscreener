/**
 * Seed script for Shariah Gap Screener (v2 Conservative)
 * Run with: npm run db:seed
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { computeFullScore, getEntryStatus } from "../lib/scoring";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const TODAY = new Date().toISOString().split("T")[0];

// --- Mock Data ---

const STOCKS = [
  { ticker: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Technology", marketCap: 30000000000, shariahStatus: "compliant" as const },
  { ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 35000000000, shariahStatus: "compliant" as const },
  { ticker: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology", marketCap: 32000000000, shariahStatus: "compliant" as const },
  { ticker: "TSM", name: "Taiwan Semiconductor Mfg", exchange: "NYSE", sector: "Technology", marketCap: 9000000000, shariahStatus: "compliant" as const },
  { ticker: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 8000000000, shariahStatus: "compliant" as const },
  { ticker: "ASML", name: "ASML Holding NV", exchange: "NASDAQ", sector: "Technology", marketCap: 4000000000, shariahStatus: "compliant" as const },
  { ticker: "ORCL", name: "Oracle Corporation", exchange: "NYSE", sector: "Technology", marketCap: 4500000000, shariahStatus: "compliant" as const },
  { ticker: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", sector: "Technology", marketCap: 2600000000, shariahStatus: "compliant" as const },
  { ticker: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", sector: "Consumer Discretionary", marketCap: 8000000000, shariahStatus: "compliant" as const },
];

const PREMARKET = [
  { ticker: "NVDA", prevClose: 140.0, premarketPrice: 156.8, premarketVolume: 1250000, premarketVwap: 154.5, gapPct: 12.0 },
  { ticker: "AAPL", prevClose: 225.0, premarketPrice: 236.25, premarketVolume: 450000, premarketVwap: 234.0, gapPct: 5.0 },
  { ticker: "MSFT", prevClose: 410.0, premarketPrice: 426.4, premarketVolume: 320000, premarketVwap: 424.0, gapPct: 4.0 },
  { ticker: "TSM", prevClose: 175.0, premarketPrice: 189.0, premarketVolume: 850000, premarketVwap: 186.5, gapPct: 8.0 },
  { ticker: "AVGO", prevClose: 160.0, premarketPrice: 172.8, premarketVolume: 550000, premarketVwap: 171.0, gapPct: 8.0 },
  { ticker: "ASML", prevClose: 880.0, premarketPrice: 915.2, premarketVolume: 120000, premarketVwap: 910.0, gapPct: 4.0 },
  { ticker: "ORCL", prevClose: 155.0, premarketPrice: 176.7, premarketVolume: 1850000, premarketVwap: 174.0, gapPct: 14.0 },
  { ticker: "AMD", prevClose: 150.0, premarketPrice: 153.0, premarketVolume: 1500000, premarketVwap: 151.5, gapPct: 2.0 }, 
  { ticker: "TSLA", prevClose: 240.0, premarketPrice: 324.0, premarketVolume: 4500000, premarketVwap: 310.0, gapPct: 35.0 },
];

const INTRADAY: Record<string, any> = {
  NVDA: { rvol: 4.5, spreadPct: 0.1, dollarVolume: 250000000, holdsAboveVwap: true, nearPremarketHigh: true, tightConsolidation: true, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  AAPL: { rvol: 2.8, spreadPct: 0.1, dollarVolume: 180000000, holdsAboveVwap: true, nearPremarketHigh: false, tightConsolidation: false, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  MSFT: { rvol: 1.8, spreadPct: 0.1, dollarVolume: 120000000, holdsAboveVwap: true, nearPremarketHigh: false, tightConsolidation: false, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  TSM: { rvol: 3.2, spreadPct: 0.15, dollarVolume: 150000000, holdsAboveVwap: true, nearPremarketHigh: true, tightConsolidation: true, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  AVGO: { rvol: 2.1, spreadPct: 0.2, dollarVolume: 90000000, holdsAboveVwap: false, nearPremarketHigh: false, tightConsolidation: false, weakRejection: false, extendedFromBase: false, choppyStructure: true, poorLiquidityAfterOpen: false },
  ASML: { rvol: 1.2, spreadPct: 0.35, dollarVolume: 40000000, holdsAboveVwap: false, nearPremarketHigh: false, tightConsolidation: false, weakRejection: true, extendedFromBase: true, choppyStructure: true, poorLiquidityAfterOpen: true },
  ORCL: { rvol: 5.5, spreadPct: 0.05, dollarVolume: 350000000, holdsAboveVwap: true, nearPremarketHigh: true, tightConsolidation: true, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  AMD: { rvol: 1.5, spreadPct: 0.1, dollarVolume: 80000000, holdsAboveVwap: true, nearPremarketHigh: false, tightConsolidation: false, weakRejection: false, extendedFromBase: false, choppyStructure: false, poorLiquidityAfterOpen: false },
  TSLA: { rvol: 6.2, spreadPct: 0.05, dollarVolume: 850000000, holdsAboveVwap: true, nearPremarketHigh: true, tightConsolidation: false, weakRejection: false, extendedFromBase: true, choppyStructure: false, poorLiquidityAfterOpen: false },
};

const CATALYSTS = [
  { ticker: "NVDA", type: "earnings" as const, headline: "NVIDIA Beats Revenue Estimates by 15%", source: "Reuters" },
  { ticker: "ORCL", type: "guidance" as const, headline: "Oracle Raises Full-Year Cloud Revenue Forecast", source: "Bloomberg" },
  { ticker: "TSLA", type: "earnings" as const, headline: "Tesla Reports Record Vehicle Deliveries", source: "CNBC" },
];

async function main() {
  console.log("🌱 Seeding Shariah Gap Screener Database (Conservative v2)...");

  // 1. Insert stocks
  for (const s of STOCKS) {
    await db.insert(schema.stocks).values(s).onConflictDoUpdate({ 
      target: schema.stocks.ticker, 
      set: { name: s.name, exchange: s.exchange, sector: s.sector, marketCap: s.marketCap, shariahStatus: s.shariahStatus } 
    });
  }

  // 2. Insert shariah universe
  for (const s of STOCKS) {
    await db.insert(schema.shariahUniverse).values({
      ticker: s.ticker,
      shariahStatus: s.shariahStatus,
      source: "Manual",
      lastChecked: new Date(),
    }).onConflictDoUpdate({ 
      target: schema.shariahUniverse.ticker, 
      set: { shariahStatus: s.shariahStatus, lastChecked: new Date() } 
    });
  }

  // 3. Insert premarket snapshots
  for (const p of PREMARKET) {
    await db.insert(schema.premarketSnapshots).values({
      ticker: p.ticker,
      date: TODAY,
      prevClose: p.prevClose,
      premarketPrice: p.premarketPrice,
      premarketVolume: p.premarketVolume,
      premarketVwap: p.premarketVwap,
      gapPct: p.gapPct,
    }).onConflictDoUpdate({ 
      target: [schema.premarketSnapshots.ticker, schema.premarketSnapshots.date], 
      set: { premarketPrice: p.premarketPrice, premarketVolume: p.premarketVolume, gapPct: p.gapPct } 
    });
  }

  // 4. Insert intraday metrics
  for (const ticker in INTRADAY) {
    const m = INTRADAY[ticker];
    await db.insert(schema.intradayMetrics).values({
      ticker,
      date: TODAY,
      currentPrice: PREMARKET.find(p => p.ticker === ticker)?.premarketPrice ?? 0,
      rvol: m.rvol,
      spreadPct: m.spreadPct,
      dollarVolume: m.dollarVolume,
      holdsAboveVwap: m.holdsAboveVwap,
      nearPremarketHigh: m.nearPremarketHigh,
      tightConsolidation: m.tightConsolidation,
      weakRejection: m.weakRejection,
      extendedFromBase: m.extendedFromBase,
      choppyStructure: m.choppyStructure,
      poorLiquidityAfterOpen: m.poorLiquidityAfterOpen,
    }).onConflictDoUpdate({ 
      target: [schema.intradayMetrics.ticker, schema.intradayMetrics.date], 
      set: { rvol: m.rvol, spreadPct: m.spreadPct, holdsAboveVwap: m.holdsAboveVwap } 
    });
  }

  // 5. Insert catalysts
  for (const c of CATALYSTS) {
    await db.insert(schema.catalysts).values({
      ticker: c.ticker,
      date: TODAY,
      type: c.type,
      headline: c.headline,
      source: c.source,
    }).onConflictDoNothing();
  }

  // 6. Compute and insert signals
  const catalystTickers = new Set(CATALYSTS.map((c) => c.ticker));

  for (const pm of PREMARKET) {
    const px = pm.premarketPrice;
    const intra = INTRADAY[pm.ticker];
    if (!intra) continue;
    
    const hasCatalyst = catalystTickers.has(pm.ticker);
    const catalystEntry = CATALYSTS.find((c) => c.ticker === pm.ticker);

    const penalties = {
      spreadTooWide: intra.spreadPct > 0.3,
      weakRejectionAfterOpen: intra.weakRejection,
      belowPremarketVwap: !intra.holdsAboveVwap && px < pm.premarketVwap,
      extendedFromBase: intra.extendedFromBase,
      choppyStructure: intra.choppyStructure,
      poorLiquidityAfterOpen: intra.poorLiquidityAfterOpen,
    };

    const score = computeFullScore({
      gapPct: pm.gapPct,
      premarketVol: pm.premarketVolume,
      rvol: intra.rvol,
      structure: {
        holdsAboveVwap: intra.holdsAboveVwap,
        nearPremarketHigh: intra.nearPremarketHigh,
        tightConsolidation: intra.tightConsolidation,
      },
      liquidity: {
        tightSpread: intra.spreadPct < 0.2,
        strongDollarVolume: intra.dollarVolume > 80_000_000,
      },
      hasCatalyst,
      penalties,
    });

    const entryStatus = getEntryStatus(score.grade, {
      penalties,
      structure: {
        holdsAboveVwap: intra.holdsAboveVwap,
        nearPremarketHigh: intra.nearPremarketHigh,
        tightConsolidation: intra.tightConsolidation,
      },
      finalScore: score.finalScore,
    });

    await db.insert(schema.signals).values({
      ticker: pm.ticker,
      date: TODAY,
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
      gapPct: pm.gapPct,
      premarketVolume: pm.premarketVolume,
      rvol: intra.rvol,
      premarketPrice: px,
      hasCatalyst,
      catalystType: hasCatalyst ? catalystEntry?.type : null,
      isTradeable: score.isTradeable,
    }).onConflictDoUpdate({
      target: [schema.signals.ticker, schema.signals.date],
      set: {
         finalScore: score.finalScore,
         grade: score.grade,
         entryStatus,
         isTradeable: score.isTradeable,
         updatedAt: new Date()
      }
    });
  }

  // 7. Initialize user settings
  await db.insert(schema.userSettings).values({
    id: 1,
    accountSize: 25000,
    maxRiskPct: 1.0,
    shariahSource: "manual",
    minGapPct: 3.0,
    minPremarketVol: 300000,
    showGradeC: false,
  }).onConflictDoNothing();

  console.log("✅ Seeding complete.");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
