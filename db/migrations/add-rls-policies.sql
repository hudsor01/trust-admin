-- RLS policies for ALL tables — Trust Admin
-- Requires: add-rls-helpers.sql to be applied first.
--
-- Status: APPLIED — all policies exist in the database as of 2026-02-20.
--
-- Pattern:
--   Every table: 4 policies for `authenticated` role (SELECT/INSERT/UPDATE/DELETE)
--   Admin-only tables: all 4 ops restricted to app.is_admin()
--   Beneficiary-scoped tables: SELECT scoped per beneficiary; mutations admin-only
--   user_profile: SELECT open to all authenticated; mutations via neondb_owner
--   neondb_owner: unrestricted bypass (BYPASSRLS role) — no explicit policies needed
--     except on beneficiary/distribution/hems_request/entity which have owner_* policies
--     for historical reasons (they also have explicit owner_* policies from initial setup)
--
-- Column naming: Drizzle camelCase in DB ("beneficiaryId", not beneficiary_id)
--
-- DO NOT use bun run db:push — Drizzle push does not manage raw policies.

-- ============================================================
-- ADMIN-ONLY TABLES (29 tables)
-- All 4 ops restricted to app.is_admin() for authenticated role
-- ============================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON activity_log AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON activity_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON activity_log AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON activity_log AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE artwork ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON artwork AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON artwork AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON artwork AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON artwork AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON bank_account AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON bank_account AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON bank_account AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON bank_account AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON contact AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON contact AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON contact AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON contact AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE contact_association ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON contact_association AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON contact_association AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON contact_association AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON contact_association AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE document ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON document AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON document AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON document AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON document AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON entity AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON entity AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON entity AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON entity AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY owner_select ON entity AS PERMISSIVE FOR SELECT TO neondb_owner USING (true);
CREATE POLICY owner_insert ON entity AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON entity AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON entity AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

ALTER TABLE homestead ENABLE ROW LEVEL SECURITY;
ALTER TABLE homestead FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON homestead AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON homestead AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON homestead AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON homestead AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE insurance_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON insurance_policy AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON insurance_policy AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON insurance_policy AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON insurance_policy AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE investment_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_account FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON investment_account AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON investment_account AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON investment_account AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON investment_account AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE liability ENABLE ROW LEVEL SECURITY;
ALTER TABLE liability FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON liability AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON liability AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON liability AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON liability AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE liability_payment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON liability_payment AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON liability_payment AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON liability_payment AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON liability_payment AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE pending_inventory_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON pending_inventory_item AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON pending_inventory_item AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON pending_inventory_item AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON pending_inventory_item AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE personal_property ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON personal_property AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON personal_property AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON personal_property AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON personal_property AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE rental_property ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON rental_property AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON rental_property AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON rental_property AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON rental_property AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE specific_bequest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON specific_bequest AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON specific_bequest AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON specific_bequest AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON specific_bequest AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE task ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON task AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON task AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON task AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON task AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON transaction AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON transaction AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON transaction AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON transaction AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE trust_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounting FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON trust_accounting AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON trust_accounting AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON trust_accounting AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON trust_accounting AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE trustee ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON trustee AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON trustee AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON trustee AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON trustee AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE trustee_fee_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON trustee_fee_entry AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON trustee_fee_entry AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON trustee_fee_entry AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON trustee_fee_entry AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE trustee_fee_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON trustee_fee_schedule AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON trustee_fee_schedule AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON trustee_fee_schedule AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON trustee_fee_schedule AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE valuation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON valuation AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON valuation AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON valuation AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON valuation AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON vehicle AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-insert" ON vehicle AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON vehicle AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON vehicle AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- ============================================================
-- BENEFICIARY-SCOPED TABLES (4 tables)
-- SELECT: admin OR matching beneficiary
-- INSERT/UPDATE/DELETE: admin only
-- ============================================================

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

ALTER TABLE withdrawal_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_record FORCE ROW LEVEL SECURITY;
CREATE POLICY "crud-authenticated-policy-select" ON withdrawal_record AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (withdrawal_record."beneficiaryId" = app.get_user_beneficiary_id()))));
CREATE POLICY "crud-authenticated-policy-insert" ON withdrawal_record AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-update" ON withdrawal_record AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
CREATE POLICY "crud-authenticated-policy-delete" ON withdrawal_record AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));

-- ============================================================
-- USER PROFILE
-- SELECT: open to all authenticated (needed by RLS helper functions)
-- Mutations: neondb_owner only
-- ============================================================
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_all ON user_profile AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY owner_select ON user_profile AS PERMISSIVE FOR SELECT TO neondb_owner USING (true);
CREATE POLICY owner_insert ON user_profile AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
CREATE POLICY owner_update ON user_profile AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_delete ON user_profile AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);

-- ============================================================
-- INTERNAL / NEON-MANAGED TABLES (RLS on, no app-level policy)
-- These are managed by Neon Auth internals — app never queries them directly.
-- ============================================================
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY
-- ============================================================
-- SELECT tablename, count(*) as policy_count
-- FROM pg_policies WHERE schemaname = 'public'
--   AND roles = '{authenticated}'
-- GROUP BY tablename ORDER BY tablename;
-- Expected: 29 rows, each with policy_count = 4 (except user_profile = 1)
