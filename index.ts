/**
 * Trust Admin API Server
 *
 * Uses a route factory pattern to eliminate duplicate CRUD route handlers.
 */
import { validateEnvironment } from "./src/lib/env"

const _env = validateEnvironment() // Fail fast if environment is invalid

import * as Sentry from "@sentry/bun"

// Initialize Sentry for backend error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  })
  console.log("✅ Sentry initialized for backend")
} else {
  console.warn("⚠️  SENTRY_DSN not set - backend error reporting disabled")
}

import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm"
import type { PgTable, TableConfig } from "drizzle-orm/pg-core"
import { Resend } from "resend"
import type { ZodSchema } from "zod"
import { client, db } from "./db"
import type { CrudOperations } from "./db/crud-factory"
import { generateId } from "./db/helpers"
import {
  activityLogCrud,
  artworkCrud,
  bankAccountCrud,
  beneficiaryCrud,
  contactCrud,
  distributionCrud,
  // CRUD factories
  entityCrud,
  getBankAccountById,
  getBeneficiaryById,
  getDistributions,
  // Custom queries (with relations)
  getEntityById,
  getHemsRequestsWithBeneficiary,
  getHomesteadById,
  getLiabilityPayments,
  getPendingHemsRequests,
  getRentalPropertyById,
  getTrusteeFeeEntriesWithSchedule,
  getValuationsForAsset,
  getVehicleById,
  hemsRequestCrud,
  homesteadCrud,
  investmentAccountCrud,
  liabilityCrud,
  liabilityPaymentCrud,
  personalPropertyCrud,
  recordLiabilityPayment,
  rentalPropertyCrud,
  specificBequestCrud,
  taskCrud,
  trustAccountingCrud,
  trusteeCrud,
  trusteeFeeEntryCrud,
  trusteeFeeScheduleCrud,
  updateHemsRequest,
  valuationCrud,
  vehicleCrud,
  withdrawalRecordCrud,
} from "./db/queries"
import {
  type activityLog,
  artwork,
  bankAccount,
  type beneficiary,
  type contact,
  entity,
  type hemsRequest,
  homestead,
  insurancePolicy,
  investmentAccount,
  liability,
  type liabilityPayment,
  personalProperty,
  rentalProperty,
  type specificBequest,
  task,
  type trustAccounting,
  trustee,
  type trusteeFeeEntry,
  type trusteeFeeSchedule,
  vehicle,
  type withdrawalRecord,
} from "./db/schema"
import {
  insertActivityLogSchema,
  insertArtworkSchema,
  insertBankAccountSchema,
  insertBeneficiarySchema,
  insertContactSchema,
  insertDistributionSchema,
  // Insert schemas
  insertEntitySchema,
  insertHemsRequestSchema,
  insertHomesteadSchema,
  insertInsurancePolicySchema,
  insertInvestmentAccountSchema,
  insertLiabilityPaymentSchema,
  insertLiabilitySchema,
  insertPersonalPropertySchema,
  insertRentalPropertySchema,
  insertSpecificBequestSchema,
  insertTaskSchema,
  insertTrustAccountingSchema,
  insertTrusteeFeeEntrySchema,
  insertTrusteeFeeScheduleSchema,
  insertTrusteeSchema,
  insertValuationSchema,
  insertVehicleSchema,
  insertWithdrawalRecordSchema,
  updateArtworkSchema,
  updateBankAccountSchema,
  updateBeneficiarySchema,
  updateContactSchema,
  // Update schemas
  updateEntitySchema,
  updateHemsRequestSchema,
  updateHomesteadSchema,
  updateInvestmentAccountSchema,
  updateLiabilitySchema,
  updatePersonalPropertySchema,
  updateRentalPropertySchema,
  updateSpecificBequestSchema,
  updateTaskSchema,
  updateTrustAccountingSchema,
  updateTrusteeFeeEntrySchema,
  updateTrusteeSchema,
  updateVehicleSchema,
  updateWithdrawalRecordSchema,
} from "./db/validation"
import homepage from "./src/index.html"
import { ApiError, errorResponse, validateReference, validateWithSchema } from "./src/lib/api-error"
import { auth } from "./src/lib/auth"
import { logger } from "./src/lib/logger"
import { isPublicRoute, requireAdmin, requireBeneficiary } from "./src/lib/middleware"

