-- Make activity_log immutable: remove UPDATE/DELETE, restrict INSERT to own userId
-- Applied manually via psql or Neon SQL Editor (NOT via db:push -- Drizzle has bugs with RLS policies)

DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON activity_log;
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON activity_log;
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON activity_log;

CREATE POLICY "audit-insert-own-user" ON activity_log
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (changed_by = app.effective_user_id());

-- NOTE: Do NOT add FORCE ROW LEVEL SECURITY.
-- neondb_owner must bypass RLS for system audit inserts (recordAuthEvent for anonymous/failed auth).
