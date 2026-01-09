/**
 * Query Hook Factory
 *
 * Creates reusable data fetching hooks with consistent patterns:
 * - Loading states
 * - Error handling
 * - Automatic refetch
 * - CRUD operations
 * - Request deduplication
 * - In-memory caching
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// ============================================================================
// Request Deduplication & Caching
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>; // For deduplicating concurrent requests
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(url: string): string {
  return url;
}

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function getOrCreatePromise<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);

  // If there's a pending promise, return it (deduplication)
  if (entry?.promise) {
    return entry.promise;
  }

  // Create new promise
  const promise = fetcher().then(
    (data) => {
      // Store result in cache
      setCachedData(key, data);
      // Clear promise from cache entry
      const entry = cache.get(key);
      if (entry) {
        delete entry.promise;
      }
      return data;
    },
    (error) => {
      // On error, remove promise so next attempt can retry
      cache.delete(key);
      throw error;
    }
  );

  // Store promise for deduplication
  cache.set(key, {
    data: null as any,
    timestamp: Date.now(),
    promise,
  });

  return promise;
}

/**
 * Invalidate cached data for a URL pattern
 * Use after mutations to ensure fresh data on next fetch
 */
export function invalidateCache(urlPattern?: string): void {
  if (!urlPattern) {
    // Clear entire cache
    cache.clear();
    return;
  }

  // Clear matching entries
  for (const [key] of cache) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear entire cache (for testing)
 */
export function clearCache(): void {
  cache.clear();
}

interface UseQueryOptions<T> {
  /** Query parameter name for filtering (e.g., "entityId") */
  filterParam?: string;
  /** Sort function to apply to results */
  sortFn?: (data: T[]) => T[];
  /** Transform function to apply to results */
  transform?: (data: T[]) => T[];
  /** Fetch on mount (default: true) */
  fetchOnMount?: boolean;
  /** Enable pagination (default: false) */
  enablePagination?: boolean;
  /** Page size for pagination (default: 20) */
  pageSize?: number;
}

interface UseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (item: Partial<T>) => Promise<T>;
  update: (id: string, item: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  // Pagination state (only when enablePagination=true)
  currentPage?: number;
  totalCount?: number;
  setPage?: (page: number) => void;
}

/**
 * Creates a reusable query hook for an API endpoint
 *
 * @example
 * // Define the hook
 * export const useVehicles = createQueryHook<Vehicle>('/api/vehicles', {
 *   filterParam: 'entityId',
 * });
 *
 * // Use in component
 * const { data, loading, create, update, remove } = useVehicles(entityId);
 */
export function createQueryHook<T extends { id: string }>(
  endpoint: string,
  options: UseQueryOptions<T> = {}
) {
  const {
    filterParam,
    sortFn,
    transform,
    fetchOnMount = true,
    enablePagination = false,
    pageSize = 20,
  } = options;

  return function useQuery(filterValue?: string): UseQueryResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const buildUrl = useCallback(() => {
      const params = new URLSearchParams();

      if (filterValue && filterParam) {
        params.append(filterParam, filterValue);
      }

      if (enablePagination) {
        params.append("limit", String(pageSize));
        params.append("offset", String((currentPage - 1) * pageSize));
        params.append("includeTotalCount", "true");
      }

      return params.toString() ? `${endpoint}?${params}` : endpoint;
    }, [filterValue, currentPage]);

    const refetch = useCallback(async () => {
    const url = buildUrl();
    const cacheKey = getCacheKey(url);

    // Check cache first
    const cachedData = getCachedData<T[]>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch with deduplication
    setLoading(true);
    setError(null);
    
    try {
      const result = await getOrCreatePromise(cacheKey, async () => {
        const res = await fetch(url);
        if (!res.ok) {
          // Try to parse error response from API
          let errorData;
          try {
            errorData = await res.json();
          } catch (parseError) {
            // Failed to parse JSON response
            toast.error("Failed to fetch data", {
              description: `Server returned ${res.status}`,
            });
            throw new Error(`Failed to fetch: ${res.status}`);
          }

          // Show error toast based on parsed error
          if (errorData.error) {
            // Handle validation errors with field details
            if (errorData.error.code === "VALIDATION_ERROR" && errorData.error.details?.fields) {
              const fields = errorData.error.details.fields as Record<string, string>;
              const fieldErrors = Object.entries(fields)
                .map(([field, message]) => `${field}: ${message}`)
                .join("\n");
              toast.error(errorData.error.message, { description: fieldErrors });
            } else {
              toast.error(errorData.error.message);
            }
            throw new Error(errorData.error.message);
          }

          // Generic error if no error object in response
          toast.error("Failed to fetch data", {
            description: `Server returned ${res.status}`,
          });
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        let result = await res.json();
        
        // Handle paginated vs non-paginated responses
        if (enablePagination && result && typeof result === "object" && "data" in result) {
          // Paginated response
          let data = result.data;
          if (sortFn) data = sortFn(data);
          if (transform) data = transform(data);
          return { data, totalCount: result.totalCount };
        } else {
          // Non-paginated response
          if (sortFn) result = sortFn(result);
          if (transform) result = transform(result);
          return result;
        }
      });
      
      // Set data based on response type
      if (enablePagination && result && typeof result === "object" && "data" in result) {
        setData(result.data);
        if (result.totalCount !== undefined) {
          setTotalCount(result.totalCount);
        }
      } else {
        setData(result as T[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      // Network errors (not handled by response parsing above)
      if (err instanceof Error && err.message.includes("fetch")) {
        toast.error("Network Error", {
          description: "Unable to connect to the server. Please check your connection.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

    const create = useCallback(async (item: Partial<T>): Promise<T> => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        // Parse error response
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          // Failed to parse JSON response
          toast.error("Failed to create", {
            description: `Server returned ${res.status}`,
          });
          throw new Error(`Failed to create: ${res.status}`);
        }

        // Show error toast based on parsed error
        if (errorData.error) {
          // Handle validation errors with field details
          if (errorData.error.code === "VALIDATION_ERROR" && errorData.error.details?.fields) {
            const fields = errorData.error.details.fields as Record<string, string>;
            const fieldErrors = Object.entries(fields)
              .map(([field, message]) => `${field}: ${message}`)
              .join("\n");
            toast.error(errorData.error.message, { description: fieldErrors });
          } else {
            toast.error(errorData.error.message);
          }
          throw new Error(errorData.error.message);
        }

        // Generic error if no error object in response
        toast.error("Failed to create", {
          description: `Server returned ${res.status}`,
        });
        throw new Error(`Failed to create: ${res.status}`);
      }
      const created = await res.json();
      setData((prev) => {
        const updated = [...prev, created];
        return sortFn ? sortFn(updated) : updated;
      });
      // Invalidate cache after successful create
      invalidateCache(endpoint);
      return created;
    }, []);

    const update = useCallback(async (id: string, item: Partial<T>): Promise<T> => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        // Parse error response
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          // Failed to parse JSON response
          toast.error("Failed to update", {
            description: `Server returned ${res.status}`,
          });
          throw new Error(`Failed to update: ${res.status}`);
        }

        // Show error toast based on parsed error
        if (errorData.error) {
          // Handle validation errors with field details
          if (errorData.error.code === "VALIDATION_ERROR" && errorData.error.details?.fields) {
            const fields = errorData.error.details.fields as Record<string, string>;
            const fieldErrors = Object.entries(fields)
              .map(([field, message]) => `${field}: ${message}`)
              .join("\n");
            toast.error(errorData.error.message, { description: fieldErrors });
          } else {
            toast.error(errorData.error.message);
          }
          throw new Error(errorData.error.message);
        }

        // Generic error if no error object in response
        toast.error("Failed to update", {
          description: `Server returned ${res.status}`,
        });
        throw new Error(`Failed to update: ${res.status}`);
      }
      const updated = await res.json();
      setData((prev) => {
        const newData = prev.map((item) => (item.id === id ? updated : item));
        return sortFn ? sortFn(newData) : newData;
      });
      // Invalidate cache after successful update
      invalidateCache(endpoint);
      return updated;
    }, []);

    const remove = useCallback(async (id: string): Promise<void> => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Parse error response
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          // Failed to parse JSON response
          toast.error("Failed to delete", {
            description: `Server returned ${res.status}`,
          });
          throw new Error(`Failed to delete: ${res.status}`);
        }

        // Show error toast based on parsed error
        if (errorData.error) {
          toast.error(errorData.error.message);
          throw new Error(errorData.error.message);
        }

        // Generic error if no error object in response
        toast.error("Failed to delete", {
          description: `Server returned ${res.status}`,
        });
        throw new Error(`Failed to delete: ${res.status}`);
      }
      setData((prev) => prev.filter((item) => item.id !== id));
      // Invalidate cache after successful delete
      invalidateCache(endpoint);
    }, []);

    const setPage = useCallback((page: number) => {
      setCurrentPage(page);
    }, []);

    useEffect(() => {
      if (fetchOnMount) {
        // For filtered queries, only fetch when filter value is provided
        if (filterParam && !filterValue) {
          setLoading(false);
          return;
        }
        refetch();
      }
    }, [refetch, fetchOnMount, filterValue, currentPage]);

    return {
      data,
      loading,
      error,
      refetch,
      create,
      update,
      remove,
      setData,
      ...(enablePagination && {
        currentPage,
        totalCount,
        setPage,
      }),
    };
  };
}

/**
 * Creates a simple fetch function (not a hook) for one-off fetches
 */
export function createFetcher<T>(endpoint: string) {
  return async (filterParam?: string, filterValue?: string): Promise<T[]> => {
    const url = filterParam && filterValue
      ? `${endpoint}?${filterParam}=${filterValue}`
      : endpoint;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    return res.json();
  };
}
