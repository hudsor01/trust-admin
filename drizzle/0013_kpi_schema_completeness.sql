-- Phase 26 KPI schema completeness — adds the columns the /bequests,
-- /artwork and /accounts KPI work depends on, across three tables:
--   • specific_bequest.estimatedValue  — numeric(14,2) money column (nullable)
--   • personal_property.insured        — boolean DEFAULT false NOT NULL
--   • liability.bankAccountId          — nullable FK → bank_account.id
--   • liability.investmentAccountId    — nullable FK → investment_account.id
--
-- Per CLAUDE.md "Postgres Column Naming Convention": this schema persists
-- camelCase column identifiers (table names stay snake_case). drizzle-kit
-- emitted the ADD COLUMN statements with the correct camelCase already
-- because the new columns are declared with camelCase names in db/schema.ts —
-- every quoted column identifier below ("bankAccountId", "investmentAccountId",
-- "estimatedValue", "insured") is verified camelCase; table names
-- (liability, personal_property, specific_bequest, bank_account,
-- investment_account) are correctly snake_case.
--
-- Non-destructive: nullable ADD COLUMN + ADD COLUMN with DEFAULT + nullable FK
-- columns with ON DELETE SET NULL. No DROP, no NOT NULL on an unbacked column,
-- no data transform — zero data-loss risk.
--
-- Idempotent: ADD COLUMN / CREATE INDEX use IF NOT EXISTS so a re-run after a
-- partial failure does not error. (ADD CONSTRAINT cannot take IF NOT EXISTS —
-- a partial re-run that already created the FK is recoverable per the
-- MEMORY "Stale __drizzle_migrations Row Recovery" note.)

ALTER TABLE "liability" ADD COLUMN IF NOT EXISTS "bankAccountId" bigint;--> statement-breakpoint
ALTER TABLE "liability" ADD COLUMN IF NOT EXISTS "investmentAccountId" bigint;--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "insured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "specific_bequest" ADD COLUMN IF NOT EXISTS "estimatedValue" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "liability" ADD CONSTRAINT "liability_bank_account_id_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."bank_account"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "liability" ADD CONSTRAINT "liability_investment_account_id_fkey" FOREIGN KEY ("investmentAccountId") REFERENCES "public"."investment_account"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_liability_bank_account_id" ON "liability" USING btree ("bankAccountId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_liability_investment_account_id" ON "liability" USING btree ("investmentAccountId");
