/**
 * Neon PostgreSQL database client (serverless driver)
 * Uses the @neondatabase/serverless package for edge-compatible queries
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon serverless SQL client (with fallback for build-time/demo-mode)
const dbUrl = process.env.DATABASE_URL || "postgres://localhost:5432/mock";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set. Database operations will fail (Falling back to Demo Mode).");
}

const sql = neon(dbUrl);

// Drizzle ORM instance with full schema
export const db = drizzle(sql, { schema });

export type DB = typeof db;
