import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Verify activity_log RLS policies are immutable: SELECT + INSERT only, no UPDATE/DELETE. */

const schemaPath = resolve(import.meta.dir, '../../db/schema.ts')
const migrationPath = resolve(
    import.meta.dir,
    '../../db/migrations/004_immutable_activity_log.sql',
)

describe('activity_log immutable RLS policies', () => {
    describe('schema.ts policy definitions', () => {
        const schemaSource = readFileSync(schemaPath, 'utf-8')

        // Extract the activityLog table definition section
        const activityLogStart = schemaSource.indexOf(
            "export const activityLog = pgTable(",
        )
        const activityLogEnd = schemaSource.indexOf(
            ').enableRLS()',
            activityLogStart,
        )
        const activityLogSection = schemaSource.slice(
            activityLogStart,
            activityLogEnd + 50,
        )

        test('contains audit-insert-own-user policy name', () => {
            expect(activityLogSection).toContain('audit-insert-own-user')
        })

        test('INSERT policy uses withCheck constraint', () => {
            expect(activityLogSection).toContain('withCheck')
        })

        test('does NOT contain crud-authenticated-policy-update', () => {
            expect(activityLogSection).not.toContain(
                'crud-authenticated-policy-update',
            )
        })

        test('does NOT contain crud-authenticated-policy-delete', () => {
            expect(activityLogSection).not.toContain(
                'crud-authenticated-policy-delete',
            )
        })

        test('retains SELECT policy (crud-authenticated-policy-select)', () => {
            expect(activityLogSection).toContain(
                'crud-authenticated-policy-select',
            )
        })

        test('has exactly 2 pgPolicy declarations', () => {
            const policyMatches = activityLogSection.match(/pgPolicy\(/g)
            expect(policyMatches).not.toBeNull()
            expect(policyMatches!.length).toBe(2)
        })
    })

    describe('migration file (004_immutable_activity_log.sql)', () => {
        test('migration file exists', () => {
            expect(existsSync(migrationPath)).toBe(true)
        })

        const migrationContent = existsSync(migrationPath)
            ? readFileSync(migrationPath, 'utf-8')
            : ''

        test('drops UPDATE policy', () => {
            expect(migrationContent).toContain(
                'DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON activity_log',
            )
        })

        test('drops DELETE policy', () => {
            expect(migrationContent).toContain(
                'DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON activity_log',
            )
        })

        test('drops old INSERT policy', () => {
            expect(migrationContent).toContain(
                'DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON activity_log',
            )
        })

        test('creates audit-insert-own-user policy with WITH CHECK', () => {
            expect(migrationContent).toContain(
                'CREATE POLICY "audit-insert-own-user" ON activity_log',
            )
            expect(migrationContent).toContain('WITH CHECK')
        })

        test('does NOT contain FORCE ROW LEVEL SECURITY', () => {
            // neondb_owner must bypass RLS for system audit inserts
            expect(migrationContent).not.toMatch(
                /^\s*ALTER TABLE.*FORCE ROW LEVEL SECURITY/m,
            )
        })
    })
})
