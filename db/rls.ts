/**
 * Row-Level Security (RLS) — Live Configuration Reference
 *
 * THIS FILE IS DOCUMENTATION ONLY — no Drizzle pgRole/pgPolicy objects are used here.
 * All policies are managed via raw SQL in db/migrations/.
 *
 * ============================================================
 * HOW IT WORKS
 * ============================================================
 *
 * Every tRPC request that carries a session token calls setRequestAuthToken(jwt).
 * This causes Neon Authorize to validate the JWT and run the query as the
 * `authenticated` role. RLS policies then filter rows based on the user's identity.
 *
 * Without a token (public procedures, system queries, seeds), getPublicDb() is
 * used — which connects as neondb_owner (BYPASSRLS), bypassing all policies.
 *
 * ============================================================
 * ROLES
 * ============================================================
 *
 * | Role          | BYPASSRLS | Notes                                        |
 * |---------------|-----------|----------------------------------------------|
 * | neondb_owner  | YES       | Used by getPublicDb() — system queries, seeds |
 * | authenticated | NO        | All signed-in users — policies enforced      |
 * | anonymous     | NO        | Unauthenticated Neon Authorize requests       |
 * | authenticator | NO        | Neon Authorize internal role                  |
 *
 * ============================================================
 * APP SCHEMA FUNCTIONS (policy helpers)
 * ============================================================
 *
 * All functions are STABLE SECURITY DEFINER in the `app` schema.
 *
 * app.effective_user_id() → text
 *   Returns auth.user_id() in production, or app.test_user_id setting in test mode.
 *
 * app.is_admin() → boolean
 *   Returns true if the current user holds a trust-administrative role
 *   ('admin', 'trustee', or 'arbiter') in user_profile. The function name
 *   is preserved for policy compatibility — it gates the same set of
 *   admin-only tables. Only the literal 'admin' role grants user
 *   management access (enforced in tRPC via strictAdminProcedure /
 *   ownerProcedure).
 *
 * app.get_user_beneficiary_id() → bigint
 *   Returns the beneficiary_id linked to the current user, or NULL.
 *
 * app.get_user_role() → UserRole
 *   Returns the role enum value from user_profile.
 *
 * app.user_entity_ids() → SETOF bigint
 *   Returns entity IDs accessible to the current beneficiary.
 *
 * app.set_test_user(p_user_id text) / app.clear_test_user()
 *   Set/clear app.test_user_id for use in tests (not SECURITY DEFINER).
 *
 * ============================================================
 * POLICY MAP (as of 2026-02-20)
 * ============================================================
 *
 * Tables with FORCE ROW LEVEL SECURITY (even table owner enforced):
 *   bank_account, beneficiary, distribution, entity, hems_request,
 *   homestead, investment_account, liability, trust_accounting,
 *   vehicle, withdrawal_record
 *
 * -- ADMIN-ONLY TABLES (29 tables) --
 * All four operations (SELECT/INSERT/UPDATE/DELETE) restricted to app.is_admin():
 *   activity_log, artwork, bank_account, contact, contact_association,
 *   document, entity, homestead, insurance_policy, investment_account,
 *   liability, liability_payment, pending_inventory_item, personal_property,
 *   rental_property, specific_bequest, task, transaction, trust_accounting,
 *   trustee, trustee_fee_entry, trustee_fee_schedule, valuation, vehicle
 *
 * -- BENEFICIARY-SCOPED TABLES --
 * SELECT: app.is_admin() OR [beneficiary col] = app.get_user_beneficiary_id()
 * INSERT/UPDATE/DELETE: app.is_admin() only
 *   beneficiary     (col: id)
 *   distribution    (col: "beneficiaryId")
 *   hems_request    (col: "beneficiaryId")
 *   withdrawal_record (col: "beneficiaryId")
 *
 * -- USER PROFILE --
 * user_profile:
 *   SELECT: all authenticated (true)
 *   INSERT/UPDATE/DELETE: neondb_owner only
 *
 * -- NEON-MANAGED INTERNAL TABLES (no app policy) --
 * RLS enabled, no app-level policy. Managed by Neon Auth internals.
 * The application never queries these directly.
 *   account, session, verification, user
 *
 * ============================================================
 * TWO-LAYER ISOLATION (beneficiary data)
 * ============================================================
 *
 * Layer 1 — Application (tRPC):
 *   All beneficiaryProcedure queries add WHERE beneficiaryId = ctx.user.beneficiaryId
 *
 * Layer 2 — Database (RLS):
 *   PostgreSQL enforces the same constraint via policies on the `authenticated` role.
 *   Even if layer 1 is bypassed, the DB denies cross-beneficiary access.
 *
 * ============================================================
 * MIGRATION FILES
 * ============================================================
 *
 * db/migrations/add-rls-helpers.sql   — app schema functions
 * db/migrations/add-rls-policies.sql  — all table policies
 *
 * Apply once via Drizzle Studio query runner or psql.
 * Do NOT use bun run db:push — Drizzle push does not manage raw policies.
 */
