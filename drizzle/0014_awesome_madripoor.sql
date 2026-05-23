CREATE TYPE "public"."AtfFormType" AS ENUM('FORM_1', 'FORM_4', 'FORM_5');--> statement-breakpoint
CREATE TYPE "public"."FirearmCondition" AS ENUM('POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'NEW');--> statement-breakpoint
CREATE TYPE "public"."FirearmType" AS ENUM('PISTOL', 'REVOLVER', 'RIFLE', 'SHOTGUN', 'SUPPRESSOR', 'SBR', 'SBS', 'MACHINE_GUN', 'AOW', 'DESTRUCTIVE_DEVICE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."NfaClass" AS ENUM('SUPPRESSOR', 'SBR', 'SBS', 'MACHINE_GUN', 'AOW', 'DESTRUCTIVE_DEVICE');--> statement-breakpoint
CREATE TYPE "public"."NfaTransferStatus" AS ENUM('NOT_FILED', 'FILED', 'APPROVED');--> statement-breakpoint
CREATE TABLE "firearm" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "firearm_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entityId" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"serialNumber" text NOT NULL,
	"firearmType" "FirearmType" NOT NULL,
	"caliber" text,
	"barrelLength" numeric(6, 2),
	"isNfa" boolean DEFAULT false NOT NULL,
	"nfaClass" "NfaClass",
	"atfFormType" "AtfFormType",
	"atfControlNumber" text,
	"taxStampDate" timestamp(3) with time zone,
	"nfrtrSerial" text,
	"nfaRegistered" boolean,
	"nfaTransferStatus" "NfaTransferStatus",
	"acquisitionDate" timestamp(3) with time zone,
	"acquisitionCost" numeric(12, 2),
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3) with time zone,
	"dodValueType" "ValuationType",
	"condition" "FirearmCondition" DEFAULT 'GOOD' NOT NULL,
	"action" text,
	"status" "RecordStatus" DEFAULT 'ACTIVE' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"location" text,
	"insured" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "firearm_nfa_class_required_check" CHECK (("firearm"."isNfa" = false OR "firearm"."nfaClass" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "firearm" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document" DROP CONSTRAINT "document_single_owner_check";--> statement-breakpoint
ALTER TABLE "valuation" DROP CONSTRAINT "valuation_single_asset_check";--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "firearmId" bigint;--> statement-breakpoint
ALTER TABLE "valuation" ADD COLUMN "firearmId" bigint;--> statement-breakpoint
ALTER TABLE "firearm" ADD CONSTRAINT "firearm_entity_id_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "firearm_serial_number_key" ON "firearm" USING btree ("serialNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_firearm_entity_id" ON "firearm" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_firearm_status" ON "firearm" USING btree ("status");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_firearm_id_fkey" FOREIGN KEY ("firearmId") REFERENCES "public"."firearm"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_firearm_id_fkey" FOREIGN KEY ("firearmId") REFERENCES "public"."firearm"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_document_firearm_id" ON "document" USING btree ("firearmId");--> statement-breakpoint
CREATE INDEX "idx_valuation_firearm_id" ON "valuation" USING btree ("firearmId");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_single_owner_check" CHECK ((
                (CASE WHEN "document"."entityId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."insurancePolicyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."firearmId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ));--> statement-breakpoint
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_single_asset_check" CHECK ((
                (CASE WHEN "valuation"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."firearmId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "firearm" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT app.is_admin() AS is_admin));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "firearm" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "firearm" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "firearm" AS PERMISSIVE FOR DELETE TO "authenticated";