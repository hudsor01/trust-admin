ALTER TABLE "trustee" DROP CONSTRAINT IF EXISTS "trustee_contact_id_fkey";--> statement-breakpoint
ALTER TABLE "trustee" DROP CONSTRAINT IF EXISTS "trustee_co_trustee_id_fkey";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_trustee_contact_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_trustee_co_trustee_id";--> statement-breakpoint
ALTER TABLE "trustee" DROP COLUMN IF EXISTS "contactId";--> statement-breakpoint
ALTER TABLE "trustee" DROP COLUMN IF EXISTS "coTrusteeId";
