-- Migration: Rename PascalCase tables to snake_case
-- Phase 24-01: Table Naming Convention Migration
--
-- This migration renames 27 application tables from PascalCase to snake_case
-- per PostgreSQL best practices. Better Auth tables (account, session, user,
-- verification) are already lowercase and remain unchanged.
--
-- Note: ALTER TABLE RENAME is atomic and acquires only an ACCESS EXCLUSIVE lock
-- on the table being renamed, not on any referencing tables.

BEGIN;

-- Core tables
ALTER TABLE "ActivityLog" RENAME TO "activity_log";
ALTER TABLE "Entity" RENAME TO "entity";

-- Asset tables
ALTER TABLE "Vehicle" RENAME TO "vehicle";
ALTER TABLE "Homestead" RENAME TO "homestead";
ALTER TABLE "RentalProperty" RENAME TO "rental_property";
ALTER TABLE "BankAccount" RENAME TO "bank_account";
ALTER TABLE "InvestmentAccount" RENAME TO "investment_account";
ALTER TABLE "InsurancePolicy" RENAME TO "insurance_policy";
ALTER TABLE "PersonalProperty" RENAME TO "personal_property";
ALTER TABLE "Artwork" RENAME TO "artwork";

-- Beneficiary and distribution tables
ALTER TABLE "Beneficiary" RENAME TO "beneficiary";
ALTER TABLE "Distribution" RENAME TO "distribution";
ALTER TABLE "SpecificBequest" RENAME TO "specific_bequest";
ALTER TABLE "WithdrawalRecord" RENAME TO "withdrawal_record";
ALTER TABLE "HemsRequest" RENAME TO "hems_request";

-- Financial tables
ALTER TABLE "Liability" RENAME TO "liability";
ALTER TABLE "LiabilityPayment" RENAME TO "liability_payment";
ALTER TABLE "TrustAccounting" RENAME TO "trust_accounting";

-- Administration tables
ALTER TABLE "Trustee" RENAME TO "trustee";
ALTER TABLE "TrusteeFeeSchedule" RENAME TO "trustee_fee_schedule";
ALTER TABLE "TrusteeFeeEntry" RENAME TO "trustee_fee_entry";
ALTER TABLE "Task" RENAME TO "task";
ALTER TABLE "Contact" RENAME TO "contact";
ALTER TABLE "ContactAssociation" RENAME TO "contact_association";

-- Polymorphic tables
ALTER TABLE "Valuation" RENAME TO "valuation";
ALTER TABLE "Document" RENAME TO "document";
ALTER TABLE "Transaction" RENAME TO "transaction";

COMMIT;

-- Verification query (run after migration):
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
