/**
 * API Error Handling Utilities
 *
 * Provides consistent error formatting and response generation
 * for all API endpoints.
 */
import { ZodError } from "zod";
import { logger } from "./logger";
import * as Sentry from "@sentry/bun";

const log = logger.api;

// =============================================================================
// ERROR CODES
// =============================================================================

export type ErrorCode =
  | "VALIDATION_ERROR"   // Zod validation failed
  | "NOT_FOUND"          // Resource doesn't exist
  | "REFERENCE_ERROR"    // FK reference doesn't exist
  | "CONFLICT"           // Unique constraint violation
  | "UNAUTHORIZED"       // Not authenticated
  | "FORBIDDEN"          // Not authorized
  | "INTERNAL_ERROR";    // Unexpected server error

// =============================================================================
// API ERROR CLASS
// =============================================================================

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  static notFound(resource: string, id?: string): ApiError {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return new ApiError("NOT_FOUND", message, 404);
  }

  static validationError(message: string, fields?: Record<string, string>): ApiError {
    return new ApiError("VALIDATION_ERROR", message, 400, fields ? { fields } : undefined);
  }

  static referenceError(field: string, reference: string): ApiError {
    return new ApiError(
      "REFERENCE_ERROR",
      `Referenced ${reference} not found`,
      400,
      { fields: { [field]: `${reference} not found` } }
    );
  }

  static conflict(message: string): ApiError {
    return new ApiError("CONFLICT", message, 409);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError("FORBIDDEN", message, 403);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError("INTERNAL_ERROR", message, 500);
  }
}

// =============================================================================
// ZOD ERROR FORMATTING
// =============================================================================

/**
 * Converts Zod validation errors to field-level error messages
 */
export function formatZodError(error: ZodError): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const fieldName = path || "value";
    // Use first error for each field
    if (!fields[fieldName]) {
      fields[fieldName] = issue.message;
    }
  }

  const fieldCount = Object.keys(fields).length;
  const message = fieldCount === 1
    ? `Validation failed: ${Object.values(fields)[0]}`
    : `Validation failed: ${fieldCount} field(s) have errors`;

  return { message, fields };
}

// =============================================================================
// ERROR RESPONSE GENERATION
// =============================================================================

interface ErrorResponseBody {
  error: {
    message: string;
    code: ErrorCode;
    details?: Record<string, unknown>;
  };
}

/**
 * Creates a JSON Response from any error type
 */
export function errorResponse(error: unknown): Response {
  let body: ErrorResponseBody;
  let status: number;

  if (error instanceof ApiError) {
    // Capture internal errors in Sentry
    if (error.code === "INTERNAL_ERROR") {
      Sentry.captureException(error, { level: "error" });
    }

    body = {
      error: {
        message: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
    };
    status = error.status;
  } else if (error instanceof ZodError) {
    // Validation errors are expected, don't capture in Sentry
    const formatted = formatZodError(error);
    body = {
      error: {
        message: formatted.message,
        code: "VALIDATION_ERROR",
        details: { fields: formatted.fields },
      },
    };
    status = 400;
  } else if (error instanceof Error) {
    // Check for PostgreSQL unique constraint violation
    if (error.message.includes("unique constraint") || error.message.includes("duplicate key")) {
      body = {
        error: {
          message: "A record with this value already exists",
          code: "CONFLICT",
        },
      };
      status = 409;
    } else if (error.message.includes("foreign key constraint")) {
      body = {
        error: {
          message: "Referenced record does not exist",
          code: "REFERENCE_ERROR",
        },
      };
      status = 400;
    } else {
      // Log unexpected errors and capture in Sentry
      log.error("Unexpected error", { error: error.message, stack: error.stack });
      Sentry.captureException(error);

      body = {
        error: {
          message: error.message || "Internal server error",
          code: "INTERNAL_ERROR",
        },
      };
      status = 500;
    }
  } else {
    // Unknown error types should be captured in Sentry
    log.error("Unknown error type", { error: String(error) });
    Sentry.captureMessage(String(error), { level: "error" });

    body = {
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
    };
    status = 500;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// =============================================================================
// VALIDATION HELPER
// =============================================================================

import type { ZodSchema } from "zod";

/**
 * Validates data against a Zod schema, throwing ApiError on failure
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw ApiError.validationError(formatted.message, formatted.fields);
  }
  return result.data;
}

/**
 * Validates that a referenced entity exists
 * Returns unknown because we only care about existence, not the actual type
 */
export async function validateReference(
  field: string,
  id: string | null | undefined,
  getById: (id: string) => Promise<unknown | undefined>
): Promise<void> {
  if (!id) return; // null/undefined references are ok (optional FK)

  const exists = await getById(id);
  if (!exists) {
    throw ApiError.referenceError(field, field.replace(/Id$/, ""));
  }
}
