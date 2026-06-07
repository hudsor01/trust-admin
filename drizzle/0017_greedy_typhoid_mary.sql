ALTER TABLE "note_receivable" DROP CONSTRAINT "note_receivable_beneficiary_id_fkey";
--> statement-breakpoint
DROP INDEX "idx_note_receivable_beneficiary_id";--> statement-breakpoint
ALTER TABLE "note_receivable" DROP COLUMN "beneficiaryId";