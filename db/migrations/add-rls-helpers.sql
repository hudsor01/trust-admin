-- RLS helper functions for Neon Authorize policies.
-- auth.user_id() is provided by Neon Authorize — returns the JWT sub claim (user UUID).
--
-- Apply once: run in Drizzle Studio query runner or psql.

-- Returns true if the current JWT user is an admin (per user_profile table).
CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profile
        WHERE user_profile.user_id = auth.user_id()
        AND user_profile.role = 'admin'
    )
$$;

-- Returns the beneficiary ID linked to the current JWT user, or NULL if none.
CREATE OR REPLACE FUNCTION app.get_user_beneficiary_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT user_profile.beneficiary_id
    FROM user_profile
    WHERE user_profile.user_id = auth.user_id()
    LIMIT 1
$$;
