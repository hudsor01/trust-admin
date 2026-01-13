import { describe, expect, test } from "bun:test"
import { entityCrud, taskCrud } from "../db/queries"

// Type guard for paginated results
function isPaginatedResult<T>(result: unknown): result is {
  data: T[]
  limit: number
  offset: number
  totalCount?: number
  hasMore?: boolean
} {
  return (
    typeof result === "object" &&
    result !== null &&
    "data" in result &&
    Array.isArray((result as Record<string, unknown>).data)
  )
}

describe("CRUD Pagination", () => {
  test("getAll without pagination returns array", async () => {
    const result = await entityCrud.getAll()
    expect(Array.isArray(result)).toBe(true)
  })

  test("getAll with limit returns paginated result", async () => {
    const result = await entityCrud.getAll(undefined, { limit: 1 })

    // Check it's a paginated result
    expect(result).toHaveProperty("data")
    expect(result).toHaveProperty("limit", 1)
    expect(result).toHaveProperty("offset", 0)
    expect(isPaginatedResult(result) && Array.isArray(result.data)).toBe(true)
  })

  test("getAll with total count includes count", async () => {
    const result = await entityCrud.getAll(undefined, {
      limit: 1,
      includeTotalCount: true,
    })

    // Check paginated result with count
    expect(result).toHaveProperty("data")
    expect(result).toHaveProperty("totalCount")
    if (isPaginatedResult(result)) {
      expect(typeof result.totalCount).toBe("number")
    }
    expect(result).toHaveProperty("hasMore")
  })

  test("getAll with filter and pagination works", async () => {
    // Get entities first to find a valid entity ID
    const entities = await entityCrud.getAll()

    if (Array.isArray(entities) && entities.length > 0) {
      const entityId = entities[0].id

      // Test filtered pagination on tasks
      const result = await taskCrud.getAll(entityId, {
        limit: 10,
        offset: 0,
        includeTotalCount: true,
      })

      expect(result).toHaveProperty("data")
      if (isPaginatedResult(result)) {
        expect(Array.isArray(result.data)).toBe(true)
        expect(result).toHaveProperty("totalCount")
        expect(typeof result.totalCount).toBe("number")
      }
    }
  })

  test("pagination hasMore calculation works correctly", async () => {
    const result = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 0,
      includeTotalCount: true,
    })

    if (result && typeof result === "object" && "totalCount" in result) {
      const totalCount = result.totalCount!
      const hasMore = result.hasMore

      // If there are 2+ entities, hasMore should be true with limit=1
      if (totalCount >= 2) {
        expect(hasMore).toBe(true)
      }

      // If there's only 1 entity, hasMore should be false
      if (totalCount === 1) {
        expect(hasMore).toBe(false)
      }
    }
  })

  test("pagination offset works correctly", async () => {
    const firstPage = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 0,
    })

    const secondPage = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 1,
    })

    // Both should be paginated results
    expect(firstPage).toHaveProperty("data")
    expect(secondPage).toHaveProperty("data")

    // If there are 2+ entities, IDs should be different
    if (
      isPaginatedResult(firstPage) &&
      firstPage.data.length > 0 &&
      isPaginatedResult(secondPage) &&
      secondPage.data.length > 0
    ) {
      const firstId = firstPage.data[0].id
      const secondId = secondPage.data[0].id

      // Only assert different if we have at least 2 entities
      if (firstPage.data.length >= 1 && secondPage.data.length >= 1) {
        expect(firstId).not.toBe(secondId)
      }
    }
  })
})
