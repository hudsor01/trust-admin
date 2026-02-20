-- RLS policies for beneficiary data isolation.
-- Requires: add-rls-helpers.sql to be applied first.
--
-- How it works:
-- - Authenticated users (beneficiaries) only see their own rows via app.get_user_beneficiary_id()
-- - Admins bypass via app.is_admin() — they see all rows
-- - neondb_owner (used by getPublicDb() for system queries) has BYPASSRLS — unaffected
--
-- Apply once: run in Drizzle Studio query runner or psql.
-- Do NOT use bun run db:push — these are raw policies Drizzle push doesn't manage.

-- ============================================================
-- BENEFICIARY TABLE
-- ============================================================
ALTER TABLE beneficiary ENABLE ROW LEVEL SECURITY;

CREATE POLICY beneficiary_access ON beneficiary
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        app.is_admin()
        OR id = app.get_user_beneficiary_id()
    )
    WITH CHECK (
        app.is_admin()
        OR id = app.get_user_beneficiary_id()
    );

-- ============================================================
-- DISTRIBUTION TABLE
-- ============================================================
ALTER TABLE distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY distribution_access ON distribution
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        app.is_admin()
        OR beneficiary_id = app.get_user_beneficiary_id()
    )
    WITH CHECK (
        -- Only admins can insert/update distributions
        app.is_admin()
    );

-- ============================================================
-- HEMS_REQUEST TABLE
-- ============================================================
ALTER TABLE hems_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY hems_request_access ON hems_request
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        app.is_admin()
        OR beneficiary_id = app.get_user_beneficiary_id()
    )
    WITH CHECK (
        app.is_admin()
        OR beneficiary_id = app.get_user_beneficiary_id()
    );

-- ============================================================
-- WITHDRAWAL_RECORD TABLE
-- ============================================================
ALTER TABLE withdrawal_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY withdrawal_record_access ON withdrawal_record
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        app.is_admin()
        OR beneficiary_id = app.get_user_beneficiary_id()
    )
    WITH CHECK (
        -- Only admins can insert/update withdrawal records
        app.is_admin()
    );

-- ============================================================
-- VERIFY
-- ============================================================
-- After applying, confirm policies exist:
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
