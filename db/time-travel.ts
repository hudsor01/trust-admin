/**
 * Neon Time Travel Queries
 *
 * Query historical database state for audit, debugging, and compliance.
 *
 * Requires:
 * - Restore window configured in Neon (default 1 day, max 7-30 days by plan)
 *
 * @see https://neon.com/docs/introduction/point-in-time-restore
 */
import { getClient, typedRows } from './index'

/**
 * Query a table as it existed at a specific point in time
 *
 * @param tableName - Name of the table to query
 * @param timestamp - Point in time (ISO string or Date)
 * @param columns - Columns to select (default: *)
 * @param where - Optional WHERE clause
 *
 * @example
 * // Get beneficiary data from 1 hour ago
 * const result = await queryAtTime('beneficiary', new Date(Date.now() - 3600000))
 *
 * @example
 * // Get specific beneficiary from yesterday
 * const result = await queryAtTime(
 *   'beneficiary',
 *   '2026-01-22T12:00:00Z',
 *   ['id', 'name', 'share_percent'],
 *   'id = 123'
 * )
 */
export async function queryAtTime<T = Record<string, unknown>>(
    tableName: string,
    timestamp: Date | string,
    columns: string[] = ['*'],
    where?: string,
): Promise<T[]> {
    const client = getClient()
    const isoTimestamp =
        timestamp instanceof Date ? timestamp.toISOString() : timestamp

    // Build the query with AS OF SYSTEM TIME
    const columnList = columns.join(', ')
    const whereClause = where ? `WHERE ${where}` : ''

    // Note: Neon uses Postgres syntax, AS OF SYSTEM TIME is the standard approach
    // This uses a transaction snapshot at the specified time
    const result = await client`
        SELECT ${client.unsafe(columnList)}
        FROM ${client.unsafe(tableName)}
        AS OF SYSTEM TIME ${isoTimestamp}
        ${client.unsafe(whereClause)}
    `

    return typedRows<T>(result)
}

/**
 * Compare current data with historical data
 *
 * @param tableName - Table to compare
 * @param timestamp - Historical point in time
 * @param idColumn - Primary key column name
 * @param id - Primary key value
 *
 * @example
 * const { current, historical, changes } = await compareWithHistory('beneficiary', '2026-01-20', 'id', 123)
 */
export async function compareWithHistory<T = Record<string, unknown>>(
    tableName: string,
    timestamp: Date | string,
    idColumn: string,
    id: number | string,
): Promise<{
    current: T | null
    historical: T | null
    changes: Array<{ field: string; was: unknown; now: unknown }>
}> {
    const client = getClient()
    const isoTimestamp =
        timestamp instanceof Date ? timestamp.toISOString() : timestamp

    // Get current data
    const [current] = await client`
        SELECT * FROM ${client.unsafe(tableName)}
        WHERE ${client.unsafe(idColumn)} = ${id}
    `

    // Get historical data
    const [historical] = await client`
        SELECT * FROM ${client.unsafe(tableName)}
        AS OF SYSTEM TIME ${isoTimestamp}
        WHERE ${client.unsafe(idColumn)} = ${id}
    `

    // Calculate changes
    const changes: Array<{ field: string; was: unknown; now: unknown }> = []
    if (current && historical) {
        for (const key of Object.keys(current)) {
            if (
                JSON.stringify(current[key]) !== JSON.stringify(historical[key])
            ) {
                changes.push({
                    field: key,
                    was: historical[key],
                    now: current[key],
                })
            }
        }
    }

    return {
        current: (current as T) ?? null,
        historical: (historical as T) ?? null,
        changes,
    }
}

/**
 * Get the available restore window for a branch
 *
 * @returns The earliest and latest timestamps available for time travel queries
 */
export async function getRestoreWindow(): Promise<{
    earliest: Date
    latest: Date
    windowHours: number
}> {
    // Note: This is an approximation based on Neon's restore window
    // The actual window depends on your plan:
    // - Free: 6 hours
    // - Launch: up to 7 days
    // - Scale: up to 30 days

    const latest = new Date()
    // Default to 24 hours (adjust based on your actual Neon plan configuration)
    const windowHours = 24
    const earliest = new Date(latest.getTime() - windowHours * 60 * 60 * 1000)

    return { earliest, latest, windowHours }
}
