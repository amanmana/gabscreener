/**
 * Database schema for Shariah Gap Screener
 * Using Drizzle ORM + Neon PostgreSQL
 */

import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  serial,
  varchar,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const shariahStatusEnum = pgEnum("shariah_status", [
  "compliant",
  "non_compliant",
  "under_review",
  "unknown",
]);

export const signalGradeEnum = pgEnum("signal_grade", ["A", "B", "C", "avoid"]);

export const entryStatusEnum = pgEnum("entry_status", [
  "Watch",
  "Near Trigger",
  "Breakout Triggered",
  "Avoid",
]);

export const catalystTypeEnum = pgEnum("catalyst_type", [
  "earnings",
  "guidance",
  "analyst",
  "contract",
  "news",
  "other",
]);

export const outcomeEnum = pgEnum("outcome", ["Win", "Loss", "Open"]);

// ─── stocks ──────────────────────────────────────────────────────────────────

/**
 * Master stock list for US-listed Shariah stocks
 */
export const stocks = pgTable(
  "stocks",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 }).notNull().unique(),
    name: text("name").notNull(),
    exchange: varchar("exchange", { length: 10 }).notNull(), // NYSE, NASDAQ
    sector: text("sector"),
    industry: text("industry"),
    shariahStatus: shariahStatusEnum("shariah_status")
      .notNull()
      .default("unknown"),
    marketCap: real("market_cap"), // in millions USD
    sharesOutstanding: real("shares_outstanding"), // in millions
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("stocks_ticker_idx").on(t.ticker),
    index("stocks_shariah_idx").on(t.shariahStatus),
  ]
);

// ─── shariah_universe ─────────────────────────────────────────────────────────

/**
 * Track Shariah compliance source and review dates
 */
export const shariahUniverse = pgTable("shariah_universe", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 10 })
    .notNull()
    .unique()
    .references(() => stocks.ticker, { onDelete: "cascade" }),
  source: varchar("source", { length: 50 }).notNull(), // 'AAOIFI', 'MSCI', 'manual'
  complianceScore: real("compliance_score"), // 0-100 if available
  lastReviewedAt: timestamp("last_reviewed_at"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── daily_prices ─────────────────────────────────────────────────────────────

/**
 * End-of-day OHLCV price data
 */
export const dailyPrices = pgTable(
  "daily_prices",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: integer("volume").notNull(),
    adjustedClose: real("adjusted_close"),
  },
  (t) => [
    index("daily_prices_ticker_date_idx").on(t.ticker, t.date),
    index("daily_prices_date_idx").on(t.date),
  ]
);

// ─── premarket_snapshots ──────────────────────────────────────────────────────

/**
 * Premarket data snapshot (updated before market open each day)
 */
export const premarketSnapshots = pgTable(
  "premarket_snapshots",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    prevClose: real("prev_close").notNull(),
    premarketPrice: real("premarket_price").notNull(),
    premarketHigh: real("premarket_high"),
    premarketLow: real("premarket_low"),
    premarketVwap: real("premarket_vwap"),
    premarketVolume: integer("premarket_volume").notNull(), // must be >= 300k to qualify
    gapPct: real("gap_pct").notNull(), // (premarketPrice - prevClose) / prevClose * 100
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
  },
  (t) => [
    index("premarket_ticker_date_idx").on(t.ticker, t.date),
    index("premarket_gap_idx").on(t.gapPct),
    index("premarket_vol_idx").on(t.premarketVolume),
    index("premarket_date_idx").on(t.date),
  ]
);

// ─── intraday_metrics ─────────────────────────────────────────────────────────

/**
 * Live or near-live intraday data for scoring structure, liquidity, RVOL
 */
