/**
 * DB Cleanup Script
 * Use this to remove all stale mock data.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("🧹 Cleaning up stale mock signals and snapshots...");

  await db.delete(schema.signals);
  await db.delete(schema.premarketSnapshots);
  await db.delete(schema.intradayMetrics);
  await db.delete(schema.catalysts);

  console.log("✅ Database cleared. Dashboard should now be empty until you sync real data.");
}

main().catch(console.error);
