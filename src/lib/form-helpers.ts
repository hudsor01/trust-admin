/**
 * Form helper utilities for type-safe field error handling
 */

/**
 * Safely extract error message from TanStack Form field state
 * Handles both string errors and structured error objects with message property
 */
export function getFieldError(field: {
    state: { meta: { errors?: unknown[] } }
}): string | null {
    const errors = field.state.meta.errors
    if (!errors || errors.length === 0) return null

    const firstError = errors[0]

    // Handle string errors
    if (typeof firstError === 'string') {
        return firstError
    }

    // Handle error objects with message property
    if (
        firstError &&
        typeof firstError === 'object' &&
        'message' in firstError
    ) {
        const message = (firstError as { message: unknown }).message
        return typeof message === 'string' ? message : String(message)
    }

    // Fallback to stringifying the error
    return String(firstError)
}

/**
 * Check if a field has any errors
 */
export function hasFieldError(field: {
    state: { meta: { errors?: unknown[] } }
}): boolean {
    return Boolean(
        field.state.meta.errors && field.state.meta.errors.length > 0,
    )
}
