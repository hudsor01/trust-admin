CREATE TYPE "public"."ReceivableType" AS ENUM('PROMISSORY_NOTE', 'PERSONAL_LOAN', 'ADVANCE', 'ACCOUNT_RECEIVABLE', 'OTHER');--> statement-breakpoint
CREATE TABLE "note_receivable" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "note_receivable_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entityId" bigint NOT NULL,
	"receivableType" "ReceivableType" NOT NULL,
	"debtor" text NOT NULL,
	"beneficiaryId" bigint,
	"description" text,
	"originalPrincipal" numeric(14, 2) NOT NULL,
	"currentBalance" numeric(14, 2) NOT NULL,
	"currentBalanceDate" timestamp(3) with time zone,
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3) with time zone,
	"interestRate" numeric(5, 3),
	"monthlyPayment" numeric(12, 2),
	"originationDate" timestamp(3) with time zone,
	"dueDate" timestamp(3) with time zone,
	"loanTermMonths" integer,
	"secured" boolean DEFAULT false NOT NULL,
	"collateralDescription" text,
	"status" "RecordStatus" DEFAULT 'ACTIVE' NOT NULL,
	"allocationClass" "AllocationClass" DEFAULT 'PRINCIPAL',
	"notes" text,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_receivable" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receivable_payment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receivable_payment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receivableId" bigint NOT NULL,
	"paymentDate" timestamp(3) with time zone NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"principalPortion" numeric(12, 2),
	"interestPortion" numeric(12, 2),
	"paymentMethod" "PaymentMethod",
	"checkNumber" text,
	"confirmationNumber" text,
	"notes" text,
	"createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receivable_payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "note_receivable" ADD CONSTRAINT "note_receivable_entity_id_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note_receivable" ADD CONSTRAINT "note_receivable_beneficiary_id_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."beneficiary"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "receivable_payment" ADD CONSTRAINT "receivable_payment_receivable_id_fkey" FOREIGN KEY ("receivableId") REFERENCES "public"."note_receivable"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_note_receivable_entity_id" ON "note_receivable" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_note_receivable_status" ON "note_receivable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_note_receivable_entity_status" ON "note_receivable" USING btree ("entityId","status");--> statement-breakpoint
CREATE INDEX "idx_note_receivable_beneficiary_id" ON "note_receivable" USING btree ("beneficiaryId");--> statement-breakpoint
CREATE INDEX "idx_receivable_payment_receivable_id" ON "receivable_payment" USING btree ("receivableId");--> statement-breakpoint
CREATE INDEX "idx_receivable_payment_date" ON "receivable_payment" USING btree ("paymentDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_receivable_payment_receivable_date" ON "receivable_payment" USING btree ("receivableId","paymentDate" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "note_receivable" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT app.is_admin() AS is_admin));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "note_receivable" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "note_receivable" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "note_receivable" AS PERMISSIVE FOR DELETE TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "receivable_payment" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT app.is_admin() AS is_admin));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "receivable_payment" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "receivable_payment" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "receivable_payment" AS PERMISSIVE FOR DELETE TO "authenticated";