const PORT = parseInt(
  process.env.PORT || (process.env.NODE_ENV === "production" ? "8080" : "5050"),
  10,
)
const log = logger.api
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const EMAIL_FROM = process.env.EMAIL_FROM || "Trust Admin <onboarding@resend.dev>"

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// =============================================================================
// ROUTE FACTORY
// =============================================================================

interface ReferenceConfig {
  field: string
  name: string
  getById: (id: string) => Promise<unknown>
}

interface RouteConfig {
  // biome-ignore lint/suspicious/noExplicitAny: CRUD operations are type-checked via ResourceConfig, any allows flexibility
  crud: any
  name: string
  filterParam?: string
  customGetById?: (id: string) => Promise<unknown | undefined>
  // Validation schemas
  insertSchema?: ZodSchema
  updateSchema?: ZodSchema
  // Foreign key references to validate
  references?: ReferenceConfig[]
  // Fully immutable (no update or delete - for audit logs)
  immutable?: boolean
}

/**
 * Generic resource configuration with type safety
 *
 * @template TTable - Drizzle table type (e.g., typeof entity)
 *
 * Eliminates need for `as any` casts by preserving table-specific types
 * through generic constraints. Insert/Select types are inferred from TTable.
 */
interface ResourceConfig<TTable extends PgTable<TableConfig>> {
  crud: CrudOperations<TTable, TTable["$inferInsert"], TTable["$inferSelect"]>
  name: string
  filterParam?: string
  customGetById?: (id: string) => Promise<TTable["$inferSelect"] | undefined>
  // Validation schemas
  insertSchema?: ZodSchema
  updateSchema?: ZodSchema
  // Foreign key references to validate
  references?: ReferenceConfig[]
  // Fully immutable (no update or delete - for audit logs)
  immutable?: boolean
}

/**
 * Validates all configured references exist
 */
async function validateReferences(
  data: Record<string, unknown>,
  references: ReferenceConfig[],
): Promise<void> {
  for (const ref of references) {
    const value = data[ref.field]
    if (value && typeof value === "string") {
      await validateReference(ref.field, value, ref.getById)
    }
  }
}

function createRouteHandler(config: RouteConfig) {
  const {
    crud,
    name,
    filterParam,
    customGetById,
    insertSchema,
    updateSchema,
    references,
    immutable,
  } = config
  const getById = customGetById || crud.getById

  return {
    async handleList(url: URL) {
      try {
        const filterValue = filterParam ? url.searchParams.get(filterParam) || undefined : undefined
        const items = await crud.getAll(filterValue)
        return json(items)
      } catch (error) {
        return errorResponse(error)
      }
    },

    async handleCreate(req: Request) {
      try {
        const data = await req.json()

        // Validate with Zod schema
        const validated = insertSchema ? validateWithSchema(insertSchema, data) : data

        // Validate references exist
        if (references) {
          await validateReferences(validated as Record<string, unknown>, references)
        }

        const item = await crud.create(validated)
        return json(item, 201)
      } catch (error) {
        return errorResponse(error)
      }
    },

    async handleGet(id: string) {
      try {
        const item = await getById(id)
        if (!item) throw ApiError.notFound(name, id)
        return json(item)
      } catch (error) {
        return errorResponse(error)
      }
    },

    async handleUpdate(id: string, req: Request) {
      try {
        // Block updates for immutable resources
        if (immutable || !updateSchema) {
          throw new ApiError("FORBIDDEN", `${name} records cannot be modified`, 403)
        }

        const data = await req.json()

        // Validate with Zod schema
        const validated = validateWithSchema(updateSchema, data) as Record<string, unknown>

        // Validate references exist
        if (references) {
          await validateReferences(validated, references)
        }

        // Type assertion: validated is Zod-validated data matching table's Insert shape
        // This is safe because updateSchema validates the data structure
        const item = await crud.update(id, validated as Parameters<typeof crud.update>[1])
        if (!item) throw ApiError.notFound(name, id)
        return json(item)
      } catch (error) {
        return errorResponse(error)
      }
    },

    async handleDelete(id: string) {
      try {
        // Block deletes for fully immutable resources (audit logs)
        if (immutable) {
          throw new ApiError("FORBIDDEN", `${name} records cannot be deleted`, 403)
        }

        const item = await crud.delete(id)
        if (!item) throw ApiError.notFound(name, id)
        return json({ message: `${name} deleted`, id })
      } catch (error) {
        return errorResponse(error)
      }
    },
  }
}

