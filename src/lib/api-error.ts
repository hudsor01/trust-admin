/** Consistent error handling for API endpoints. */

// =============================================================================
// ERROR CODES
// =============================================================================

export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'REFERENCE_ERROR'
    | 'CONFLICT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'INTERNAL_ERROR'

// =============================================================================
// API ERROR CLASS
// =============================================================================

export class ApiError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public status: number = 400,
        public details?: Record<string, unknown>,
    ) {
        super(message)
        this.name = 'ApiError'
    }

    static unauthorized(message = 'Unauthorized'): ApiError {
        return new ApiError('UNAUTHORIZED', message, 401)
    }

    static forbidden(message = 'Forbidden'): ApiError {
        return new ApiError('FORBIDDEN', message, 403)
    }
}
