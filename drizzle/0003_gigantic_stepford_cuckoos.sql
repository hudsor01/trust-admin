ALTER TABLE "trustee" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "trustee" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."TrusteeStatus";--> statement-breakpoint
CREATE TYPE "public"."TrusteeStatus" AS ENUM('ACTIVE', 'SUCCESSOR', 'ARBITER', 'RESIGNED', 'REMOVED', 'DECEASED');--> statement-breakpoint
ALTER TABLE "trustee" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."TrusteeStatus";--> statement-breakpoint
ALTER TABLE "trustee" ALTER COLUMN "status" SET DATA TYPE "public"."TrusteeStatus" USING "status"::"public"."TrusteeStatus";--> statement-breakpoint
ALTER TABLE "entity" ADD COLUMN "ownershipPercent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "entity" ADD COLUMN "dodValue" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "entity" ADD COLUMN "dodValueDate" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "force_password_change" boolean DEFAULT false NOT NULL;