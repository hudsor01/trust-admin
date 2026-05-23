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

    static notFound(resource: string, id?: string): ApiError {
        const message = id
            ? `${resource} with id '${id}' not found`
            : `${resource} not found`
        return new ApiError('NOT_FOUND', message, 404)
    }

    static validationError(
        message: string,
        fields?: Record<string, string>,
    ): ApiError {
        return new ApiError(
            'VALIDATION_ERROR',
            message,
            400,
            fields ? { fields } : undefined,
        )
    }

    static referenceError(field: string, reference: string): ApiError {
        return new ApiError(
            'REFERENCE_ERROR',
            `Referenced ${reference} not found`,
            400,
            {
                fields: { [field]: `${reference} not found` },
            },
        )
    }

    static conflict(message: string): ApiError {
        return new ApiError('CONFLICT', message, 409)
    }

    static unauthorized(message = 'Unauthorized'): ApiError {
        return new ApiError('UNAUTHORIZED', message, 401)
    }

    static forbidden(message = 'Forbidden'): ApiError {
        return new ApiError('FORBIDDEN', message, 403)
    }

    static internal(message = 'Internal server error'): ApiError {
        return new ApiError('INTERNAL_ERROR', message, 500)
    }
}
