import { describe, test, expect, beforeAll } from "bun:test";

/**
 * API integration tests for Trust Admin
 *
 * These tests require a running server on localhost:5050.
 * They will be skipped if the server is not reachable.
 */

const BASE_URL = "http://localhost:5050";

// Check if server is running before tests
let serverAvailable = false;

describe("API Endpoints", () => {
  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      serverAvailable = response.ok;
    } catch {
      serverAvailable = false;
      console.log("⚠️  Server not running - skipping API integration tests");
    }
  });

  describe("Health Check", () => {
    test("GET /health returns ok status", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.service).toBe("trust-admin");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Entities API", () => {
    test("GET /api/entities returns array", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/entities`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("GET /api/entities/:id returns 404 for non-existent entity", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/entities/00000000-0000-0000-0000-000000000000`
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Beneficiaries API", () => {
    test("GET /api/beneficiaries returns array", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/beneficiaries`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Tasks API", () => {
    test("GET /api/tasks returns array", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/tasks`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Contacts API", () => {
    test("GET /api/contacts returns array", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/contacts`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("404 Handling", () => {
    test("Unknown API route returns 404 with proper error format", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/unknown-route`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBeDefined();
    });

    test("GET non-existent entity returns proper error format", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/entities/nonexistent-id-12345`
      );
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Validation", () => {
    test("POST /api/entities with missing name returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "TRUST",
          // name is missing
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.message).toContain("Validation failed");
    });

    test("POST /api/tasks with missing title returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "OTHER",
          // title is missing
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/vehicles with invalid entityId returns validation or reference error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: "nonexistent-entity-id",
          year: 2024,
          make: "Toyota",
          model: "Camry",
          vin: "12345678901234567",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      // Can be VALIDATION_ERROR (schema fails first) or REFERENCE_ERROR (entity not found)
      expect(["VALIDATION_ERROR", "REFERENCE_ERROR"]).toContain(data.error.code);
    });

    test("POST /api/liabilities with negative amount returns validation error", async () => {
      if (!serverAvailable) return;

      // First get a valid entity ID
      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();

      if (!entities.length) {
        console.log("Skipping test - no entities available");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/liabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          creditor: "Test Creditor",
          liabilityType: "LOAN",
          originalAmount: "-1000", // Invalid negative amount
          currentBalance: "1000",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Custom Endpoint Validation", () => {
    test("POST /api/liabilities/:id/record-payment without amount returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/liabilities/test-id/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: "2024-01-01",
            // amount is missing
          }),
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.amount).toBeDefined();
    });

    test("POST /api/liabilities/:id/record-payment with invalid liability returns not found", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/liabilities/nonexistent-id/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: "2024-01-01",
            amount: "100.00",
          }),
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    test("POST /api/liabilities/:id/record-payment with zero amount returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/liabilities/test-id/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: "2024-01-01",
            amount: "0",
          }),
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/hems-requests/:id/approve with negative amount returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${BASE_URL}/api/hems-requests/test-id/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedAmount: "-100",
          }),
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Format Validation", () => {
    test("POST /api/entities with invalid EIN format returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Entity",
          entityType: "TRUST",
          ein: "invalid-ein", // Should be XX-XXXXXXX
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.ein).toBeDefined();
    });

    test("POST /api/beneficiaries with invalid email returns validation error", async () => {
      if (!serverAvailable) return;

      // Get entity first
      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          firstName: "Test",
          lastName: "User",
          email: "not-an-email", // Invalid email format
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.email).toBeDefined();
    });

    test("POST /api/beneficiaries with invalid taxId format returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          firstName: "Test",
          lastName: "User",
          taxId: "12345", // Should be XXX-XX-XXXX
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.taxId).toBeDefined();
    });

    test("POST /api/vehicles with invalid VIN length returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          year: 2024,
          make: "Toyota",
          model: "Camry",
          vin: "SHORT", // Should be exactly 17 characters
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.vin).toBeDefined();
    });

    test("POST /api/homesteads with invalid state code returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/homesteads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          streetAddress: "123 Main St",
          city: "Austin",
          state: "Texas", // Should be 2-letter code
          zip: "78701",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.state).toBeDefined();
    });

    test("POST /api/homesteads with invalid zip format returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/homesteads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          streetAddress: "123 Main St",
          city: "Austin",
          state: "TX",
          zip: "7870", // Should be XXXXX or XXXXX-XXXX
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.zip).toBeDefined();
    });

    test("POST /api/bank-accounts with invalid routing number returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/bank-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          institution: "Test Bank",
          accountNumber: "1234567890",
          routingNumber: "12345", // Should be exactly 9 digits
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details?.fields?.routingNumber).toBeDefined();
    });
  });

  describe("Range Validation", () => {
    test("POST /api/beneficiaries with sharePercent over 100 returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          firstName: "Test",
          lastName: "User",
          sharePercent: "150", // Should be 0-100
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/liabilities with interestRate over 100 returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/liabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          creditor: "Test Creditor",
          liabilityType: "LOAN",
          originalAmount: "1000",
          currentBalance: "1000",
          interestRate: "150", // Should be 0-100
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/vehicles with year in future (beyond next year) returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          year: 2099, // Too far in future
          make: "Toyota",
          model: "Camry",
          vin: "12345678901234567",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/vehicles with negative mileage returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          year: 2024,
          make: "Toyota",
          model: "Camry",
          vin: "12345678901234567",
          mileage: -100, // Should be >= 0
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/trustees with order less than 1 returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/trustees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          name: "Test Trustee",
          order: 0, // Should be >= 1
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/liabilities with paymentDueDay over 31 returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/liabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          creditor: "Test Creditor",
          liabilityType: "LOAN",
          originalAmount: "1000",
          currentBalance: "1000",
          paymentDueDay: 32, // Should be 1-31
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Reference Validation", () => {
    test("POST /api/distributions with nonexistent entityId returns reference error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/distributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: "nonexistent-entity-id",
          beneficiaryId: "nonexistent-beneficiary-id",
          amount: "1000",
          distributionType: "DISCRETIONARY",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(["VALIDATION_ERROR", "REFERENCE_ERROR"]).toContain(data.error.code);
    });

    test("POST /api/hems-requests with nonexistent beneficiaryId returns reference error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: "nonexistent-beneficiary-id",
          amountRequested: "1000",
          justification: "Test request",
          category: "HEALTH",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(["VALIDATION_ERROR", "REFERENCE_ERROR"]).toContain(data.error.code);
    });

    test("POST /api/specific-bequests with nonexistent entityId returns reference error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/specific-bequests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: "nonexistent-entity-id",
          description: "Test bequest",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(["VALIDATION_ERROR", "REFERENCE_ERROR"]).toContain(data.error.code);
    });
  });

  describe("Trust Accounting Validation", () => {
    test("POST /api/trust-accounting with zero amount returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/trust-accounting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          entryType: "INCOME",
          description: "Test entry",
          amount: "0", // Cannot be zero
          accountingDate: "2024-01-01",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/trust-accounting with missing description returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const response = await fetch(`${BASE_URL}/api/trust-accounting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          entryType: "INCOME",
          // description is missing
          amount: "100",
          accountingDate: "2024-01-01",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("HEMS Request Validation", () => {
    test("POST /api/hems-requests with zero amountRequested returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const beneficiariesResponse = await fetch(`${BASE_URL}/api/beneficiaries`);
      const beneficiaries = await beneficiariesResponse.json();
      if (!beneficiaries.length) return;

      const response = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: beneficiaries[0].id,
          amountRequested: "0", // Must be > 0
          justification: "Test request",
          category: "HEALTH",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/hems-requests with missing justification returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const beneficiariesResponse = await fetch(`${BASE_URL}/api/beneficiaries`);
      const beneficiaries = await beneficiariesResponse.json();
      if (!beneficiaries.length) return;

      const response = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: beneficiaries[0].id,
          amountRequested: "1000",
          // justification is missing
          category: "HEALTH",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Valuation Validation", () => {
    test("POST /api/valuations with negative value returns validation error", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: "vehicle",
          assetId: "test-asset-id",
          value: "-1000", // Must be >= 0
          valuationType: "APPRAISAL",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Immutable Resource Protection", () => {
    test("PUT /api/liability-payments/:id returns 403 forbidden", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/liability-payments/test-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "500" }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toContain("cannot be modified");
    });

    test("PUT /api/trustee-fee-schedules/:id returns 403 forbidden", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/trustee-fee-schedules/test-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effectiveDate: "2024-01-01" }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    test("PUT /api/activity-logs/:id returns 403 forbidden", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/activity-logs/test-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE" }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    test("DELETE /api/activity-logs/:id returns 403 forbidden", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${BASE_URL}/api/activity-logs/test-id`, {
        method: "DELETE",
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toContain("cannot be deleted");
    });
  });

  describe("Trustee Fee Validation", () => {
    test("POST /api/trustee-fee-schedules with fee percent over 100 returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const trusteesResponse = await fetch(`${BASE_URL}/api/trustees`);
      const trustees = await trusteesResponse.json();
      if (!trustees.length) return;

      const response = await fetch(`${BASE_URL}/api/trustee-fee-schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          trusteeId: trustees[0].id,
          effectiveDate: "2024-01-01",
          executorFeePercent: "150", // Should be 0-100
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /api/trustee-fee-entries with negative totalFee returns validation error", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const trusteesResponse = await fetch(`${BASE_URL}/api/trustees`);
      const trustees = await trusteesResponse.json();
      if (!trustees.length) return;

      const response = await fetch(`${BASE_URL}/api/trustee-fee-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          trusteeId: trustees[0].id,
          scheduleId: "test-schedule-id",
          totalFee: "-100", // Must be >= 0
          periodStart: "2024-01-01",
          periodEnd: "2024-03-31",
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // =============================================================================
  // CRITICAL WORKFLOW TESTS (Phase 3)
  // =============================================================================

  describe("Critical Workflow: Liability Payment Recording", () => {
    test("Complete workflow: Create liability → Record payment → Verify balance updated → Verify expense entry created", async () => {
      if (!serverAvailable) return;

      // Get entity
      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) {
        console.log("Skipping test - no entities available");
        return;
      }

      // Step 1: Create a liability
      const createLiabilityResponse = await fetch(`${BASE_URL}/api/liabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          creditor: "Test Bank",
          liabilityType: "MORTGAGE",
          originalAmount: "250000.00",
          currentBalance: "250000.00",
          allocationClass: "PRINCIPAL",
        }),
      });

      expect(createLiabilityResponse.status).toBe(201);
      const liability = await createLiabilityResponse.json();
      expect(liability.id).toBeDefined();
      expect(liability.currentBalance).toBe("250000.00");

      // Step 2: Record a payment
      const paymentResponse = await fetch(
        `${BASE_URL}/api/liabilities/${liability.id}/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: "2024-01-15",
            amount: "2000.00",
            principalPortion: "1500.00",
            interestPortion: "500.00",
            paymentMethod: "CHECK",
            checkNumber: "1001",
          }),
        }
      );

      expect(paymentResponse.status).toBe(200);
      const paymentResult = await paymentResponse.json();
      expect(paymentResult.payment).toBeDefined();
      expect(paymentResult.liability).toBeDefined();
      expect(paymentResult.accountingEntry).toBeDefined();

      // Step 3: Verify liability balance was updated
      expect(paymentResult.liability.currentBalance).toBe("248000.00");

      // Fetch liability to verify persistence
      const verifyLiabilityResponse = await fetch(
        `${BASE_URL}/api/liabilities/${liability.id}`
      );
      const verifiedLiability = await verifyLiabilityResponse.json();
      expect(verifiedLiability.currentBalance).toBe("248000.00");

      // Step 4: Verify payment history
      const paymentsResponse = await fetch(
        `${BASE_URL}/api/liabilities/${liability.id}/payments`
      );
      const payments = await paymentsResponse.json();
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0].amount).toBe("2000.00");
      expect(payments[0].principalPortion).toBe("1500.00");
      expect(payments[0].interestPortion).toBe("500.00");

      // Step 5: Verify trust accounting expense entry was created
      const accountingResponse = await fetch(
        `${BASE_URL}/api/trust-accounting?entityId=${entities[0].id}`
      );
      const accountingEntries = await accountingResponse.json();
      const paymentEntry = accountingEntries.find(
        (e: any) => e.id === paymentResult.accountingEntry.id
      );
      expect(paymentEntry).toBeDefined();
      expect(paymentEntry.entryType).toBe("EXPENSE");
      expect(paymentEntry.amount).toBe("2000.00");
      expect(paymentEntry.isPrincipal).toBe(true); // MORTGAGE allocated to PRINCIPAL

      // Cleanup
      await fetch(`${BASE_URL}/api/liabilities/${liability.id}`, {
        method: "DELETE",
      });
    });

    test("Liability payment with INCOME allocation creates income expense entry", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      // Create liability with INCOME allocation
      const createResponse = await fetch(`${BASE_URL}/api/liabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          creditor: "Utility Company",
          liabilityType: "ACCOUNTS_PAYABLE",
          originalAmount: "500.00",
          currentBalance: "500.00",
          allocationClass: "INCOME", // Allocate to income
        }),
      });

      const liability = await createResponse.json();

      // Record payment
      const paymentResponse = await fetch(
        `${BASE_URL}/api/liabilities/${liability.id}/record-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: "2024-01-15",
            amount: "500.00",
          }),
        }
      );

      const result = await paymentResponse.json();

      // Verify isPrincipal is false (allocated to income)
      const accountingResponse = await fetch(
        `${BASE_URL}/api/trust-accounting?entityId=${entities[0].id}`
      );
      const entries = await accountingResponse.json();
      const entry = entries.find((e: any) => e.id === result.accountingEntry.id);
      expect(entry.isPrincipal).toBe(false);

      // Cleanup
      await fetch(`${BASE_URL}/api/liabilities/${liability.id}`, {
        method: "DELETE",
      });
    });
  });

  describe("Critical Workflow: HEMS Request Approval", () => {
    test("Complete workflow: Create HEMS request → Approve → Verify status change", async () => {
      if (!serverAvailable) return;

      // Get entity and beneficiary
      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const beneficiariesResponse = await fetch(`${BASE_URL}/api/beneficiaries`);
      const beneficiaries = await beneficiariesResponse.json();
      if (!beneficiaries.length) return;

      // Step 1: Create HEMS request
      const createResponse = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: beneficiaries[0].id,
          amountRequested: "5000.00",
          category: "HEALTH",
          justification: "Medical expenses for dental surgery",
          supportingDocs: "Invoice from dentist",
        }),
      });

      expect(createResponse.status).toBe(200);
      const request = await createResponse.json();
      expect(request.status).toBe("PENDING");

      // Step 2: Approve the request
      const approveResponse = await fetch(
        `${BASE_URL}/api/hems-requests/${request.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedAmount: "5000.00",
            notes: "Approved - valid medical expense",
          }),
        }
      );

      expect(approveResponse.status).toBe(200);
      const approved = await approveResponse.json();
      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedAmount).toBe("5000.00");

      // Step 3: Verify status persisted
      const verifyResponse = await fetch(
        `${BASE_URL}/api/hems-requests/${request.id}`
      );
      const verified = await verifyResponse.json();
      expect(verified.status).toBe("APPROVED");
      expect(verified.approvedAmount).toBe("5000.00");

      // Cleanup
      await fetch(`${BASE_URL}/api/hems-requests/${request.id}`, {
        method: "DELETE",
      });
    });

    test("Complete workflow: Create HEMS request → Deny → Verify status and reason", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const beneficiariesResponse = await fetch(`${BASE_URL}/api/beneficiaries`);
      const beneficiaries = await beneficiariesResponse.json();
      if (!beneficiaries.length) return;

      // Step 1: Create HEMS request
      const createResponse = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: beneficiaries[0].id,
          amountRequested: "10000.00",
          category: "OTHER",
          justification: "Personal luxury purchase",
        }),
      });

      const request = await createResponse.json();

      // Step 2: Deny the request
      const denyResponse = await fetch(
        `${BASE_URL}/api/hems-requests/${request.id}/deny`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            denialReason: "Request does not meet HEMS standard - luxury purchase not covered",
          }),
        }
      );

      expect(denyResponse.status).toBe(200);
      const denied = await denyResponse.json();
      expect(denied.status).toBe("DENIED");
      expect(denied.denialReason).toContain("does not meet HEMS standard");

      // Step 3: Verify status persisted
      const verifyResponse = await fetch(
        `${BASE_URL}/api/hems-requests/${request.id}`
      );
      const verified = await verifyResponse.json();
      expect(verified.status).toBe("DENIED");
      expect(verified.denialReason).toBeDefined();

      // Cleanup
      await fetch(`${BASE_URL}/api/hems-requests/${request.id}`, {
        method: "DELETE",
      });
    });

    test("HEMS request approval with partial amount", async () => {
      if (!serverAvailable) return;

      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      const entities = await entitiesResponse.json();
      if (!entities.length) return;

      const beneficiariesResponse = await fetch(`${BASE_URL}/api/beneficiaries`);
      const beneficiaries = await beneficiariesResponse.json();
      if (!beneficiaries.length) return;

      // Create request for $10,000
      const createResponse = await fetch(`${BASE_URL}/api/hems-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entities[0].id,
          beneficiaryId: beneficiaries[0].id,
          amountRequested: "10000.00",
          category: "EDUCATION",
          justification: "Tuition for college courses",
        }),
      });

      const request = await createResponse.json();

      // Approve only $5,000
      const approveResponse = await fetch(
        `${BASE_URL}/api/hems-requests/${request.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedAmount: "5000.00",
            notes: "Partial approval - approved for one semester only",
          }),
        }
      );

      expect(approveResponse.status).toBe(200);
      const approved = await approveResponse.json();
      expect(approved.approvedAmount).toBe("5000.00");
      expect(approved.amountRequested).toBe("10000.00");

      // Cleanup
      await fetch(`${BASE_URL}/api/hems-requests/${request.id}`, {
        method: "DELETE",
      });
    });
  });
});
