/**
 * Seed script for Shariah Gap Screener (v2 Conservative)
 * Run with: npm run db:seed
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const STOCKS = [
  { ticker: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Technology", marketCap: 3000000.0, shariahStatus: "compliant" as const },
  { ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 3500000.0, shariahStatus: "compliant" as const },
  { ticker: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology", marketCap: 3200000.0, shariahStatus: "compliant" as const },
  { ticker: "TSM", name: "Taiwan Semiconductor Mfg", exchange: "NYSE", sector: "Technology", marketCap: 900000.0, shariahStatus: "compliant" as const },
  { ticker: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 800000.0, shariahStatus: "compliant" as const },
  { ticker: "ASML", name: "ASML Holding NV", exchange: "NASDAQ", sector: "Technology", marketCap: 400000.0, shariahStatus: "compliant" as const },
  { ticker: "ORCL", name: "Oracle Corporation", exchange: "NYSE", sector: "Technology", marketCap: 450000.0, shariahStatus: "compliant" as const },
  { ticker: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", sector: "Technology", marketCap: 260000.0, shariahStatus: "compliant" as const },
  { ticker: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", sector: "Consumer Discretionary", marketCap: 800000.0, shariahStatus: "compliant" as const },
  { ticker: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 1200000.0, shariahStatus: "compliant" as const },
  { ticker: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", sector: "Technology", marketCap: 2000000.0, shariahStatus: "compliant" as const },
];

async function main() {
  console.log("🌱 Seeding Shariah Universe only (Real Market Data requires sync)...");

  // 1. Insert stocks
  for (const s of STOCKS) {
    await db.insert(schema.stocks).values(s).onConflictDoUpdate({ 
      target: schema.stocks.ticker, 
      set: { 
        name: s.name, 
        exchange: s.exchange, 
        sector: s.sector, 
        marketCap: s.marketCap, 
        shariahStatus: s.shariahStatus,
        updatedAt: new Date()
      } 
    });
  }

  // 2. Insert shariah universe
  for (const s of STOCKS) {
    await db.insert(schema.shariahUniverse).values({
      ticker: s.ticker,
      source: "Manual",
      lastReviewedAt: new Date(),
    }).onConflictDoUpdate({ 
      target: schema.shariahUniverse.ticker, 
      set: { lastReviewedAt: new Date() } 
    });
  }

  // 3. Initialize user settings
  await db.insert(schema.userSettings).values({
    id: 1,
    accountSize: 25000,
    maxRiskPct: 1.0,
    shariahSource: "manual",
    minGapPct: 3.0,
    minPremarketVol: 300000,
    showGradeC: false,
  }).onConflictDoNothing();

  console.log("✅ Seeding complete. Use /api/cron/sync-market to fetch real data.");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
