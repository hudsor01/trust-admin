-- RLS policies for all tables — Trust Admin
-- Requires: add-rls-helpers.sql to be applied first.
--
-- Status: APPLIED — policies exist in the database as of 2026-02-20.
--
-- Pattern:
--   Admin-only tables:    all ops restricted to app.is_admin()
--   Beneficiary-scoped:   SELECT scoped per beneficiary; mutations admin-only
--   user_profile:         SELECT open to all authenticated; mutations via neondb_owner
--
-- Column naming: Drizzle uses camelCase in DB ("beneficiaryId", not beneficiary_id)
--
-- DO NOT use bun run db:push — Drizzle push does not manage raw policies.

-- ============================================================
-- ADMIN-ONLY TABLES
-- authenticated role: all operations restricted to admins
-- neondb_owner: unrestricted (BYPASSRLS)
-- ============================================================

-- bank_account
ALTER TABLE bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON bank_account AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON bank_account AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON bank_account AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON bank_account AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- entity
ALTER TABLE entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON entity AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON entity AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON entity AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON entity AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
-- neondb_owner bypass policies
CREATE POLICY owner_select ON entity AS PERMISSIVE FOR SELECT TO neondb_owner USING (true);
CREATE POLICY owner_insert ON entity AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON entity AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON entity AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- homestead
ALTER TABLE homestead ENABLE ROW LEVEL SECURITY;
ALTER TABLE homestead FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON homestead AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON homestead AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON homestead AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON homestead AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- investment_account
ALTER TABLE investment_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_account FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON investment_account AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON investment_account AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON investment_account AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON investment_account AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- liability
ALTER TABLE liability ENABLE ROW LEVEL SECURITY;
ALTER TABLE liability FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON liability AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON liability AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON liability AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON liability AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- trust_accounting
ALTER TABLE trust_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounting FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON trust_accounting AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON trust_accounting AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON trust_accounting AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON trust_accounting AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- vehicle
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON vehicle AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON vehicle AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON vehicle AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON vehicle AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- ============================================================
-- BENEFICIARY-SCOPED TABLES
-- SELECT: admin OR matching beneficiary
-- INSERT/UPDATE/DELETE: admin only
-- neondb_owner: unrestricted (owner_* bypass policies)
-- ============================================================

-- beneficiary (col: id)
ALTER TABLE beneficiary ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON beneficiary AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (beneficiary.id = app.get_user_beneficiary_id()))));
CREATE POLICY "crud-authenticated-policy-insert" ON beneficiary AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON beneficiary AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON beneficiary AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY owner_select ON beneficiary AS PERMISSIVE FOR SELECT TO neondb_owner USING (app.is_admin() OR (id = app.get_user_beneficiary_id()));
CREATE POLICY owner_insert ON beneficiary AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON beneficiary AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON beneficiary AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- distribution (col: "beneficiaryId")
ALTER TABLE distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON distribution AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (distribution."beneficiaryId" = app.get_user_beneficiary_id()))));
CREATE POLICY "crud-authenticated-policy-insert" ON distribution AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON distribution AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON distribution AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY owner_select ON distribution AS PERMISSIVE FOR SELECT TO neondb_owner USING (app.is_admin() OR ("beneficiaryId" = app.get_user_beneficiary_id()));
CREATE POLICY owner_insert ON distribution AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON distribution AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON distribution AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- hems_request (col: "beneficiaryId")
ALTER TABLE hems_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE hems_request FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON hems_request AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (hems_request."beneficiaryId" = app.get_user_beneficiary_id()))));
CREATE POLICY "crud-authenticated-policy-insert" ON hems_request AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON hems_request AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON hems_request AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY owner_select ON hems_request AS PERMISSIVE FOR SELECT TO neondb_owner USING (app.is_admin() OR ("beneficiaryId" = app.get_user_beneficiary_id()));
CREATE POLICY owner_insert ON hems_request AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON hems_request AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON hems_request AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- withdrawal_record (col: "beneficiaryId")
ALTER TABLE withdrawal_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_record FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON withdrawal_record AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (withdrawal_record."beneficiaryId" = app.get_user_beneficiary_id()))));
CREATE POLICY "crud-authenticated-policy-insert" ON withdrawal_record AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON withdrawal_record AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON withdrawal_record AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- ============================================================
-- USER PROFILE
-- SELECT: open to all authenticated (needed by RLS helper functions)
-- INSERT/UPDATE/DELETE: neondb_owner only (app manages via getPublicDb())
-- ============================================================
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_all ON user_profile AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY owner_select ON user_profile AS PERMISSIVE FOR SELECT TO neondb_owner USING (true);
CREATE POLICY owner_insert ON user_profile AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON user_profile AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON user_profile AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- ============================================================
-- TABLES WITH RLS ENABLED BUT NO AUTHENTICATED POLICIES
-- These are admin-only in the application layer (adminProcedure).
-- Authenticated users cannot access them via the `authenticated` role —
-- they are accessed exclusively through getPublicDb() (neondb_owner BYPASSRLS).
-- Enable RLS only; no policy needed since all access goes through owner bypass.
-- ============================================================
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_association ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE liability_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_inventory_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_property ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_property ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE specific_bequest ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustee ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustee_fee_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustee_fee_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY
-- ============================================================
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
