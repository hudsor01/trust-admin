ALTER TABLE "document" DROP CONSTRAINT "document_single_owner_check";--> statement-breakpoint
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_single_asset_check";--> statement-breakpoint
ALTER TABLE "valuation" DROP CONSTRAINT "valuation_single_asset_check";--> statement-breakpoint
DROP INDEX "idx_artwork_entity_id";--> statement-breakpoint
DROP INDEX "idx_artwork_status";--> statement-breakpoint
DROP INDEX "idx_pending_inventory_item_created_at";--> statement-breakpoint
DROP INDEX "idx_pending_inventory_item_entity_id";--> statement-breakpoint
DROP INDEX "idx_pending_inventory_item_status";--> statement-breakpoint
DROP INDEX "idx_entity_parent_entity_id";--> statement-breakpoint
DROP INDEX "idx_entity_status";--> statement-breakpoint
DROP INDEX "idx_homestead_entity_id";--> statement-breakpoint
DROP INDEX "idx_homestead_status";--> statement-breakpoint
DROP INDEX "idx_task_category";--> statement-breakpoint
DROP INDEX "idx_task_completed";--> statement-breakpoint
DROP INDEX "idx_task_due_date";--> statement-breakpoint
DROP INDEX "idx_task_incomplete_due";--> statement-breakpoint
DROP INDEX "idx_rental_property_entity_id";--> statement-breakpoint
DROP INDEX "idx_rental_property_status";--> statement-breakpoint
DROP INDEX "idx_specific_bequest_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_specific_bequest_entity_id";--> statement-breakpoint
DROP INDEX "idx_insurance_policy_entity_id";--> statement-breakpoint
DROP INDEX "idx_insurance_policy_status";--> statement-breakpoint
DROP INDEX "idx_trustee_co_trustee_id";--> statement-breakpoint
DROP INDEX "idx_trustee_contact_id";--> statement-breakpoint
DROP INDEX "idx_trustee_entity_id";--> statement-breakpoint
DROP INDEX "idx_trustee_status";--> statement-breakpoint
DROP INDEX "idx_contact_association_contact_id";--> statement-breakpoint
DROP INDEX "idx_contact_association_entity_id";--> statement-breakpoint
DROP INDEX "idx_liability_payment_date";--> statement-breakpoint
DROP INDEX "idx_liability_payment_liability_date";--> statement-breakpoint
DROP INDEX "idx_liability_payment_liability_id";--> statement-breakpoint
DROP INDEX "idx_personal_property_entity_id";--> statement-breakpoint
DROP INDEX "idx_personal_property_status";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_entry_entity";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_entry_entity_status";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_entry_period";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_entry_status";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_entry_trustee";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_schedule_effective";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_schedule_entity";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_schedule_entity_trustee";--> statement-breakpoint
DROP INDEX "idx_trustee_fee_schedule_trustee";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_bank_account";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_created_at_brin";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_date";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_entity_date";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_entity_id";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_entity_type";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_entry_type";--> statement-breakpoint
DROP INDEX "idx_trust_accounting_unconverted";--> statement-breakpoint
DROP INDEX "idx_vehicle_entity_id";--> statement-breakpoint
DROP INDEX "idx_vehicle_status";--> statement-breakpoint
DROP INDEX "idx_withdrawal_record_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_withdrawal_record_status";--> statement-breakpoint
DROP INDEX "idx_activity_log_action";--> statement-breakpoint
DROP INDEX "idx_activity_log_created_at";--> statement-breakpoint
DROP INDEX "idx_activity_log_created_at_brin";--> statement-breakpoint
DROP INDEX "idx_activity_log_new_values_gin";--> statement-breakpoint
DROP INDEX "idx_activity_log_old_values_gin";--> statement-breakpoint
DROP INDEX "idx_activity_log_record_id";--> statement-breakpoint
DROP INDEX "idx_activity_log_table_name";--> statement-breakpoint
DROP INDEX "idx_activity_log_table_record";--> statement-breakpoint
DROP INDEX "idx_contact_email";--> statement-breakpoint
DROP INDEX "idx_contact_name";--> statement-breakpoint
DROP INDEX "idx_contact_role";--> statement-breakpoint
DROP INDEX "idx_document_bank_account_id";--> statement-breakpoint
DROP INDEX "idx_document_entity_id";--> statement-breakpoint
DROP INDEX "idx_document_homestead_id";--> statement-breakpoint
DROP INDEX "idx_document_insurance_policy_id";--> statement-breakpoint
DROP INDEX "idx_document_investment_account_id";--> statement-breakpoint
DROP INDEX "idx_document_personal_property_id";--> statement-breakpoint
DROP INDEX "idx_document_rental_property_id";--> statement-breakpoint
DROP INDEX "idx_document_vehicle_id";--> statement-breakpoint
DROP INDEX "idx_user_profile_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_user_profile_role";--> statement-breakpoint
DROP INDEX "idx_distribution_beneficiary_date";--> statement-breakpoint
DROP INDEX "idx_distribution_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_distribution_date";--> statement-breakpoint
DROP INDEX "idx_distribution_entity_date";--> statement-breakpoint
DROP INDEX "idx_hems_request_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_hems_request_beneficiary_status";--> statement-breakpoint
DROP INDEX "idx_hems_request_distribution_id";--> statement-breakpoint
DROP INDEX "idx_hems_request_entity_id";--> statement-breakpoint
DROP INDEX "idx_hems_request_entity_status_created";--> statement-breakpoint
DROP INDEX "idx_hems_request_status";--> statement-breakpoint
DROP INDEX "idx_bank_account_entity_id";--> statement-breakpoint
DROP INDEX "idx_bank_account_status";--> statement-breakpoint
DROP INDEX "idx_beneficiary_entity_deceased";--> statement-breakpoint
DROP INDEX "idx_beneficiary_entity_id";--> statement-breakpoint
DROP INDEX "idx_beneficiary_parent_id";--> statement-breakpoint
DROP INDEX "idx_investment_account_entity_id";--> statement-breakpoint
DROP INDEX "idx_investment_account_status";--> statement-breakpoint
DROP INDEX "idx_liability_entity_id";--> statement-breakpoint
DROP INDEX "idx_liability_entity_status";--> statement-breakpoint
DROP INDEX "idx_liability_status";--> statement-breakpoint
DROP INDEX "idx_transaction_bank_account_id";--> statement-breakpoint
DROP INDEX "idx_transaction_date";--> statement-breakpoint
DROP INDEX "idx_transaction_homestead_id";--> statement-breakpoint
DROP INDEX "idx_transaction_insurance_policy_id";--> statement-breakpoint
DROP INDEX "idx_transaction_investment_account_id";--> statement-breakpoint
DROP INDEX "idx_transaction_rental_property_id";--> statement-breakpoint
DROP INDEX "idx_transaction_vehicle_id";--> statement-breakpoint
DROP INDEX "idx_user_beneficiary_id";--> statement-breakpoint
DROP INDEX "idx_user_email";--> statement-breakpoint
DROP INDEX "idx_user_role";--> statement-breakpoint
DROP INDEX "idx_valuation_artwork_id";--> statement-breakpoint
DROP INDEX "idx_valuation_bank_account_id";--> statement-breakpoint
DROP INDEX "idx_valuation_date";--> statement-breakpoint
DROP INDEX "idx_valuation_homestead_id";--> statement-breakpoint
DROP INDEX "idx_valuation_investment_account_id";--> statement-breakpoint
DROP INDEX "idx_valuation_personal_property_id";--> statement-breakpoint
DROP INDEX "idx_valuation_rental_property_id";--> statement-breakpoint
DROP INDEX "idx_valuation_vehicle_id";--> statement-breakpoint
DROP INDEX "idx_session_expires_at";--> statement-breakpoint
DROP INDEX "idx_session_token";--> statement-breakpoint
DROP INDEX "idx_session_user_id";--> statement-breakpoint
ALTER TABLE "beneficiary" drop column "full_name";--> statement-breakpoint
ALTER TABLE "beneficiary" ADD COLUMN "full_name" text GENERATED ALWAYS AS ("beneficiary"."firstName" || ' ' || "beneficiary"."lastName") STORED;--> statement-breakpoint
ALTER TABLE "liability" drop column "effective_balance";--> statement-breakpoint
ALTER TABLE "liability" ADD COLUMN "effective_balance" numeric(14, 2) GENERATED ALWAYS AS ("liability"."currentBalance" * (1 + COALESCE("liability"."interestRate", 0))) STORED;--> statement-breakpoint
CREATE INDEX "idx_artwork_entity_id" ON "artwork" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_artwork_status" ON "artwork" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pending_inventory_item_created_at" ON "pending_inventory_item" USING btree ("createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_pending_inventory_item_entity_id" ON "pending_inventory_item" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_pending_inventory_item_status" ON "pending_inventory_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_entity_parent_entity_id" ON "entity" USING btree ("parentEntityId");--> statement-breakpoint
CREATE INDEX "idx_entity_status" ON "entity" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_homestead_entity_id" ON "homestead" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_homestead_status" ON "homestead" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_category" ON "task" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_task_completed" ON "task" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_task_due_date" ON "task" USING btree ("dueDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_task_incomplete_due" ON "task" USING btree ("completed","dueDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_rental_property_entity_id" ON "rental_property" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_rental_property_status" ON "rental_property" USING btree ("rentalStatus");--> statement-breakpoint
CREATE INDEX "idx_specific_bequest_beneficiary_id" ON "specific_bequest" USING btree ("beneficiaryId");--> statement-breakpoint
CREATE INDEX "idx_specific_bequest_entity_id" ON "specific_bequest" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_insurance_policy_entity_id" ON "insurance_policy" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_insurance_policy_status" ON "insurance_policy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trustee_co_trustee_id" ON "trustee" USING btree ("coTrusteeId");--> statement-breakpoint
CREATE INDEX "idx_trustee_contact_id" ON "trustee" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "idx_trustee_entity_id" ON "trustee" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_trustee_status" ON "trustee" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_association_contact_id" ON "contact_association" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "idx_contact_association_entity_id" ON "contact_association" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_liability_payment_date" ON "liability_payment" USING btree ("paymentDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_liability_payment_liability_date" ON "liability_payment" USING btree ("liabilityId","paymentDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_liability_payment_liability_id" ON "liability_payment" USING btree ("liabilityId");--> statement-breakpoint
CREATE INDEX "idx_personal_property_entity_id" ON "personal_property" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_personal_property_status" ON "personal_property" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_entry_entity" ON "trustee_fee_entry" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_entry_entity_status" ON "trustee_fee_entry" USING btree ("entityId","status");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_entry_period" ON "trustee_fee_entry" USING btree ("periodStart" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_entry_status" ON "trustee_fee_entry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_entry_trustee" ON "trustee_fee_entry" USING btree ("trusteeId");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_schedule_effective" ON "trustee_fee_schedule" USING btree ("effectiveDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_schedule_entity" ON "trustee_fee_schedule" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_schedule_entity_trustee" ON "trustee_fee_schedule" USING btree ("entityId","trusteeId","effectiveDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trustee_fee_schedule_trustee" ON "trustee_fee_schedule" USING btree ("trusteeId");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_bank_account" ON "trust_accounting" USING btree ("bankAccountId");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_created_at_brin" ON "trust_accounting" USING brin ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_date" ON "trust_accounting" USING btree ("accountingDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_entity_date" ON "trust_accounting" USING btree ("entityId","accountingDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_entity_id" ON "trust_accounting" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_entity_type" ON "trust_accounting" USING btree ("entityId","entryType");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_entry_type" ON "trust_accounting" USING btree ("entryType");--> statement-breakpoint
CREATE INDEX "idx_trust_accounting_unconverted" ON "trust_accounting" USING btree ("entityId","entryType","isPrincipal","convertedToPrincipal");--> statement-breakpoint
CREATE INDEX "idx_vehicle_entity_id" ON "vehicle" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_vehicle_status" ON "vehicle" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_withdrawal_record_beneficiary_id" ON "withdrawal_record" USING btree ("beneficiaryId");--> statement-breakpoint
CREATE INDEX "idx_withdrawal_record_status" ON "withdrawal_record" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_activity_log_action" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_activity_log_created_at" ON "activity_log" USING btree ("createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activity_log_created_at_brin" ON "activity_log" USING brin ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_activity_log_new_values_gin" ON "activity_log" USING gin ("newValues");--> statement-breakpoint
CREATE INDEX "idx_activity_log_old_values_gin" ON "activity_log" USING gin ("oldValues");--> statement-breakpoint
CREATE INDEX "idx_activity_log_record_id" ON "activity_log" USING btree ("recordId");--> statement-breakpoint
CREATE INDEX "idx_activity_log_table_name" ON "activity_log" USING btree ("tableName");--> statement-breakpoint
CREATE INDEX "idx_activity_log_table_record" ON "activity_log" USING btree ("tableName","recordId");--> statement-breakpoint
CREATE INDEX "idx_contact_email" ON "contact" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contact_name" ON "contact" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_contact_role" ON "contact" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_document_bank_account_id" ON "document" USING btree ("bankAccountId");--> statement-breakpoint
CREATE INDEX "idx_document_entity_id" ON "document" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_document_homestead_id" ON "document" USING btree ("homesteadId");--> statement-breakpoint
CREATE INDEX "idx_document_insurance_policy_id" ON "document" USING btree ("insurancePolicyId");--> statement-breakpoint
CREATE INDEX "idx_document_investment_account_id" ON "document" USING btree ("investmentAccountId");--> statement-breakpoint
CREATE INDEX "idx_document_personal_property_id" ON "document" USING btree ("personalPropertyId");--> statement-breakpoint
CREATE INDEX "idx_document_rental_property_id" ON "document" USING btree ("rentalPropertyId");--> statement-breakpoint
CREATE INDEX "idx_document_vehicle_id" ON "document" USING btree ("vehicleId");--> statement-breakpoint
CREATE INDEX "idx_user_profile_beneficiary_id" ON "user_profile" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "idx_user_profile_role" ON "user_profile" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_distribution_beneficiary_date" ON "distribution" USING btree ("beneficiaryId","distributionDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_distribution_beneficiary_id" ON "distribution" USING btree ("beneficiaryId");--> statement-breakpoint
CREATE INDEX "idx_distribution_date" ON "distribution" USING btree ("distributionDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_distribution_entity_date" ON "distribution" USING btree ("entityId","distributionDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_hems_request_beneficiary_id" ON "hems_request" USING btree ("beneficiaryId");--> statement-breakpoint
CREATE INDEX "idx_hems_request_beneficiary_status" ON "hems_request" USING btree ("beneficiaryId","status");--> statement-breakpoint
CREATE INDEX "idx_hems_request_distribution_id" ON "hems_request" USING btree ("distributionId");--> statement-breakpoint
CREATE INDEX "idx_hems_request_entity_id" ON "hems_request" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_hems_request_entity_status_created" ON "hems_request" USING btree ("entityId","status","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_hems_request_status" ON "hems_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bank_account_entity_id" ON "bank_account" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_bank_account_status" ON "bank_account" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_beneficiary_entity_deceased" ON "beneficiary" USING btree ("entityId","deceasedDate");--> statement-breakpoint
CREATE INDEX "idx_beneficiary_entity_id" ON "beneficiary" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_beneficiary_parent_id" ON "beneficiary" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "idx_investment_account_entity_id" ON "investment_account" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_investment_account_status" ON "investment_account" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_liability_entity_id" ON "liability" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "idx_liability_entity_status" ON "liability" USING btree ("entityId","status");--> statement-breakpoint
CREATE INDEX "idx_liability_status" ON "liability" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transaction_bank_account_id" ON "transaction" USING btree ("bankAccountId");--> statement-breakpoint
CREATE INDEX "idx_transaction_date" ON "transaction" USING btree ("transactionDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transaction_homestead_id" ON "transaction" USING btree ("homesteadId");--> statement-breakpoint
CREATE INDEX "idx_transaction_insurance_policy_id" ON "transaction" USING btree ("insurancePolicyId");--> statement-breakpoint
CREATE INDEX "idx_transaction_investment_account_id" ON "transaction" USING btree ("investmentAccountId");--> statement-breakpoint
CREATE INDEX "idx_transaction_rental_property_id" ON "transaction" USING btree ("rentalPropertyId");--> statement-breakpoint
CREATE INDEX "idx_transaction_vehicle_id" ON "transaction" USING btree ("vehicleId");--> statement-breakpoint
CREATE INDEX "idx_user_beneficiary_id" ON "user" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_role" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_valuation_artwork_id" ON "valuation" USING btree ("artworkId");--> statement-breakpoint
CREATE INDEX "idx_valuation_bank_account_id" ON "valuation" USING btree ("bankAccountId");--> statement-breakpoint
CREATE INDEX "idx_valuation_date" ON "valuation" USING btree ("valuationDate" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_valuation_homestead_id" ON "valuation" USING btree ("homesteadId");--> statement-breakpoint
CREATE INDEX "idx_valuation_investment_account_id" ON "valuation" USING btree ("investmentAccountId");--> statement-breakpoint
CREATE INDEX "idx_valuation_personal_property_id" ON "valuation" USING btree ("personalPropertyId");--> statement-breakpoint
CREATE INDEX "idx_valuation_rental_property_id" ON "valuation" USING btree ("rentalPropertyId");--> statement-breakpoint
CREATE INDEX "idx_valuation_vehicle_id" ON "valuation" USING btree ("vehicleId");--> statement-breakpoint
CREATE INDEX "idx_session_expires_at" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_single_owner_check" CHECK ((
                (CASE WHEN "document"."entityId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."insurancePolicyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ));--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_single_asset_check" CHECK ((
                (CASE WHEN "transaction"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "transaction"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "transaction"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "transaction"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "transaction"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "transaction"."insurancePolicyId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ));--> statement-breakpoint
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_single_asset_check" CHECK ((
                (CASE WHEN "valuation"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."artworkId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "entity" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "entity" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "entity" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "entity" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "homestead" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "homestead" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "homestead" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "homestead" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "trust_accounting" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "trust_accounting" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "trust_accounting" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "trust_accounting" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "vehicle" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "vehicle" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "vehicle" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "vehicle" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "withdrawal_record" TO authenticated USING ((select app.is_admin() OR "withdrawal_record"."beneficiaryId" = app.get_user_beneficiary_id()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "withdrawal_record" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "withdrawal_record" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "withdrawal_record" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "distribution" TO authenticated USING ((select app.is_admin() OR "distribution"."beneficiaryId" = app.get_user_beneficiary_id()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "distribution" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "distribution" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "distribution" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "hems_request" TO authenticated USING ((select app.is_admin() OR "hems_request"."beneficiaryId" = app.get_user_beneficiary_id()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "hems_request" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "hems_request" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "hems_request" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "bank_account" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "bank_account" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "bank_account" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "bank_account" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "beneficiary" TO authenticated USING ((select app.is_admin() OR "beneficiary"."id" = app.get_user_beneficiary_id()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "beneficiary" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "beneficiary" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "beneficiary" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "investment_account" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "investment_account" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "investment_account" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "investment_account" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-select" ON "liability" TO authenticated USING ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-insert" ON "liability" TO authenticated WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-update" ON "liability" TO authenticated USING ((select app.is_admin())) WITH CHECK ((select app.is_admin()));--> statement-breakpoint
ALTER POLICY "crud-authenticated-policy-delete" ON "liability" TO authenticated USING ((select app.is_admin()));