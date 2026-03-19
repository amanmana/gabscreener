CREATE TYPE "public"."catalyst_type" AS ENUM('earnings', 'guidance', 'analyst', 'contract', 'news', 'other');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('Watch', 'Near Trigger', 'Breakout Triggered', 'Avoid');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('Win', 'Loss', 'Open');--> statement-breakpoint
CREATE TYPE "public"."shariah_status" AS ENUM('compliant', 'non_compliant', 'under_review', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."signal_grade" AS ENUM('A', 'B', 'C', 'avoid');--> statement-breakpoint
CREATE TABLE "catalysts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"date" text NOT NULL,
	"type" "catalyst_type" NOT NULL,
	"headline" text NOT NULL,
	"source" text,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"date" text NOT NULL,
	"open" real NOT NULL,
	"high" real NOT NULL,
	"low" real NOT NULL,
	"close" real NOT NULL,
	"volume" integer NOT NULL,
	"adjusted_close" real
);
--> statement-breakpoint
CREATE TABLE "intraday_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"date" text NOT NULL,
	"rvol" real,
	"spread_pct" real,
	"dollar_volume" real,
	"opening_range_high" real,
	"opening_range_low" real,
	"current_price" real,
	"holds_above_vwap" boolean DEFAULT false,
	"near_premarket_high" boolean DEFAULT false,
	"tight_consolidation" boolean DEFAULT false,
	"weak_rejection" boolean DEFAULT false,
	"extended_from_base" boolean DEFAULT false,
	"choppy_structure" boolean DEFAULT false,
	"poor_liquidity_after_open" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premarket_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"date" text NOT NULL,
	"prev_close" real NOT NULL,
	"premarket_price" real NOT NULL,
	"premarket_high" real,
	"premarket_low" real,
	"premarket_vwap" real,
	"premarket_volume" integer NOT NULL,
	"gap_pct" real NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shariah_universe" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"source" varchar(50) NOT NULL,
	"compliance_score" real,
	"last_reviewed_at" timestamp,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shariah_universe_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"date" text NOT NULL,
	"gap_score" integer DEFAULT 0 NOT NULL,
	"premarket_vol_score" integer DEFAULT 0 NOT NULL,
	"rvol_score" integer DEFAULT 0 NOT NULL,
	"structure_score" integer DEFAULT 0 NOT NULL,
	"liquidity_score" integer DEFAULT 0 NOT NULL,
	"catalyst_score" integer DEFAULT 0 NOT NULL,
	"total_penalty" integer DEFAULT 0 NOT NULL,
	"final_score" integer DEFAULT 0 NOT NULL,
	"grade" "signal_grade" DEFAULT 'avoid' NOT NULL,
	"entry_status" "entry_status" DEFAULT 'Watch' NOT NULL,
	"gap_pct" real,
	"premarket_volume" integer,
	"rvol" real,
	"premarket_price" real,
	"has_catalyst" boolean DEFAULT false NOT NULL,
	"catalyst_type" "catalyst_type",
	"is_tradeable" boolean DEFAULT false NOT NULL,
	"outcome" "outcome",
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"exchange" varchar(10) NOT NULL,
	"sector" text,
	"industry" text,
	"shariah_status" "shariah_status" DEFAULT 'unknown' NOT NULL,
	"market_cap" real,
	"shares_outstanding" real,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_size" real DEFAULT 10000 NOT NULL,
	"max_risk_pct" real DEFAULT 1 NOT NULL,
	"shariah_source" varchar(50) DEFAULT 'manual' NOT NULL,
	"min_gap_pct" real DEFAULT 4 NOT NULL,
	"min_premarket_vol" integer DEFAULT 300000 NOT NULL,
	"show_grade_c" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"notes" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalysts" ADD CONSTRAINT "catalysts_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intraday_metrics" ADD CONSTRAINT "intraday_metrics_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premarket_snapshots" ADD CONSTRAINT "premarket_snapshots_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shariah_universe" ADD CONSTRAINT "shariah_universe_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_ticker_stocks_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."stocks"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalyst_ticker_date_idx" ON "catalysts" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "daily_prices_ticker_date_idx" ON "daily_prices" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "daily_prices_date_idx" ON "daily_prices" USING btree ("date");--> statement-breakpoint
CREATE INDEX "intraday_ticker_date_idx" ON "intraday_metrics" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "intraday_rvol_idx" ON "intraday_metrics" USING btree ("rvol");--> statement-breakpoint
CREATE INDEX "premarket_ticker_date_idx" ON "premarket_snapshots" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "premarket_gap_idx" ON "premarket_snapshots" USING btree ("gap_pct");--> statement-breakpoint
CREATE INDEX "premarket_vol_idx" ON "premarket_snapshots" USING btree ("premarket_volume");--> statement-breakpoint
CREATE INDEX "premarket_date_idx" ON "premarket_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "signals_ticker_date_idx" ON "signals" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "signals_grade_idx" ON "signals" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "signals_score_idx" ON "signals" USING btree ("final_score");--> statement-breakpoint
CREATE INDEX "signals_date_idx" ON "signals" USING btree ("date");--> statement-breakpoint
CREATE INDEX "signals_tradeable_idx" ON "signals" USING btree ("is_tradeable");--> statement-breakpoint
CREATE INDEX "stocks_ticker_idx" ON "stocks" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "stocks_shariah_idx" ON "stocks" USING btree ("shariah_status");--> statement-breakpoint
CREATE INDEX "watchlist_ticker_idx" ON "watchlists" USING btree ("ticker");