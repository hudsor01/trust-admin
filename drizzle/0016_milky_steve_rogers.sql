CREATE TYPE "public"."NoteType" AS ENUM('NEGOTIABLE', 'NON_NEGOTIABLE');--> statement-breakpoint
ALTER TABLE "note_receivable" ADD COLUMN "debtorAddress" text;--> statement-breakpoint
ALTER TABLE "note_receivable" ADD COLUMN "noteType" "NoteType" DEFAULT 'NON_NEGOTIABLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_receivable" ADD COLUMN "collectionNotes" text;