/**
 * Neon PostgreSQL database client (serverless driver)
 * Uses the @neondatabase/serverless package for edge-compatible queries
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Neon serverless SQL client
const sql = neon(process.env.DATABASE_URL);

// Drizzle ORM instance with full schema
export const db = drizzle(sql, { schema });

export type DB = typeof db;
