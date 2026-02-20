-- RLS policies for beneficiary data isolation.
-- Requires: add-rls-helpers.sql to be applied first.
--
-- Status: APPLIED — policies exist in the database.
-- Note: column names use camelCase (Drizzle convention: "beneficiaryId" not beneficiary_id)
--
-- How it works:
-- - Authenticated users (beneficiaries) only see their own rows via app.get_user_beneficiary_id()
-- - Admins bypass via app.is_admin() — they see all rows
-- - neondb_owner (used by getPublicDb() for system queries) has BYPASSRLS — unaffected
--
-- Do NOT use bun run db:push — these are raw policies Drizzle push doesn't manage.

-- ============================================================
-- BENEFICIARY TABLE
-- ============================================================
ALTER TABLE beneficiary ENABLE ROW LEVEL SECURITY;

-- SELECT: beneficiaries see only their own row; admins see all
CREATE POLICY crud-authenticated-policy-select ON beneficiary
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (app.is_admin() OR id = app.get_user_beneficiary_id());

-- Mutations: admin only
CREATE POLICY crud-authenticated-policy-insert ON beneficiary
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-update ON beneficiary
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-delete ON beneficiary
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (app.is_admin());

-- ============================================================
-- DISTRIBUTION TABLE
-- ============================================================
ALTER TABLE distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY crud-authenticated-policy-select ON distribution
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (app.is_admin() OR "beneficiaryId" = app.get_user_beneficiary_id());

CREATE POLICY crud-authenticated-policy-insert ON distribution
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-update ON distribution
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-delete ON distribution
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (app.is_admin());

-- ============================================================
-- HEMS_REQUEST TABLE
-- ============================================================
ALTER TABLE hems_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY crud-authenticated-policy-select ON hems_request
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (app.is_admin() OR "beneficiaryId" = app.get_user_beneficiary_id());

-- Beneficiaries can submit their own requests; admins can insert on behalf
CREATE POLICY crud-authenticated-policy-insert ON hems_request
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-update ON hems_request
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-delete ON hems_request
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (app.is_admin());

-- ============================================================
-- WITHDRAWAL_RECORD TABLE
-- ============================================================
ALTER TABLE withdrawal_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY crud-authenticated-policy-select ON withdrawal_record
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (app.is_admin() OR "beneficiaryId" = app.get_user_beneficiary_id());

CREATE POLICY crud-authenticated-policy-insert ON withdrawal_record
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-update ON withdrawal_record
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());

CREATE POLICY crud-authenticated-policy-delete ON withdrawal_record
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (app.is_admin());

-- ============================================================
-- VERIFY
-- ============================================================
-- After applying, confirm policies exist:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('beneficiary', 'distribution', 'hems_request', 'withdrawal_record')
-- ORDER BY tablename, policyname;