export const intradayMetrics = pgTable(
  "intraday_metrics",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    date: text("date").notNull(),
    rvol: real("rvol"), // relative volume vs 30-day avg
    spreadPct: real("spread_pct"), // bid-ask spread as % of price
    dollarVolume: real("dollar_volume"), // price * volume traded so far
    openingRangeHigh: real("opening_range_high"), // first 5-min high
    openingRangeLow: real("opening_range_low"),
    currentPrice: real("current_price"),
    holdsAboveVwap: boolean("holds_above_vwap").default(false),
    nearPremarketHigh: boolean("near_premarket_high").default(false),
    tightConsolidation: boolean("tight_consolidation").default(false),
    weakRejection: boolean("weak_rejection").default(false),
    extendedFromBase: boolean("extended_from_base").default(false),
    choppyStructure: boolean("choppy_structure").default(false),
    poorLiquidityAfterOpen: boolean("poor_liquidity_after_open").default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("intraday_ticker_date_idx").on(t.ticker, t.date),
    index("intraday_rvol_idx").on(t.rvol),
  ]
);

// ─── catalysts ────────────────────────────────────────────────────────────────

/**
 * News/catalyst events tied to a stock on a given date
 */
export const catalysts = pgTable(
  "catalysts",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    date: text("date").notNull(),
    type: catalystTypeEnum("type").notNull(),
    headline: text("headline").notNull(),
    source: text("source"),
    url: text("url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("catalyst_ticker_date_idx").on(t.ticker, t.date)]
);

// ─── signals ──────────────────────────────────────────────────────────────────

/**
 * Core scoring output — precomputed and stored for fast retrieval
 * This is what powers the screener table
 */
export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    date: text("date").notNull(),

    // Score components (stored for breakdown display)
    gapScore: integer("gap_score").notNull().default(0), // max 25
    premarketVolScore: integer("premarket_vol_score").notNull().default(0), // max 20
    rvolScore: integer("rvol_score").notNull().default(0), // max 15
    structureScore: integer("structure_score").notNull().default(0), // max 20
    liquidityScore: integer("liquidity_score").notNull().default(0), // max 10
    catalystScore: integer("catalyst_score").notNull().default(0), // max 10

    // Penalties
    totalPenalty: integer("total_penalty").notNull().default(0), // negative

    // Final computed score
    finalScore: integer("final_score").notNull().default(0), // 0-100
    grade: signalGradeEnum("grade").notNull().default("avoid"),
    entryStatus: entryStatusEnum("entry_status").notNull().default("Watch"),

    // Snapshot values for display
    gapPct: real("gap_pct"),
    premarketVolume: integer("premarket_volume"),
    rvol: real("rvol"),
    premarketPrice: real("premarket_price"),
    hasCatalyst: boolean("has_catalyst").notNull().default(false),
    catalystType: catalystTypeEnum("catalyst_type"),

    // Is this actually tradeable (vs just discovery-level)
    isTradeable: boolean("is_tradeable").notNull().default(false),

    // Signal history outcome (updated post-market)
    outcome: outcomeEnum("outcome"),
    outcomeNotes: text("outcome_notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("signals_ticker_date_idx").on(t.ticker, t.date),
    index("signals_grade_idx").on(t.grade),
    index("signals_score_idx").on(t.finalScore),
    index("signals_date_idx").on(t.date),
    index("signals_tradeable_idx").on(t.isTradeable),
  ]
);

// ─── watchlists ───────────────────────────────────────────────────────────────

/**
 * User-saved watchlist tickers
 */
export const watchlists = pgTable(
  "watchlists",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    notes: text("notes"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [
    index("watchlist_ticker_idx").on(t.ticker),
  ]
);

// ─── user_settings ────────────────────────────────────────────────────────────

/**
 * Single-row user preferences (no auth in MVP, row id=1 is the singleton)
 */
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  accountSize: real("account_size").notNull().default(10000), // USD
  maxRiskPct: real("max_risk_pct").notNull().default(1), // 1%
  shariahSource: varchar("shariah_source", { length: 50 })
    .notNull()
    .default("manual"), // 'AAOIFI', 'MSCI', 'manual'
  minGapPct: real("min_gap_pct").notNull().default(4), // default filter
  minPremarketVol: integer("min_premarket_vol").notNull().default(300000),
  showGradeC: boolean("show_grade_c").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
