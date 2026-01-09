/**
 * Trust Admin API Server
 *
 * Uses a route factory pattern to eliminate duplicate CRUD route handlers.
 */
import homepage from "./src/index.html";
import { auth } from "./src/lib/auth";
import { logger } from "./src/lib/logger";
import { ApiError, errorResponse, validateWithSchema, validateReference } from "./src/lib/api-error";
import { Resend } from "resend";
import { and, eq, isNotNull, lte, asc } from "drizzle-orm";
import type { ZodSchema } from "zod";
import { db } from "./db";
import { task, trustee } from "./db/schema";
import type {
  Entity,
  Beneficiary,
  Vehicle,
  Homestead,
  RentalProperty,
  BankAccount,
} from "./db/schema";
import {
  // CRUD factories
  entityCrud,
  beneficiaryCrud,
  contactCrud,
  taskCrud,
  vehicleCrud,
  homesteadCrud,
  rentalPropertyCrud,
  bankAccountCrud,
  investmentAccountCrud,
  personalPropertyCrud,
  artworkCrud,
  trusteeCrud,
  specificBequestCrud,
  trustAccountingCrud,
  withdrawalRecordCrud,
  distributionCrud,
  valuationCrud,
  liabilityCrud,
  liabilityPaymentCrud,
  hemsRequestCrud,
  trusteeFeeScheduleCrud,
  trusteeFeeEntryCrud,
  activityLogCrud,
  // Custom queries (with relations)
  getEntityById,
  getBeneficiaryById,
  getVehicleById,
  getHomesteadById,
  getRentalPropertyById,
  getBankAccountById,
  getDistributions,
  getValuationsForAsset,
  getPendingHemsRequests,
  getHemsRequestsWithBeneficiary,
  updateHemsRequest,
  getTrusteeFeeEntriesWithSchedule,
  recordLiabilityPayment,
  getLiabilityPayments,
} from "./db/queries";
import type { CrudOperations } from "./db/crud-factory";
import {
  // Insert schemas
  insertEntitySchema,
  insertBeneficiarySchema,
  insertContactSchema,
  insertTaskSchema,
  insertVehicleSchema,
  insertHomesteadSchema,
  insertRentalPropertySchema,
  insertBankAccountSchema,
  insertInvestmentAccountSchema,
  insertPersonalPropertySchema,
  insertArtworkSchema,
  insertTrusteeSchema,
  insertSpecificBequestSchema,
  insertTrustAccountingSchema,
  insertWithdrawalRecordSchema,
  insertDistributionSchema,
  insertValuationSchema,
  insertLiabilitySchema,
  insertLiabilityPaymentSchema,
  insertHemsRequestSchema,
  insertTrusteeFeeScheduleSchema,
  insertTrusteeFeeEntrySchema,
  insertActivityLogSchema,
  // Update schemas
  updateEntitySchema,
  updateBeneficiarySchema,
  updateContactSchema,
  updateTaskSchema,
  updateVehicleSchema,
  updateHomesteadSchema,
  updateRentalPropertySchema,
  updateBankAccountSchema,
  updateInvestmentAccountSchema,
  updatePersonalPropertySchema,
  updateArtworkSchema,
  updateTrusteeSchema,
  updateSpecificBequestSchema,
  updateTrustAccountingSchema,
  updateWithdrawalRecordSchema,
  updateDistributionSchema,
  updateLiabilitySchema,
  updateHemsRequestSchema,
  updateTrusteeFeeEntrySchema,
} from "./db/validation";

const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5050'));
const log = logger.api;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "Trust Admin <onboarding@resend.dev>";

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// =============================================================================
// ROUTE FACTORY
// =============================================================================

interface ReferenceConfig {
  field: string;
  name: string;
  getById: (id: string) => Promise<unknown>;
}

interface RouteConfig {
  crud: CrudOperations<any>;
  name: string;
  filterParam?: string;
  customGetById?: (id: string) => Promise<unknown | undefined>;
  // Validation schemas
  insertSchema?: ZodSchema;
  updateSchema?: ZodSchema;
  // Foreign key references to validate
  references?: ReferenceConfig[];
  // Fully immutable (no update or delete - for audit logs)
  immutable?: boolean;
}

/**
 * Validates all configured references exist
 */
