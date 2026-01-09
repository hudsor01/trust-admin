import { describe, expect, test } from "bun:test";
import { entityCrud, taskCrud } from "../db/queries";

describe("CRUD Pagination", () => {
  test("getAll without pagination returns array", async () => {
    const result = await entityCrud.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  test("getAll with limit returns paginated result", async () => {
    const result = await entityCrud.getAll(undefined, { limit: 1 });

    // Check it's a paginated result
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("limit", 1);
    expect(result).toHaveProperty("offset", 0);
    expect(Array.isArray((result as any).data)).toBe(true);
  });

  test("getAll with total count includes count", async () => {
    const result = await entityCrud.getAll(undefined, {
      limit: 1,
      includeTotalCount: true,
    });

    // Check paginated result with count
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("totalCount");
    expect(typeof (result as any).totalCount).toBe("number");
    expect(result).toHaveProperty("hasMore");
  });

  test("getAll with filter and pagination works", async () => {
    // Get entities first to find a valid entity ID
    const entities = await entityCrud.getAll();

    if (Array.isArray(entities) && entities.length > 0) {
      const entityId = entities[0].id;

      // Test filtered pagination on tasks
      const result = await taskCrud.getAll(entityId, {
        limit: 10,
        offset: 0,
        includeTotalCount: true,
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray((result as any).data)).toBe(true);
      expect(result).toHaveProperty("totalCount");
      expect(typeof (result as any).totalCount).toBe("number");
    }
  });

  test("pagination hasMore calculation works correctly", async () => {
    const result = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 0,
      includeTotalCount: true,
    });

    if (result && typeof result === "object" && "totalCount" in result) {
      const totalCount = result.totalCount!;
      const hasMore = result.hasMore;

      // If there are 2+ entities, hasMore should be true with limit=1
      if (totalCount >= 2) {
        expect(hasMore).toBe(true);
      }

      // If there's only 1 entity, hasMore should be false
      if (totalCount === 1) {
        expect(hasMore).toBe(false);
      }
    }
  });

  test("pagination offset works correctly", async () => {
    const firstPage = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 0,
    });

    const secondPage = await entityCrud.getAll(undefined, {
      limit: 1,
      offset: 1,
    });

    // Both should be paginated results
    expect(firstPage).toHaveProperty("data");
    expect(secondPage).toHaveProperty("data");

    // If there are 2+ entities, IDs should be different
    if (
      Array.isArray((firstPage as any).data) &&
      (firstPage as any).data.length > 0 &&
      Array.isArray((secondPage as any).data) &&
      (secondPage as any).data.length > 0
    ) {
      const firstId = (firstPage as any).data[0].id;
      const secondId = (secondPage as any).data[0].id;

      // Only assert different if we have at least 2 entities
      if ((firstPage as any).data.length >= 1 && (secondPage as any).data.length >= 1) {
        expect(firstId).not.toBe(secondId);
      }
    }
  });
});
