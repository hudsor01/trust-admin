import { toast } from 'sonner'
import { ApiError } from '@/lib/api-error'

/** Displays user-friendly toast notifications for ApiError, Error, and unknown error types. */
export function useToastError() {
    const showError = (error: unknown) => {
        if (error instanceof ApiError) {
            if (error.code === 'VALIDATION_ERROR' && error.details?.fields) {
                const fields = error.details.fields as Record<string, string>
                const fieldErrors = Object.entries(fields)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join('\n')

                toast.error(error.message, {
                    description: fieldErrors,
                })
                return
            }

            toast.error(error.message, {
                description:
                    error.code !== 'INTERNAL_ERROR'
                        ? `Error: ${error.code}`
                        : undefined,
            })
            return
        }

        if (error instanceof Error) {
            if (
                error.message.includes('fetch') ||
                error.message.includes('network')
            ) {
                toast.error('Network Error', {
                    description:
                        'Unable to connect to the server. Please check your connection.',
                })
                return
            }

            toast.error('Error', {
                description: error.message || 'An unexpected error occurred',
            })
            return
        }

        toast.error('Error', {
            description: 'An unexpected error occurred. Please try again.',
        })
    }

    return { showError }
}
