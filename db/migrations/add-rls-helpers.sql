-- RLS helper functions for Neon Authorize policies.
-- auth.user_id() is provided by Neon Authorize — returns the JWT sub claim (user UUID).
-- app.effective_user_id() wraps auth.user_id() with test-mode support (app.test_user_id setting).
--
-- Status: APPLIED — these functions exist in the database.
-- Re-apply if functions are ever dropped.

-- Handles test mode: uses app.test_user_id if set, else auth.user_id()
CREATE OR REPLACE FUNCTION app.effective_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('app.test_user_id', true), ''),
        auth.user_id()
    )
$$;

-- Returns true if the current JWT user holds a trust-administrative role
-- (admin, trustee, or arbiter) per user_profile. Beneficiary access is
-- still scoped row-by-row via app.get_user_beneficiary_id().
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

-- Returns the beneficiary ID linked to the current JWT user, or NULL if none.
CREATE OR REPLACE FUNCTION app.get_user_beneficiary_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT beneficiary_id FROM user_profile WHERE user_id = app.effective_user_id()
$$;

-- Test helpers (set/clear app.test_user_id for unit tests without live JWT)
CREATE OR REPLACE FUNCTION app.set_test_user(p_user_id text)
RETURNS void
LANGUAGE sql
AS $$
    SELECT set_config('app.test_user_id', p_user_id, false)
$$;

CREATE OR REPLACE FUNCTION app.clear_test_user()
RETURNS void
LANGUAGE sql
AS $$
    SELECT set_config('app.test_user_id', '', false)
$$;
