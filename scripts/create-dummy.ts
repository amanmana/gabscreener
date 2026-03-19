import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;
const sql = neon(dbUrl!);
const db = drizzle(sql, { schema });

async function insertDummy() {
  const ticker = "DUMMY";
  const today = new Date().toISOString().split("T")[0];

  console.log(`Inserting dummy data for ${ticker} on ${today} ...`);

  // 1. Insert/Update Stock
  await db.delete(schema.stocks).where(eq(schema.stocks.ticker, ticker));
  await db.insert(schema.stocks).values({
    ticker: ticker,
    name: "Dummy Gap Up Corp",
    exchange: "NASDAQ",
    sector: "Technology",
    shariahStatus: "compliant",
    isActive: true,
  });

  // 1b. Shariah Universe
  await db.insert(schema.shariahUniverse).values({
    ticker: ticker,
    source: "manual",
    complianceScore: 100,
    lastReviewedAt: new Date(),
  });

  // 2. Premarket Snapshot
  await db.insert(schema.premarketSnapshots).values({
    ticker: ticker,
    date: today,
    prevClose: 100.0,
    premarketPrice: 110.0,  // 10% gap up
    premarketHigh: 112.0,
    premarketLow: 108.0,
    premarketVwap: 109.0,   // VWAP * 0.98 = 106.82
    premarketVolume: 500000,
    gapPct: 10.0,
  });

  // 3. Signal
  await db.insert(schema.signals).values({
    ticker: ticker,
    date: today,
    gapScore: 25,
    premarketVolScore: 20,
    rvolScore: 15,
    structureScore: 20,
    liquidityScore: 10,
    catalystScore: 5,
    finalScore: 95,
    grade: "A",
    entryStatus: "Watch",
    gapPct: 10.0,
    premarketVolume: 500000,
    premarketPrice: 110.0,
    hasCatalyst: true,
    isTradeable: true,
  });

  // 4. Intraday metrics
  await db.insert(schema.intradayMetrics).values({
    ticker: ticker,
    date: today,
    rvol: 2.5,
    spreadPct: 0.1,
    holdsAboveVwap: true,
  });

  console.log(`Dummy stock '${ticker}' created successfully for gap up.`);
  console.log(`Visit /stocks/${ticker} to see the Gap Up Calculator in action!`);
}

insertDummy().catch(console.error);