// =============================================================================
// RESOURCE CONFIGURATION
// =============================================================================

// Reference getById helpers for validation
const entityRef = { field: "entityId", name: "entity", getById: entityCrud.getById }
const beneficiaryRef = {
  field: "beneficiaryId",
  name: "beneficiary",
  getById: beneficiaryCrud.getById,
}
const trusteeRef = { field: "trusteeId", name: "trustee", getById: trusteeCrud.getById }
const liabilityRef = { field: "liabilityId", name: "liability", getById: liabilityCrud.getById }
const scheduleRef = {
  field: "scheduleId",
  name: "fee schedule",
  getById: trusteeFeeScheduleCrud.getById,
}

const resources = {
  entities: {
    crud: entityCrud,
    name: "Entity",
    customGetById: getEntityById,
    insertSchema: insertEntitySchema,
    updateSchema: updateEntitySchema,
  } satisfies ResourceConfig<typeof entity>,
  beneficiaries: {
    crud: beneficiaryCrud,
    name: "Beneficiary",
    customGetById: getBeneficiaryById,
    insertSchema: insertBeneficiarySchema,
    updateSchema: updateBeneficiarySchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof beneficiary>,
  contacts: {
    crud: contactCrud,
    name: "Contact",
    insertSchema: insertContactSchema,
    updateSchema: updateContactSchema,
  } satisfies ResourceConfig<typeof contact>,
  tasks: {
    crud: taskCrud,
    name: "Task",
    insertSchema: insertTaskSchema,
    updateSchema: updateTaskSchema,
  } satisfies ResourceConfig<typeof task>,
  vehicles: {
    crud: vehicleCrud,
    name: "Vehicle",
    filterParam: "entityId",
    customGetById: getVehicleById,
    insertSchema: insertVehicleSchema,
    updateSchema: updateVehicleSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof vehicle>,
  homesteads: {
    crud: homesteadCrud,
    name: "Homestead",
    filterParam: "entityId",
    customGetById: getHomesteadById,
    insertSchema: insertHomesteadSchema,
    updateSchema: updateHomesteadSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof homestead>,
  "rental-properties": {
    crud: rentalPropertyCrud,
    name: "Rental property",
    filterParam: "entityId",
    customGetById: getRentalPropertyById,
    insertSchema: insertRentalPropertySchema,
    updateSchema: updateRentalPropertySchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof rentalProperty>,
  "bank-accounts": {
    crud: bankAccountCrud,
    name: "Bank account",
    filterParam: "entityId",
    customGetById: getBankAccountById,
    insertSchema: insertBankAccountSchema,
    updateSchema: updateBankAccountSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof bankAccount>,
  "investment-accounts": {
    crud: investmentAccountCrud,
    name: "Investment account",
    filterParam: "entityId",
    insertSchema: insertInvestmentAccountSchema,
    updateSchema: updateInvestmentAccountSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof investmentAccount>,
  "personal-property": {
    crud: personalPropertyCrud,
    name: "Personal property",
    filterParam: "entityId",
    insertSchema: insertPersonalPropertySchema,
    updateSchema: updatePersonalPropertySchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof personalProperty>,
  artwork: {
    crud: artworkCrud,
    name: "Artwork",
    filterParam: "entityId",
    insertSchema: insertArtworkSchema,
    updateSchema: updateArtworkSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof artwork>,
  trustees: {
    crud: trusteeCrud,
    name: "Trustee",
    filterParam: "entityId",
    insertSchema: insertTrusteeSchema,
    updateSchema: updateTrusteeSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof trustee>,
  "specific-bequests": {
    crud: specificBequestCrud,
    name: "Bequest",
    filterParam: "entityId",
    insertSchema: insertSpecificBequestSchema,
    updateSchema: updateSpecificBequestSchema,
    references: [entityRef, beneficiaryRef],
  } satisfies ResourceConfig<typeof specificBequest>,
  "trust-accounting": {
    crud: trustAccountingCrud,
    name: "Entry",
    filterParam: "entityId",
    insertSchema: insertTrustAccountingSchema,
    updateSchema: updateTrustAccountingSchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof trustAccounting>,
  "withdrawal-records": {
    crud: withdrawalRecordCrud,
    name: "Record",
    filterParam: "beneficiaryId",
    insertSchema: insertWithdrawalRecordSchema,
    updateSchema: updateWithdrawalRecordSchema,
    references: [entityRef, beneficiaryRef],
  } satisfies ResourceConfig<typeof withdrawalRecord>,
  // Texas 113.152(5) - Liabilities
  liabilities: {
    crud: liabilityCrud,
    name: "Liability",
    filterParam: "entityId",
    insertSchema: insertLiabilitySchema,
    updateSchema: updateLiabilitySchema,
    references: [entityRef],
  } satisfies ResourceConfig<typeof liability>,
  "liability-payments": {
    crud: liabilityPaymentCrud,
    name: "Payment",
    filterParam: "liabilityId",
    insertSchema: insertLiabilityPaymentSchema,
    // No update schema - payments are immutable
    references: [liabilityRef],
  } satisfies ResourceConfig<typeof liabilityPayment>,
  // HEMS Request Workflow
  "hems-requests": {
    crud: hemsRequestCrud,
    name: "HEMS Request",
    filterParam: "beneficiaryId",
    insertSchema: insertHemsRequestSchema,
    updateSchema: updateHemsRequestSchema,
    references: [entityRef, beneficiaryRef],
  } satisfies ResourceConfig<typeof hemsRequest>,
  // Trustee Fees
  "trustee-fee-schedules": {
    crud: trusteeFeeScheduleCrud,
    name: "Fee Schedule",
    filterParam: "entityId",
    insertSchema: insertTrusteeFeeScheduleSchema,
    // No update schema - hasUpdatedAt: false
    references: [entityRef, trusteeRef],
  } satisfies ResourceConfig<typeof trusteeFeeSchedule>,
  "trustee-fee-entries": {
    crud: trusteeFeeEntryCrud,
    name: "Fee Entry",
    filterParam: "entityId",
    insertSchema: insertTrusteeFeeEntrySchema,
    updateSchema: updateTrusteeFeeEntrySchema,
    references: [entityRef, trusteeRef, scheduleRef],
  } satisfies ResourceConfig<typeof trusteeFeeEntry>,
  "activity-logs": {
    crud: activityLogCrud,
    name: "Activity Log",
    insertSchema: insertActivityLogSchema,
    // No update/delete - audit logs are fully immutable
    immutable: true,
  } satisfies ResourceConfig<typeof activityLog>,
}

// Pre-create handlers for each resource
const handlers = Object.fromEntries(
  Object.entries(resources).map(([path, config]) => [path, createRouteHandler(config)]),
)

// =============================================================================
// DATABASE HEALTH CHECK
// =============================================================================

/**
 * Check database connection health and return pool statistics
 */
async function checkDbConnection() {
  try {
    // Simple query to verify connection
    await db.execute(sql`SELECT 1`)

    // Get connection pool stats (postgres-js doesn't expose pool size directly)
    // But we can return configured values
    return {
      ok: true,
      poolSize: client.options.max,
      configured: {
        maxConnections: client.options.max,
        idleTimeout: client.options.idle_timeout,
        connectTimeout: client.options.connect_timeout,
        maxLifetime: client.options.max_lifetime,
        preparedStatements: client.options.prepare,
      },
    }
  } catch (error) {
    logger.db.error("Database health check failed", { error })
    return {
      ok: false,
      poolSize: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// =============================================================================
// SERVER
// =============================================================================

Bun.serve({
  port: PORT,
  routes: {
    // Frontend routes - all served from the same HTML
    "/": homepage,
    "/assets": homepage,
    "/beneficiaries": homepage,
    "/contacts": homepage,
    "/forms": homepage,
    // Portal routes
    "/portal": homepage,
    "/portal/login": homepage,
    "/portal/dashboard": homepage,
    "/portal/change-password": homepage,
  },
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // CORS headers for cross-origin requests (dev: frontend on 5173, API on 5050)
    // Use whitelist-based origin checking (wildcard "*" violates CORS spec with credentials)
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "http://localhost:5050",
    ]
    const origin = req.headers.get("Origin")
    const isAllowed = origin && allowedOrigins.includes(origin)

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0] || "",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    }

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
      // =============================================================================
      // BETTER AUTH ROUTES
      // =============================================================================
      if (path.startsWith("/api/auth")) {
        const response = await auth.handler(req)
        // Add CORS headers to auth responses
        const newHeaders = new Headers(response.headers)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value)
        })
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      }

      // =============================================================================
      // AUTHENTICATION MIDDLEWARE
      // =============================================================================
      // Protect all API routes except auth endpoints, portal routes, and public routes
      if (path.startsWith("/api/") && !isPublicRoute(path) && !path.startsWith("/api/portal/")) {
        await requireAdmin(req)
      }

      // =============================================================================
      // GENERIC CRUD ROUTES
      // =============================================================================

      // Match /api/{resource}
      const listMatch = path.match(/^\/api\/([a-z-]+)$/)
      if (listMatch?.[1]) {
        const resource = listMatch[1]
        const handler = handlers[resource]

        if (handler) {
          if (method === "GET") return handler.handleList(url)
          if (method === "POST") return handler.handleCreate(req)
        }
      }

      // Match /api/{resource}/{id}
      const itemMatch = path.match(/^\/api\/([a-z-]+)\/([^/]+)$/)
      if (itemMatch?.[1] && itemMatch[2]) {
        const resource = itemMatch[1]
        const id = itemMatch[2]
        const handler = handlers[resource]

        if (handler) {
          if (method === "GET") return handler.handleGet(id)
          if (method === "PUT") return handler.handleUpdate(id, req)
          if (method === "DELETE") return handler.handleDelete(id)
        }
      }

      // =============================================================================
      // SPECIAL ROUTES
      // =============================================================================

      // Task due date reminders (manual trigger for cron/scheduler)
      if (path === "/api/tasks/reminders" && method === "POST") {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>)
        const daysRaw = typeof body?.days === "number" ? body.days : Number(body?.days ?? 7)
        const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 7
        const now = new Date()
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() + days)

        const dueTasks = await db
          .select()
          .from(task)
          .where(
            and(
              eq(task.completed, false),
              isNotNull(task.dueDate),
              lte(task.dueDate, cutoff.toISOString()),
            ),
          )
          .orderBy(asc(task.dueDate))

        const trusteeRecipients = await db
          .select({ email: trustee.email, name: trustee.name })
          .from(trustee)
          .where(and(eq(trustee.status, "CURRENT"), isNotNull(trustee.email)))

        const recipients = trusteeRecipients
          .map((t) => t.email)
          .filter((email): email is string => !!email)

        if (!dueTasks.length) {
          return json({
            message: "No due tasks within reminder window",
            days,
            tasks: 0,
            recipients: recipients.length,
          })
        }

        if (!recipients.length) {
          return json({
            message: "No trustee emails configured",
            days,
            tasks: dueTasks.length,
            recipients: 0,
          })
        }

        if (!resend) {
          log.warn("RESEND_API_KEY not set - task reminders not sent")
          return json(
            {
              message: "Email service not configured",
              days,
              tasks: dueTasks.length,
              recipients: recipients.length,
            },
            501,
          )
        }

        const formatDate = (value: string | null) =>
          value
            ? new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "No due date"

        const taskLines = dueTasks.map((t) => {
          const due = t.dueDate ? new Date(t.dueDate) : null
          const overdue = due ? due.getTime() < now.getTime() : false
          const status = overdue ? "OVERDUE" : "DUE SOON"
          return `- [${status}] ${t.title} (Due ${formatDate(t.dueDate)})`
        })

        const subject = `Trust Admin Task Reminder (${dueTasks.length})`
        const text = [
          "Trust Admin Task Reminder",
          `Generated: ${now.toLocaleString("en-US")}`,
          `Reminder window: next ${days} day(s)`,
          "",
          "Tasks due soon or overdue:",
          ...taskLines,
          "",
          "Sign in to Trust Admin to review and update task status.",
        ].join("\n")

        const htmlList = dueTasks
          .map((t) => {
            const due = t.dueDate ? new Date(t.dueDate) : null
            const overdue = due ? due.getTime() < now.getTime() : false
            const status = overdue ? "OVERDUE" : "DUE SOON"
            return `<li><strong>${status}</strong> - ${t.title} (Due ${formatDate(t.dueDate)})</li>`
          })
          .join("")

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: recipients,
          subject,
          text,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
              <h2 style="margin-bottom: 0;">Trust Admin Task Reminder</h2>
              <p style="margin-top: 4px; color: #555;">Generated: ${now.toLocaleString("en-US")}</p>
              <p>Reminder window: next ${days} day(s)</p>
              <h3>Tasks due soon or overdue</h3>
              <ul>${htmlList}</ul>
              <p>Sign in to Trust Admin to review and update task status.</p>
            </div>
          `,
        })

        if (error) {
          log.error("Task reminder email failed", { error: error.message })
          return json({ error: error.message }, 500)
        }

        return json({
          message: "Task reminders sent",
          days,
          tasks: dueTasks.length,
          recipients: recipients.length,
          messageId: data?.id,
        })
      }

      // Distributions (custom getAll with relations)
      if (path === "/api/distributions" && method === "GET") {
        const distributions = await getDistributions()
        return json(distributions)
      }
      if (path === "/api/distributions" && method === "POST") {
        const data = await req.json()

        // Validate with Zod schema
        const validated = validateWithSchema(insertDistributionSchema, data)

        // Validate references exist
        await validateReference("entityId", validated.entityId, entityCrud.getById)
        await validateReference("beneficiaryId", validated.beneficiaryId, beneficiaryCrud.getById)

        // CRUD factory handles id generation and timestamps
        // biome-ignore lint/suspicious/noExplicitAny: Schema validation ensures type compatibility
        const distribution = await distributionCrud.create(validated as any)
        return json(distribution, 201)
      }

      // Valuations (nested route: /api/valuations/{assetType}/{assetId})
      if (path === "/api/valuations" && method === "POST") {
        const data = await req.json()

        // Validate with Zod schema
        const validated = validateWithSchema(insertValuationSchema, data)

        // Note: assetType/assetId validation is complex (polymorphic FK)
        // The database constraint will enforce validity

        // CRUD factory handles id generation if not provided
        const valuation = await valuationCrud.create(validated as typeof validated & { id: string })
        return json(valuation, 201)
      }
      const valuationMatch = path.match(/^\/api\/valuations\/([^/]+)\/([^/]+)$/)
      if (valuationMatch && method === "GET") {
        const [, assetType, assetId] = valuationMatch
        if (assetType && assetId) {
          const valuations = await getValuationsForAsset(assetType, assetId)
          return json(valuations)
        }
      }

      // =============================================================================
      // PUBLIC FORM SUBMISSION
      // =============================================================================
      if (path === "/api/public/submit-items" && method === "POST") {
        try {
          const body = await req.json()

          // Validate quantity (1-100)
          const quantity = Math.max(1, Math.min(100, parseInt(body.quantity, 10) || 1))

          // Get Hudson Living Trust entity ID (cache this)
          const hudsonEntity = await db
            .select({ id: entity.id })
            .from(entity)
            .where(eq(entity.name, "Hudson Living Trust"))
            .limit(1)

          if (!hudsonEntity.length) {
            throw new ApiError("INTERNAL_ERROR", "Hudson Living Trust entity not found", 500)
          }

          const entityId = hudsonEntity[0]!.id
          const itemType = body.itemType as string
          const data = body.data as Record<string, unknown>

          // Map itemType to table and validation schema
          const typeMapping: Record<
            string,
            { table: PgTable<TableConfig>; schema: ZodSchema; defaults: Record<string, unknown> }
          > = {
            vehicle: {
              table: vehicle,
              schema: insertVehicleSchema,
              defaults: {
                vin: data.vin || "UNKNOWN",
                year: data.year || 2000,
                titleStatus: "CLEAR",
                status: "ACTIVE",
                transferStatus: "PENDING",
              },
            },
            "personal-property": {
              table: personalProperty,
              schema: insertPersonalPropertySchema,
              defaults: {
                category: data.category || "OTHER",
                status: "ACTIVE",
                transferStatus: "PENDING",
              },
            },
            "bank-account": {
              table: bankAccount,
              schema: insertBankAccountSchema,
              defaults: {
                accountNumber: data.accountNumber || "PENDING",
                status: "OPEN",
                transferStatus: "PENDING",
              },
            },
            "investment-account": {
              table: investmentAccount,
              schema: insertInvestmentAccountSchema,
              defaults: {
                accountNumber: data.accountNumber || "PENDING",
                status: "OPEN",
                transferStatus: "PENDING",
              },
            },
            "insurance-policy": {
              table: insurancePolicy,
              schema: insertInsurancePolicySchema,
              defaults: {
                status: "ACTIVE",
              },
            },
            homestead: {
              table: homestead,
              schema: insertHomesteadSchema,
              defaults: {
                status: "ACTIVE",
                transferStatus: "PENDING",
                dodAffidavitFiled: false,
              },
            },
            "rental-property": {
              table: rentalProperty,
              schema: insertRentalPropertySchema,
              defaults: {
                units: 1,
                rentalStatus: "RENTED",
                status: "ACTIVE",
                transferStatus: "PENDING",
                dodAffidavitFiled: false,
              },
            },
            artwork: {
              table: artwork,
              schema: insertArtworkSchema,
              defaults: {
                status: "ACTIVE",
                transferStatus: "PENDING",
              },
            },
            liability: {
              table: liability,
              schema: insertLiabilitySchema,
              defaults: {
                currentBalance: data.currentBalance || data.originalAmount,
                status: "ACTIVE",
                allocationClass: "PRINCIPAL",
              },
            },
          }

          const mapping = typeMapping[itemType]
          if (!mapping) {
            throw new ApiError("VALIDATION_ERROR", `Invalid item type: ${itemType}`, 400)
          }

          // Validate form data with lenient schema
          const validated = validateWithSchema(mapping.schema, {
            ...data,
            entityId,
            ...mapping.defaults,
          })

          // Create N records
          const createdIds: string[] = []
          const now = new Date().toISOString()

          for (let i = 0; i < quantity; i++) {
            const id = generateId()
            const record = {
              ...(validated as Record<string, unknown>),
              id,
              createdAt: now,
              updatedAt: now,
            }

            await db.insert(mapping.table).values(record)
            createdIds.push(id)
          }

          return json(
            {
              success: true,
              itemsCreated: quantity,
              ids: createdIds,
              message: `${quantity} item(s) submitted successfully`,
            },
            201,
          )
        } catch (error) {
          return errorResponse(error)
        }
      }

      // =============================================================================
      // HEMS REQUEST WORKFLOW ROUTES
      // =============================================================================

      // Get pending HEMS requests (for admin dashboard)
      if (path === "/api/hems-requests/pending" && method === "GET") {
        const requests = await getPendingHemsRequests()
        return json(requests)
      }

      // Get HEMS requests with beneficiary info
      if (path === "/api/hems-requests" && method === "GET") {
        const beneficiaryId = url.searchParams.get("beneficiaryId") || undefined
        const requests = await getHemsRequestsWithBeneficiary(beneficiaryId)
        return json(requests)
      }

      // Approve HEMS request
      const approveMatch = path.match(/^\/api\/hems-requests\/([^/]+)\/approve$/)
      if (approveMatch?.[1] && method === "POST") {
        const requestId = approveMatch[1]
        const body = await req.json()

        // Validate approvedAmount is positive if provided
        if (body.approvedAmount !== undefined && body.approvedAmount !== null) {
          const amount = parseFloat(body.approvedAmount)
          if (Number.isNaN(amount) || amount < 0) {
            throw ApiError.validationError("Approved amount must be non-negative", {
              approvedAmount: "Must be a non-negative number",
            })
          }
        }

        // Update the request
        const updated = await updateHemsRequest(requestId, {
          status: "APPROVED",
          approvedAmount: body.approvedAmount,
          reviewNotes: body.reviewNotes,
          reviewedAt: new Date().toISOString(),
        })

        if (!updated) {
          throw ApiError.notFound("HEMS Request", requestId)
        }

        return json(updated)
      }

      // Deny HEMS request
      const denyMatch = path.match(/^\/api\/hems-requests\/([^/]+)\/deny$/)
      if (denyMatch?.[1] && method === "POST") {
        const requestId = denyMatch[1]
        const { reviewNotes } = await req.json()

        const updated = await updateHemsRequest(requestId, {
          status: "DENIED",
          reviewNotes,
          reviewedAt: new Date().toISOString(),
        })

        if (!updated) {
          throw ApiError.notFound("HEMS Request", requestId)
        }

        return json(updated)
      }

      // =============================================================================
      // TRUSTEE FEE ROUTES
      // =============================================================================

      // Get fee entries with schedule info
      if (path === "/api/trustee-fee-entries" && method === "GET") {
        const entityId = url.searchParams.get("entityId") || undefined
        const entries = await getTrusteeFeeEntriesWithSchedule(entityId)
        return json(entries)
      }

      // =============================================================================
      // LIABILITY PAYMENT ROUTES
      // =============================================================================

      // Record a payment on a liability (creates payment + updates balance + creates expense)
      const recordPaymentMatch = path.match(/^\/api\/liabilities\/([^/]+)\/record-payment$/)
      if (recordPaymentMatch?.[1] && method === "POST") {
        const liabilityId = recordPaymentMatch[1]
        const paymentData = await req.json()

        // Validate required fields
        if (!paymentData.paymentDate) {
          throw ApiError.validationError("Payment date is required", {
            paymentDate: "Payment date is required",
          })
        }

        if (!paymentData.amount) {
          throw ApiError.validationError("Amount is required", {
            amount: "Amount is required",
          })
        }

        const amount = parseFloat(paymentData.amount)
        if (Number.isNaN(amount) || amount <= 0) {
          throw ApiError.validationError("Amount must be greater than 0", {
            amount: "Must be a positive number",
          })
        }

        // Verify liability exists
        const liabilityExists = await liabilityCrud.getById(liabilityId)
        if (!liabilityExists) {
          throw ApiError.notFound("Liability", liabilityId)
        }

        const result = await recordLiabilityPayment({
          liabilityId,
          ...paymentData,
        })

        return json(result, 201)
      }

      // Get payment history for a liability
      const paymentHistoryMatch = path.match(/^\/api\/liabilities\/([^/]+)\/payments$/)
      if (paymentHistoryMatch?.[1] && method === "GET") {
        const liabilityId = paymentHistoryMatch[1]
        const payments = await getLiabilityPayments(liabilityId)
        return json(payments)
      }

      // =============================================================================
      // PORTAL API ROUTES (for beneficiary portal)
      // =============================================================================
      if (path === "/api/portal/me" && method === "GET") {
        // Use middleware for type-safe authentication
        const user = await requireBeneficiary(req)
        const beneficiaryId = user.beneficiaryId

        // Fetch beneficiary with distributions
        const beneficiary = await getBeneficiaryById(beneficiaryId)
        if (!beneficiary) {
          return json({ error: "Beneficiary not found" }, 404)
        }

        return json({
          user,
          beneficiary,
        })
      }

      // =============================================================================
      // HEALTH CHECK
      // =============================================================================
      if (path === "/health") {
        const dbHealth = await checkDbConnection()
        return json({
          status: dbHealth.ok ? "ok" : "degraded",
          service: "trust-admin",
          timestamp: new Date().toISOString(),
          database: {
            connected: dbHealth.ok,
            poolSize: dbHealth.poolSize,
            configured: dbHealth.configured || null,
            error: dbHealth.error || null,
          },
        })
      }

      // 404 for unknown API routes
      if (path.startsWith("/api/")) {
        throw ApiError.notFound("Endpoint")
      }

      // For any other route, serve the homepage (SPA fallback)
      return new Response(Bun.file("./src/index.html"), {
        headers: { "Content-Type": "text/html" },
      })
    } catch (error) {
      // Capture errors in Sentry with request context
      Sentry.captureException(error, {
        tags: {
          layer: "api",
          endpoint: path,
          method,
        },
      })

      // Use consistent error response formatting
      return errorResponse(error)
    }
  },
  development: {
    hmr: true,
    console: true,
  },
})

console.log(`Trust Admin running on http://localhost:${PORT}`)
