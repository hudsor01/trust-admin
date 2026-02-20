/**
 * Row-Level Security (RLS) Patterns
 *
 * Policies are ACTIVE on: beneficiary, distribution, hems_request, withdrawal_record
 * Applied via: db/migrations/add-rls-helpers.sql + db/migrations/add-rls-policies.sql
 *
 * How it works:
 * - tRPC context fetches JWT → setRequestAuthToken() → Neon Authorize validates JWT
 * - Queries run as `authenticated` role → app.is_admin() / app.get_user_beneficiary_id() used in policies
 * - getPublicDb() / neondb_owner → BYPASSRLS (admin system queries, bootstrap)
 *
 * Two-layer isolation:
 * 1. Application layer — all beneficiaryProcedure queries scope by ctx.user.beneficiaryId
 * 2. Database layer — these RLS policies as a backstop (defense in depth)
 *
 * @see https://orm.drizzle.team/docs/rls
 */

import { sql } from 'drizzle-orm'
import { pgPolicy, pgRole } from 'drizzle-orm/pg-core'

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Application roles for RLS policies
 *
 * Note: Use .existing() for roles managed outside Drizzle (e.g., by Supabase/Neon)
 */

// Admin role - full access
export const adminRole = pgRole('admin', {
    createRole: false,
    createDb: false,
    inherit: true,
})

// Trustee role - access to assigned trusts
export const trusteeRole = pgRole('trustee', {
    createRole: false,
    createDb: false,
    inherit: true,
})

// Beneficiary role - limited read access
export const beneficiaryRole = pgRole('beneficiary_user', {
    createRole: false,
    createDb: false,
    inherit: true,
})

// Read-only role for auditors
export const auditorRole = pgRole('auditor', {
    createRole: false,
    createDb: false,
    inherit: true,
})

// =============================================================================
// POLICY PATTERNS
// =============================================================================

/**
 * Example: Entity access policy
 *
 * Trustees can only see entities they are assigned to.
 * Admin can see all entities.
 */
export const entityAccessPolicy = pgPolicy('entity_access_policy', {
    as: 'permissive',
    for: 'select',
    to: trusteeRole,
    using: sql`
    EXISTS (
      SELECT 1 FROM "Trustee" t
      WHERE t."entityId" = "Entity".id
      AND t."contactId" = current_setting('app.current_user_id')::uuid
      AND t.status = 'ACTIVE'
    )
  `,
})

/**
 * Example: Beneficiary data access policy
 *
 * Beneficiaries can only see their own records.
 */
export const beneficiaryAccessPolicy = pgPolicy('beneficiary_self_access', {
    as: 'permissive',
    for: 'select',
    to: beneficiaryRole,
    using: sql`id = current_setting('app.current_user_id')::uuid`,
})

/**
 * Example: Admin full access policy
 *
 * Admin role has unrestricted access.
 */
export const adminFullAccessPolicy = pgPolicy('admin_full_access', {
    as: 'permissive',
    for: 'all',
    to: adminRole,
    using: sql`true`,
    withCheck: sql`true`,
})

/**
 * Example: Auditor read-only policy
 *
 * Auditors can read all data but cannot modify.
 */
export const auditorReadOnlyPolicy = pgPolicy('auditor_read_only', {
    as: 'permissive',
    for: 'select',
    to: auditorRole,
    using: sql`true`,
})

// =============================================================================
// IMPLEMENTATION GUIDE
// =============================================================================

/**
 * To enable RLS on a table:
 *
 * 1. Add .enableRLS() to table definition:
 *    ```typescript
 *    export const entity = pgTable("Entity", {
 *      // columns...
 *    }).enableRLS();
 *    ```
 *
 * 2. Or use pgTable.withRLS():
 *    ```typescript
 *    export const entity = pgTable.withRLS("Entity", {
 *      // columns...
 *    });
 *    ```
 *
 * 3. Link policies to tables:
 *    ```typescript
 *    entityAccessPolicy.link(entity);
 *    adminFullAccessPolicy.link(entity);
 *    ```
 *
 * 4. Set current user context in application:
 *    ```sql
 *    SET app.current_user_id = 'user-uuid-here';
 *    ```
 *
 * 5. Configure drizzle.config.ts for role management:
 *    ```typescript
 *    export default defineConfig({
 *      // ...
 *      entities: {
 *        roles: true
 *      }
 *    });
 *    ```
 */

// =============================================================================
// SUPABASE / NEON INTEGRATION
// =============================================================================

/**
 * For Supabase integration:
 *
 * ```typescript
 * import { authenticatedRole, authUid } from "drizzle-orm/supabase";
 *
 * export const entityPolicy = pgPolicy("authenticated_entity_access", {
 *   for: "select",
 *   to: authenticatedRole,
 *   using: sql`auth.uid() = owner_id`,
 * });
 * ```
 *
 * For Neon integration:
 *
 * ```typescript
 * import { authenticatedRole, authUid } from "drizzle-orm/neon";
 *
 * export const entityPolicy = pgPolicy("authenticated_entity_access", {
 *   for: "select",
 *   to: authenticatedRole,
 *   using: authUid(entity.ownerId),
 * });
 * ```
 */

// =============================================================================
// MIGRATION NOTES
// =============================================================================

/**
 * When adding RLS to existing tables:
 *
 * 1. Create roles first
 * 2. Add policies that allow existing operations
 * 3. Enable RLS on tables (this will start enforcing policies)
 * 4. Test thoroughly with each role
 * 5. Add restrictive policies as needed
 *
 * IMPORTANT: Enabling RLS without proper policies will block all access!
 */
