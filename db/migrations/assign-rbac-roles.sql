-- Assign app roles to Neon Auth users.
--
-- Status: APPLY MANUALLY. This script is idempotent and skips emails that
-- don't yet have a neon_auth.user row, so it's safe to run before/after
-- creating accounts via the /users admin page.
--
-- BEFORE RUNNING: replace the TODO emails below with the real addresses
-- for Rick Thomas Brown (trustee) and Ashley Govea (arbiter).
--
-- The owner email (rhudsontspr@gmail.com) is always admin via the
-- ADMIN_EMAIL override in tRPC, but we still write 'admin' to
-- user_profile so RLS (`app.is_admin()`) sees it.

DO $$
DECLARE
    assignments record;
    target_user_id text;
BEGIN
    FOR assignments IN
        SELECT * FROM (VALUES
            ('rhudsontspr@gmail.com',          'admin'::"UserRole"),
            ('TODO-rick-brown@example.com',    'trustee'::"UserRole"),
            ('TODO-ashley-govea@example.com',  'arbiter'::"UserRole"),
            ('TODO-domineek-govea@example.com','beneficiary'::"UserRole")
        ) AS t(email, role)
    LOOP
        SELECT id INTO target_user_id
        FROM neon_auth."user"
        WHERE lower(email) = lower(assignments.email)
        LIMIT 1;

        IF target_user_id IS NULL THEN
            RAISE NOTICE 'skip: no neon_auth.user for %', assignments.email;
            CONTINUE;
        END IF;

        INSERT INTO user_profile (user_id, role, force_password_change)
        VALUES (target_user_id, assignments.role, false)
        ON CONFLICT (user_id) DO UPDATE
        SET role = EXCLUDED.role,
            updated_at = now();

        RAISE NOTICE 'assigned %: % -> %', assignments.email, target_user_id, assignments.role;
    END LOOP;
END $$;
