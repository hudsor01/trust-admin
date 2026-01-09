/**
 * Query Hook Factory
 *
 * Creates reusable data fetching hooks with consistent patterns:
 * - Loading states
 * - Error handling
 * - Automatic refetch
 * - CRUD operations
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface UseQueryOptions<T> {
  /** Query parameter name for filtering (e.g., "entityId") */
  filterParam?: string;
  /** Sort function to apply to results */
  sortFn?: (data: T[]) => T[];
  /** Transform function to apply to results */
  transform?: (data: T[]) => T[];
  /** Fetch on mount (default: true) */
  fetchOnMount?: boolean;
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
  const { filterParam, sortFn, transform, fetchOnMount = true } = options;

  return function useQuery(filterValue?: string): UseQueryResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const buildUrl = useCallback(() => {
      if (filterValue && filterParam) {
        return `${endpoint}?${filterParam}=${filterValue}`;
      }
      return endpoint;
    }, [filterValue]);

    const refetch = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl());
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
        if (sortFn) result = sortFn(result);
        if (transform) result = transform(result);
        setData(result);
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
    }, [refetch, fetchOnMount, filterValue]);

    return { data, loading, error, refetch, create, update, remove, setData };
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
