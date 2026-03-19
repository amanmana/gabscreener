DROP INDEX "daily_prices_ticker_date_idx";--> statement-breakpoint
DROP INDEX "intraday_ticker_date_idx";--> statement-breakpoint
DROP INDEX "premarket_ticker_date_idx";--> statement-breakpoint
DROP INDEX "signals_ticker_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "daily_prices_ticker_date_idx" ON "daily_prices" USING btree ("ticker","date");--> statement-breakpoint
CREATE UNIQUE INDEX "intraday_ticker_date_idx" ON "intraday_metrics" USING btree ("ticker","date");--> statement-breakpoint
CREATE UNIQUE INDEX "premarket_ticker_date_idx" ON "premarket_snapshots" USING btree ("ticker","date");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_ticker_date_idx" ON "signals" USING btree ("ticker","date");