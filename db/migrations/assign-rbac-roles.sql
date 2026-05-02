-- Assign app roles to Neon Auth users.
--
-- Status: APPLY MANUALLY. This script is idempotent: rows that don't yet
-- have a neon_auth.user are skipped, so it's safe to run before/after
-- creating accounts via the /users admin page.
--
-- BEFORE RUNNING: replace every TODO-… placeholder in the VALUES list
-- below with the real address. The DO block raises an exception if any
-- placeholder is left in place, so a careless apply does NOT silently
-- leave roles unassigned.
--
-- The owner email (rhudsontspr@gmail.com) is always admin via the
-- ADMIN_EMAIL override in tRPC, but we still write 'admin' to
-- user_profile so RLS (`app.is_admin()`) sees it.

DO $$
DECLARE
    assignments record;
    target_user_id text;
    placeholder_count int;
BEGIN
    -- Pre-flight: bail out before any inserts if placeholders remain. The DO
    -- block is one transaction so a late RAISE EXCEPTION would technically
    -- roll real inserts back, but the surfaced log would show "assigned …"
    -- followed by an exception — confusing on read. Scanning first keeps the
    -- failure mode honest.
    SELECT count(*) INTO placeholder_count
    FROM (VALUES
        ('rhudsontspr@gmail.com'),
        ('TODO-rick-brown@example.com'),
        ('TODO-ashley-govea@example.com'),
        ('TODO-domineek-govea@example.com')
    ) AS t(email)
    WHERE email LIKE 'TODO-%';

    IF placeholder_count > 0 THEN
        RAISE EXCEPTION 'assign-rbac-roles: % TODO placeholder email(s) still present — edit the VALUES list and re-run', placeholder_count;
    END IF;

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
