/**
 * Generic CRUD Factory
 *
 * Creates reusable CRUD operations for any Drizzle table,
 * eliminating duplicate code across entity queries.
 */
import { eq, sql } from "drizzle-orm";
import { type PgTable, type TableConfig } from "drizzle-orm/pg-core";
import { db } from "./index";
import { generateId } from "./helpers";

interface CrudOptions {
  /** Column name to filter by (e.g., "entityId") */
  filterColumn?: string;
  /** Whether table has updatedAt column */
  hasUpdatedAt?: boolean;
}

interface PaginationOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Whether to include total count in response */
  includeTotalCount?: boolean;
}

interface PaginatedResult<T> {
  /** Array of data records */
  data: T[];
  /** Total count of matching records (if includeTotalCount=true) */
  totalCount?: number;
  /** Limit used in query */
  limit?: number;
  /** Offset used in query */
  offset?: number;
  /** Whether more records exist beyond current page */
  hasMore?: boolean;
}

/**
 * Creates standard CRUD operations for a table
 */
export function createCrud<
  T extends PgTable<TableConfig>,
  Insert = T["$inferInsert"],
  Select = T["$inferSelect"]
>(table: T, options: CrudOptions = {}) {
  const { filterColumn, hasUpdatedAt = true } = options;

  return {
    /**
     * Get all records, optionally filtered and paginated
     */
    async getAll(
      filterValue?: string,
      pagination?: PaginationOptions
    ): Promise<Select[] | PaginatedResult<Select>> {
      // If no pagination options, return simple array (backward compatible)
      if (!pagination || (!pagination.limit && !pagination.includeTotalCount)) {
        if (filterValue && filterColumn) {
          const results = await db
            .select()
            .from(table as any)
            .where(eq((table as any)[filterColumn], filterValue));
          return results;
        }
        const results = await db.select().from(table as any);
        return results;
      }

      // Paginated query
      const { limit, offset = 0, includeTotalCount } = pagination;

      // Get total count if requested (separate query)
      let totalCount: number | undefined;
      if (includeTotalCount) {
        if (filterValue && filterColumn) {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(table as any)
            .where(eq((table as any)[filterColumn], filterValue));
          totalCount = countResult[0] ? Number(countResult[0].count) : 0;
        } else {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(table as any);
          totalCount = countResult[0] ? Number(countResult[0].count) : 0;
        }
      }

      // Get paginated data
      let data: Select[];
      if (filterValue && filterColumn) {
        const query = db
          .select()
          .from(table as any)
          .where(eq((table as any)[filterColumn], filterValue));

        data = await (limit ? query.limit(limit).offset(offset) : query);
      } else {
        const query = db.select().from(table as any);
        data = await (limit ? query.limit(limit).offset(offset) : query);
      }

      return {
        data,
        totalCount,
        limit,
        offset,
        hasMore: totalCount !== undefined ? offset + data.length < totalCount : undefined,
      };
    },

    /**
     * Get a single record by ID
     */
    async getById(id: string): Promise<Select | undefined> {
      const results = await db
        .select()
        .from(table as any)
        .where(eq((table as any).id, id));
      return results[0];
    },

    /**
     * Create a new record
     */
    async create(data: Insert): Promise<Select> {
      const values = {
        ...data,
        id: (data as any).id || generateId(),
        ...(hasUpdatedAt && { updatedAt: new Date().toISOString() }),
      };
      const [created] = await db
        .insert(table)
        .values(values as any)
        .returning();
      return created as Select;
    },

    /**
     * Update a record by ID
     */
    async update(id: string, data: Partial<Insert>): Promise<Select | undefined> {
      const values = {
        ...data,
        ...(hasUpdatedAt && { updatedAt: new Date().toISOString() }),
      };
      const [updated] = await db
        .update(table)
        .set(values as any)
        .where(eq((table as any).id, id))
        .returning();
      return updated as Select | undefined;
    },

    /**
     * Delete a record by ID
     */
    async delete(id: string): Promise<Select | undefined> {
      const [deleted] = await db
        .delete(table)
        .where(eq((table as any).id, id))
        .returning();
      return deleted as Select | undefined;
    },
  };
}

/**
 * Type for CRUD operations
 */
export type CrudOperations<
  T extends PgTable<TableConfig>,
  Insert = T["$inferInsert"],
  Select = T["$inferSelect"]
> = {
  getAll: (
    filterValue?: string,
    pagination?: PaginationOptions
  ) => Promise<Select[] | PaginatedResult<Select>>;
  getById: (id: string) => Promise<Select | undefined>;
  create: (data: Insert) => Promise<Select>;
  update: (id: string, data: Partial<Insert>) => Promise<Select | undefined>;
  delete: (id: string) => Promise<Select | undefined>;
};

/**
 * Export pagination types for external use
 */
export type { PaginationOptions, PaginatedResult };
