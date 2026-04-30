-- RBAC: extend UserRole enum with 'trustee' and 'arbiter'.
-- ALTER TYPE ... ADD VALUE works inside a transaction since PG12 as long as
-- the new value is not used in the same transaction. The role assignments live
-- in a follow-up migration to avoid that constraint.
ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'trustee';--> statement-breakpoint
ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'arbiter';--> statement-breakpoint

-- Treat trust-administrative roles (admin, trustee, arbiter) the same in RLS.
-- Beneficiary keeps row-scoped access via app.get_user_beneficiary_id().
CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profile
        WHERE user_profile.user_id = app.effective_user_id()
        AND user_profile.role IN ('admin', 'trustee', 'arbiter')
    )
$$;
