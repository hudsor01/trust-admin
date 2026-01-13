import { toast } from "sonner"
import { ApiError } from "@/lib/api-error"

/**
 * Hook for displaying user-friendly error notifications
 * Handles both ApiError and generic Error objects
 */
export function useToastError() {
  const showError = (error: unknown) => {
    // Handle ApiError with structured error data
    if (error instanceof ApiError) {
      // Check for validation errors with field details
      if (error.code === "VALIDATION_ERROR" && error.details?.fields) {
        const fields = error.details.fields as Record<string, string>
        const fieldErrors = Object.entries(fields)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n")

        toast.error(error.message, {
          description: fieldErrors,
        })
        return
      }

      // Show regular ApiError
      toast.error(error.message, {
        description: error.code !== "INTERNAL_ERROR" ? `Error: ${error.code}` : undefined,
      })
      return
    }

    // Handle generic Error objects
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes("fetch") || error.message.includes("network")) {
        toast.error("Network Error", {
          description: "Unable to connect to the server. Please check your connection.",
        })
        return
      }

      // Show generic error message
      toast.error("Error", {
        description: error.message || "An unexpected error occurred",
      })
      return
    }

    // Handle unknown error types
    toast.error("Error", {
      description: "An unexpected error occurred. Please try again.",
    })
  }

  return { showError }
}
