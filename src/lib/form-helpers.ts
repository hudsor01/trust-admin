/** Extract error message from TanStack Form field state (handles string and object errors). */
export function getFieldError(field: {
    state: { meta: { errors?: unknown[] } }
}): string | null {
    const errors = field.state.meta.errors
    if (!errors || errors.length === 0) return null

    const firstError = errors[0]

    if (typeof firstError === 'string') {
        return firstError
    }

    if (
        firstError &&
        typeof firstError === 'object' &&
        'message' in firstError
    ) {
        const message = (firstError as { message: unknown }).message
        return typeof message === 'string' ? message : String(message)
    }

    return String(firstError)
}
