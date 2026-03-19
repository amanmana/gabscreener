ALTER TABLE "premarket_snapshots" ALTER COLUMN "premarket_volume" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "premarket_snapshots" ADD COLUMN "today_open" real;--> statement-breakpoint
ALTER TABLE "premarket_snapshots" ADD COLUMN "data_source" varchar(50);--> statement-breakpoint
ALTER TABLE "premarket_snapshots" ADD COLUMN "calculation_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "data_source" varchar(50);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "calculation_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "last_updated" timestamp DEFAULT now() NOT NULL;