async function validateReferences(data: Record<string, unknown>, references: ReferenceConfig[]): Promise<void> {
  for (const ref of references) {
    const value = data[ref.field];
    if (value && typeof value === "string") {
      await validateReference(ref.field, value, ref.getById);
    }
  }
}

function createRouteHandler(config: RouteConfig) {
  const { crud, name, filterParam, customGetById, insertSchema, updateSchema, references, immutable } = config;
  const getById = customGetById || crud.getById;

  return {
    async handleList(url: URL) {
      try {
        const filterValue = filterParam
          ? url.searchParams.get(filterParam) || undefined
          : undefined;
        const items = await crud.getAll(filterValue);
        return json(items);
      } catch (error) {
        return errorResponse(error);
      }
    },

    async handleCreate(req: Request) {
      try {
        const data = await req.json();

        // Validate with Zod schema
        const validated = insertSchema ? validateWithSchema(insertSchema, data) : data;

        // Validate references exist
        if (references) {
          await validateReferences(validated as Record<string, unknown>, references);
        }

        const item = await crud.create(validated);
        return json(item, 201);
      } catch (error) {
        return errorResponse(error);
      }
    },

    async handleGet(id: string) {
      try {
        const item = await getById(id);
        if (!item) throw ApiError.notFound(name, id);
        return json(item);
      } catch (error) {
        return errorResponse(error);
      }
    },

    async handleUpdate(id: string, req: Request) {
      try {
        // Block updates for immutable resources
        if (immutable || !updateSchema) {
          throw new ApiError(
            "FORBIDDEN",
            `${name} records cannot be modified`,
            403
          );
        }

        const data = await req.json();

        // Validate with Zod schema
        const validated = validateWithSchema(updateSchema, data);

        // Validate references exist
        if (references) {
          await validateReferences(validated as Record<string, unknown>, references);
        }

        const item = await crud.update(id, validated);
        if (!item) throw ApiError.notFound(name, id);
        return json(item);
      } catch (error) {
        return errorResponse(error);
      }
    },

    async handleDelete(id: string) {
      try {
        // Block deletes for fully immutable resources (audit logs)
        if (immutable) {
          throw new ApiError(
            "FORBIDDEN",
            `${name} records cannot be deleted`,
            403
          );
        }

        const item = await crud.delete(id);
        if (!item) throw ApiError.notFound(name, id);
        return json({ message: `${name} deleted`, id });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}

// =============================================================================
// RESOURCE CONFIGURATION
// =============================================================================

// Reference getById helpers for validation
const entityRef = { field: "entityId", name: "entity", getById: entityCrud.getById };
const beneficiaryRef = { field: "beneficiaryId", name: "beneficiary", getById: beneficiaryCrud.getById };
const trusteeRef = { field: "trusteeId", name: "trustee", getById: trusteeCrud.getById };
const liabilityRef = { field: "liabilityId", name: "liability", getById: liabilityCrud.getById };
const scheduleRef = { field: "scheduleId", name: "fee schedule", getById: trusteeFeeScheduleCrud.getById };

const resources: Record<string, RouteConfig> = {
  "entities": {
    crud: entityCrud as any,
    name: "Entity",
    customGetById: getEntityById,
    insertSchema: insertEntitySchema,
    updateSchema: updateEntitySchema,
  },
  "beneficiaries": {
    crud: beneficiaryCrud as any,
    name: "Beneficiary",
    customGetById: getBeneficiaryById,
    insertSchema: insertBeneficiarySchema,
    updateSchema: updateBeneficiarySchema,
    references: [entityRef],
  },
  "contacts": {
    crud: contactCrud as any,
    name: "Contact",
    insertSchema: insertContactSchema,
    updateSchema: updateContactSchema,
  },
  "tasks": {
    crud: taskCrud as any,
    name: "Task",
    insertSchema: insertTaskSchema,
    updateSchema: updateTaskSchema,
  },
  "vehicles": {
    crud: vehicleCrud as any,
    name: "Vehicle",
    filterParam: "entityId",
    customGetById: getVehicleById,
    insertSchema: insertVehicleSchema,
    updateSchema: updateVehicleSchema,
    references: [entityRef],
  },
  "homesteads": {
    crud: homesteadCrud as any,
    name: "Homestead",
    filterParam: "entityId",
    customGetById: getHomesteadById,
    insertSchema: insertHomesteadSchema,
    updateSchema: updateHomesteadSchema,
    references: [entityRef],
  },
  "rental-properties": {
    crud: rentalPropertyCrud as any,
    name: "Rental property",
    filterParam: "entityId",
    customGetById: getRentalPropertyById,
    insertSchema: insertRentalPropertySchema,
    updateSchema: updateRentalPropertySchema,
    references: [entityRef],
  },
  "bank-accounts": {
    crud: bankAccountCrud as any,
    name: "Bank account",
    filterParam: "entityId",
    customGetById: getBankAccountById,
    insertSchema: insertBankAccountSchema,
    updateSchema: updateBankAccountSchema,
    references: [entityRef],
  },
  "investment-accounts": {
    crud: investmentAccountCrud as any,
    name: "Investment account",
    filterParam: "entityId",
    insertSchema: insertInvestmentAccountSchema,
    updateSchema: updateInvestmentAccountSchema,
    references: [entityRef],
  },
  "personal-property": {
    crud: personalPropertyCrud as any,
    name: "Personal property",
    filterParam: "entityId",
    insertSchema: insertPersonalPropertySchema,
    updateSchema: updatePersonalPropertySchema,
    references: [entityRef],
  },
  "artwork": {
    crud: artworkCrud as any,
    name: "Artwork",
    filterParam: "entityId",
    insertSchema: insertArtworkSchema,
    updateSchema: updateArtworkSchema,
    references: [entityRef],
  },
  "trustees": {
    crud: trusteeCrud as any,
    name: "Trustee",
    filterParam: "entityId",
    insertSchema: insertTrusteeSchema,
    updateSchema: updateTrusteeSchema,
    references: [entityRef],
  },
  "specific-bequests": {
    crud: specificBequestCrud as any,
    name: "Bequest",
    filterParam: "entityId",
    insertSchema: insertSpecificBequestSchema,
    updateSchema: updateSpecificBequestSchema,
    references: [entityRef, beneficiaryRef],
  },
  "trust-accounting": {
    crud: trustAccountingCrud as any,
    name: "Entry",
    filterParam: "entityId",
    insertSchema: insertTrustAccountingSchema,
    updateSchema: updateTrustAccountingSchema,
    references: [entityRef],
  },
  "withdrawal-records": {
    crud: withdrawalRecordCrud as any,
    name: "Record",
    filterParam: "beneficiaryId",
    insertSchema: insertWithdrawalRecordSchema,
    updateSchema: updateWithdrawalRecordSchema,
    references: [entityRef, beneficiaryRef],
  },
  // Texas 113.152(5) - Liabilities
  "liabilities": {
    crud: liabilityCrud as any,
    name: "Liability",
    filterParam: "entityId",
    insertSchema: insertLiabilitySchema,
    updateSchema: updateLiabilitySchema,
    references: [entityRef],
  },
  "liability-payments": {
    crud: liabilityPaymentCrud as any,
    name: "Payment",
    filterParam: "liabilityId",
    insertSchema: insertLiabilityPaymentSchema,
    // No update schema - payments are immutable
    references: [liabilityRef],
  },
  // HEMS Request Workflow
  "hems-requests": {
    crud: hemsRequestCrud as any,
    name: "HEMS Request",
    filterParam: "beneficiaryId",
    insertSchema: insertHemsRequestSchema,
    updateSchema: updateHemsRequestSchema,
    references: [entityRef, beneficiaryRef],
  },
  // Trustee Fees
  "trustee-fee-schedules": {
    crud: trusteeFeeScheduleCrud as any,
    name: "Fee Schedule",
    filterParam: "entityId",
    insertSchema: insertTrusteeFeeScheduleSchema,
    // No update schema - hasUpdatedAt: false
    references: [entityRef, trusteeRef],
  },
  "trustee-fee-entries": {
    crud: trusteeFeeEntryCrud as any,
    name: "Fee Entry",
    filterParam: "entityId",
    insertSchema: insertTrusteeFeeEntrySchema,
    updateSchema: updateTrusteeFeeEntrySchema,
    references: [entityRef, trusteeRef, scheduleRef],
  },
  "activity-logs": {
    crud: activityLogCrud as any,
    name: "Activity Log",
    insertSchema: insertActivityLogSchema,
    // No update/delete - audit logs are fully immutable
    immutable: true,
  },
};

// Pre-create handlers for each resource
const handlers = Object.fromEntries(
  Object.entries(resources).map(([path, config]) => [
    path,
    createRouteHandler(config),
  ])
);

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
    // Portal routes
    "/portal": homepage,
    "/portal/login": homepage,
    "/portal/dashboard": homepage,
    "/portal/change-password": homepage,
  },
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers for cross-origin requests (dev: frontend on 5173, API on 5050)
    const corsHeaders = {
      "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // =============================================================================
      // BETTER AUTH ROUTES
      // =============================================================================
      if (path.startsWith("/api/auth")) {
        const response = await auth.handler(req);
        // Add CORS headers to auth responses
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      // =============================================================================
      // GENERIC CRUD ROUTES
      // =============================================================================

      // Match /api/{resource}
      const listMatch = path.match(/^\/api\/([a-z-]+)$/);
      if (listMatch?.[1]) {
        const resource = listMatch[1];
        const handler = handlers[resource];

        if (handler) {
          if (method === "GET") return handler.handleList(url);
          if (method === "POST") return handler.handleCreate(req);
        }
      }

      // Match /api/{resource}/{id}
      const itemMatch = path.match(/^\/api\/([a-z-]+)\/([^/]+)$/);
      if (itemMatch?.[1] && itemMatch[2]) {
        const resource = itemMatch[1];
        const id = itemMatch[2];
        const handler = handlers[resource];

        if (handler) {
          if (method === "GET") return handler.handleGet(id);
          if (method === "PUT") return handler.handleUpdate(id, req);
          if (method === "DELETE") return handler.handleDelete(id);
        }
      }

      // =============================================================================
      // SPECIAL ROUTES
      // =============================================================================

      // Task due date reminders (manual trigger for cron/scheduler)
      if (path === "/api/tasks/reminders" && method === "POST") {
        const body = await req.json().catch(() => ({} as Record<string, unknown>));
        const daysRaw = typeof body?.days === "number" ? body.days : Number(body?.days ?? 7);
        const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 7;
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + days);

        const dueTasks = await db
          .select()
          .from(task)
          .where(
            and(
              eq(task.completed, false),
              isNotNull(task.dueDate),
              lte(task.dueDate, cutoff.toISOString())
            )
          )
          .orderBy(asc(task.dueDate));

        const trusteeRecipients = await db
          .select({ email: trustee.email, name: trustee.name })
          .from(trustee)
          .where(and(eq(trustee.status, "CURRENT"), isNotNull(trustee.email)));

        const recipients = trusteeRecipients
          .map((t) => t.email)
          .filter((email): email is string => !!email);

        if (!dueTasks.length) {
          return json({
            message: "No due tasks within reminder window",
            days,
            tasks: 0,
            recipients: recipients.length,
          });
        }

        if (!recipients.length) {
          return json({
            message: "No trustee emails configured",
            days,
            tasks: dueTasks.length,
            recipients: 0,
          });
        }

        if (!resend) {
          log.warn("RESEND_API_KEY not set - task reminders not sent");
          return json({
            message: "Email service not configured",
            days,
            tasks: dueTasks.length,
            recipients: recipients.length,
          }, 501);
        }

        const formatDate = (value: string | null) =>
          value
            ? new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "No due date";

        const taskLines = dueTasks.map((t) => {
          const due = t.dueDate ? new Date(t.dueDate) : null;
          const overdue = due ? due.getTime() < now.getTime() : false;
          const status = overdue ? "OVERDUE" : "DUE SOON";
          return `- [${status}] ${t.title} (Due ${formatDate(t.dueDate)})`;
        });

        const subject = `Trust Admin Task Reminder (${dueTasks.length})`;
        const text = [
          "Trust Admin Task Reminder",
          `Generated: ${now.toLocaleString("en-US")}`,
          `Reminder window: next ${days} day(s)`,
          "",
          "Tasks due soon or overdue:",
          ...taskLines,
          "",
          "Sign in to Trust Admin to review and update task status.",
        ].join("\n");

        const htmlList = dueTasks
          .map((t) => {
            const due = t.dueDate ? new Date(t.dueDate) : null;
            const overdue = due ? due.getTime() < now.getTime() : false;
            const status = overdue ? "OVERDUE" : "DUE SOON";
            return `<li><strong>${status}</strong> - ${t.title} (Due ${formatDate(t.dueDate)})</li>`;
          })
          .join("");

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
        });

        if (error) {
          log.error("Task reminder email failed", { error: error.message });
          return json({ error: error.message }, 500);
        }

        return json({
          message: "Task reminders sent",
          days,
          tasks: dueTasks.length,
          recipients: recipients.length,
          messageId: data?.id,
        });
      }

      // Distributions (custom getAll with relations)
      if (path === "/api/distributions" && method === "GET") {
        const distributions = await getDistributions();
        return json(distributions);
      }
      if (path === "/api/distributions" && method === "POST") {
        const data = await req.json();

        // Validate with Zod schema
        const validated = validateWithSchema(insertDistributionSchema, data);

        // Validate references exist
        await validateReference("entityId", validated.entityId, entityCrud.getById);
        await validateReference("beneficiaryId", validated.beneficiaryId, beneficiaryCrud.getById);

        const distribution = await distributionCrud.create(validated);
        return json(distribution, 201);
      }

      // Valuations (nested route: /api/valuations/{assetType}/{assetId})
      if (path === "/api/valuations" && method === "POST") {
        const data = await req.json();

        // Validate with Zod schema
        const validated = validateWithSchema(insertValuationSchema, data);

        // Note: assetType/assetId validation is complex (polymorphic FK)
        // The database constraint will enforce validity

        const valuation = await valuationCrud.create(validated);
        return json(valuation, 201);
      }
      const valuationMatch = path.match(/^\/api\/valuations\/([^/]+)\/([^/]+)$/);
      if (valuationMatch && method === "GET") {
        const [, assetType, assetId] = valuationMatch;
        if (assetType && assetId) {
          const valuations = await getValuationsForAsset(assetType, assetId);
          return json(valuations);
        }
      }

      // =============================================================================
      // HEMS REQUEST WORKFLOW ROUTES
      // =============================================================================

      // Get pending HEMS requests (for admin dashboard)
      if (path === "/api/hems-requests/pending" && method === "GET") {
        const requests = await getPendingHemsRequests();
        return json(requests);
      }

      // Get HEMS requests with beneficiary info
      if (path === "/api/hems-requests" && method === "GET") {
        const beneficiaryId = url.searchParams.get("beneficiaryId") || undefined;
        const requests = await getHemsRequestsWithBeneficiary(beneficiaryId);
        return json(requests);
      }

      // Approve HEMS request
      const approveMatch = path.match(/^\/api\/hems-requests\/([^/]+)\/approve$/);
      if (approveMatch?.[1] && method === "POST") {
        const requestId = approveMatch[1];
        const body = await req.json();

        // Validate approvedAmount is positive if provided
        if (body.approvedAmount !== undefined && body.approvedAmount !== null) {
          const amount = parseFloat(body.approvedAmount);
          if (isNaN(amount) || amount < 0) {
            throw ApiError.validationError("Approved amount must be non-negative", {
              approvedAmount: "Must be a non-negative number",
            });
          }
        }

        // Update the request
        const updated = await updateHemsRequest(requestId, {
          status: "APPROVED",
          approvedAmount: body.approvedAmount,
          reviewNotes: body.reviewNotes,
          reviewedAt: new Date().toISOString(),
        });

        if (!updated) {
          throw ApiError.notFound("HEMS Request", requestId);
        }

        return json(updated);
      }

      // Deny HEMS request
      const denyMatch = path.match(/^\/api\/hems-requests\/([^/]+)\/deny$/);
      if (denyMatch?.[1] && method === "POST") {
        const requestId = denyMatch[1];
        const { reviewNotes } = await req.json();

        const updated = await updateHemsRequest(requestId, {
          status: "DENIED",
          reviewNotes,
          reviewedAt: new Date().toISOString(),
        });

        if (!updated) {
          throw ApiError.notFound("HEMS Request", requestId);
        }

        return json(updated);
      }

      // =============================================================================
      // TRUSTEE FEE ROUTES
      // =============================================================================

      // Get fee entries with schedule info
      if (path === "/api/trustee-fee-entries" && method === "GET") {
        const entityId = url.searchParams.get("entityId") || undefined;
        const entries = await getTrusteeFeeEntriesWithSchedule(entityId);
        return json(entries);
      }

      // =============================================================================
      // LIABILITY PAYMENT ROUTES
      // =============================================================================

      // Record a payment on a liability (creates payment + updates balance + creates expense)
      const recordPaymentMatch = path.match(/^\/api\/liabilities\/([^/]+)\/record-payment$/);
      if (recordPaymentMatch?.[1] && method === "POST") {
        const liabilityId = recordPaymentMatch[1];
        const paymentData = await req.json();

        // Validate required fields
        if (!paymentData.paymentDate) {
          throw ApiError.validationError("Payment date is required", {
            paymentDate: "Payment date is required",
          });
        }

        if (!paymentData.amount) {
          throw ApiError.validationError("Amount is required", {
            amount: "Amount is required",
          });
        }

        const amount = parseFloat(paymentData.amount);
        if (isNaN(amount) || amount <= 0) {
          throw ApiError.validationError("Amount must be greater than 0", {
            amount: "Must be a positive number",
          });
        }

        // Verify liability exists
        const liabilityExists = await liabilityCrud.getById(liabilityId);
        if (!liabilityExists) {
          throw ApiError.notFound("Liability", liabilityId);
        }

        const result = await recordLiabilityPayment({
          liabilityId,
          ...paymentData,
        });

        return json(result, 201);
      }

      // Get payment history for a liability
      const paymentHistoryMatch = path.match(/^\/api\/liabilities\/([^/]+)\/payments$/);
      if (paymentHistoryMatch?.[1] && method === "GET") {
        const liabilityId = paymentHistoryMatch[1];
        const payments = await getLiabilityPayments(liabilityId);
        return json(payments);
      }

      // =============================================================================
      // PORTAL API ROUTES (for beneficiary portal)
      // =============================================================================
      // TEMPORARY DEVELOPMENT BYPASS: Authentication commented out for development
      // TODO: RESTORE AUTHENTICATION BEFORE PRODUCTION DEPLOYMENT
      if (path === "/api/portal/me" && method === "GET") {
        // ORIGINAL AUTHENTICATION CODE (COMMENTED OUT FOR DEVELOPMENT):
        // const session = await auth.api.getSession({ headers: req.headers });
        // if (!session?.user) {
        //   return json({ error: "Unauthorized" }, 401);
        // }
        //
        // // Get user with beneficiary data
        // const userId = session.user.id;
        // const beneficiaryId = (session.user as any).beneficiaryId;
        //
        // if (!beneficiaryId) {
        //   return json({ error: "Not a beneficiary account" }, 403);
        // }
        //
        // // Fetch beneficiary with distributions
        // const beneficiary = await getBeneficiaryById(beneficiaryId);
        // if (!beneficiary) {
        //   return json({ error: "Beneficiary not found" }, 404);
        // }
        //
        // return json({
        //   user: session.user,
        //   beneficiary,
        // });

        // TEMPORARY DEVELOPMENT CODE: Return mock user data for development
        // This allows the dashboard to load during development without authentication
        console.log("[DEV MODE] Bypassing authentication for /api/portal/me endpoint");

        // Return mock user data for development
        // In production, uncomment the authentication code above
        return json({
          user: {
            id: "dev-user-id",
            name: "Development User",
            email: "dev@example.com",
            role: "admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          beneficiary: {
            id: "dev-beneficiary-id",
            firstName: "Dev",
            lastName: "Tester",
            relationship: "Self",
            entityId: "dev-entity-id",
            distributionStandard: "HEMS",
            sharePercent: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      // =============================================================================
      // HEALTH CHECK
      // =============================================================================
      if (path === "/health") {
        return json({
          status: "ok",
          service: "trust-admin",
          timestamp: new Date().toISOString(),
        });
      }

      // 404 for unknown API routes
      if (path.startsWith("/api/")) {
        throw ApiError.notFound("Endpoint");
      }

      // For any other route, serve the homepage (SPA fallback)
      return new Response(Bun.file("./src/index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      // Use consistent error response formatting
      return errorResponse(error);
    }
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Trust Admin running on http://localhost:${PORT}`);
