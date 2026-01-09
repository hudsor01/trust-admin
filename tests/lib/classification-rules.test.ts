import { describe, test, expect } from "bun:test";
import {
  classifyTransaction,
  isPrincipalTransaction,
  getClassificationReason,
  type AllocationClass,
  type IncomeType,
  type ExpenseType,
} from "../../src/lib/classification-rules";

/**
 * Unit tests for Principal/Income Classification Rules
 * Based on Texas Property Code 116 (Uniform Principal and Income Act)
 */

describe("Principal vs Income Classification Rules", () => {
  describe("Income Types", () => {
    test("Regular earnings are classified as INCOME", () => {
      expect(classifyTransaction("DIVIDEND", null)).toBe("INCOME");
      expect(classifyTransaction("INTEREST", null)).toBe("INCOME");
      expect(classifyTransaction("RENT", null)).toBe("INCOME");
      expect(classifyTransaction("ROYALTY", null)).toBe("INCOME");
    });

    test("Capital transactions are classified as PRINCIPAL", () => {
      expect(classifyTransaction("CAPITAL_GAIN", null)).toBe("PRINCIPAL");
      expect(classifyTransaction("SALE_PROCEEDS", null)).toBe("PRINCIPAL");
      expect(classifyTransaction("DISTRIBUTION", null)).toBe("PRINCIPAL");
    });

    test("Unknown income type defaults to PRINCIPAL (conservative)", () => {
      expect(classifyTransaction("OTHER", null)).toBe("PRINCIPAL");
    });
  });

  describe("Expense Types", () => {
    test("Ordinary expenses are charged to INCOME", () => {
      expect(classifyTransaction(null, "TAX")).toBe("INCOME");
      expect(classifyTransaction(null, "INSURANCE")).toBe("INCOME");
      expect(classifyTransaction(null, "MAINTENANCE")).toBe("INCOME");
      expect(classifyTransaction(null, "REPAIR")).toBe("INCOME");
      expect(classifyTransaction(null, "UTILITY")).toBe("INCOME");
    });

    test("Administrative expenses are charged to INCOME", () => {
      expect(classifyTransaction(null, "PROFESSIONAL_FEE")).toBe("INCOME");
      expect(classifyTransaction(null, "TRUSTEE_FEE")).toBe("INCOME");
      expect(classifyTransaction(null, "FILING_FEE")).toBe("INCOME");
    });

    test("Unknown expense type defaults to INCOME (most expenses are ordinary)", () => {
      expect(classifyTransaction(null, "OTHER")).toBe("INCOME");
    });
  });

  describe("Special Rules (Highest Priority)", () => {
    test("Capital improvements are charged to PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "CAPITAL_IMPROVEMENT")).toBe("PRINCIPAL");
    });

    test("Insurance proceeds for destroyed assets replace PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "INSURANCE_PROCEEDS")).toBe("PRINCIPAL");
    });

    test("Condemnation proceeds replace PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "CONDEMNATION_PROCEEDS")).toBe("PRINCIPAL");
    });

    test("Stock splits are PRINCIPAL transactions", () => {
      expect(classifyTransaction(null, null, "STOCK_SPLIT")).toBe("PRINCIPAL");
    });

    test("Return of capital is PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "RETURN_OF_CAPITAL")).toBe("PRINCIPAL");
    });

    test("Special rules override type-based classifications", () => {
      // Even if it has an income type, special category takes precedence
      expect(classifyTransaction("INTEREST", null, "CAPITAL_IMPROVEMENT")).toBe("PRINCIPAL");
    });

    test("Special rule categories are case-insensitive", () => {
      expect(classifyTransaction(null, null, "capital_improvement")).toBe("PRINCIPAL");
      expect(classifyTransaction(null, null, "Capital_Improvement")).toBe("PRINCIPAL");
    });
  });

  describe("isPrincipalTransaction Helper", () => {
    test("Returns true for PRINCIPAL transactions", () => {
      expect(isPrincipalTransaction("CAPITAL_GAIN", null)).toBe(true);
      expect(isPrincipalTransaction(null, null, "CAPITAL_IMPROVEMENT")).toBe(true);
    });

    test("Returns false for INCOME transactions", () => {
      expect(isPrincipalTransaction("DIVIDEND", null)).toBe(false);
      expect(isPrincipalTransaction(null, "TAX")).toBe(false);
    });
  });

  describe("Default Behavior", () => {
    test("Null/undefined for all parameters defaults to PRINCIPAL (conservative)", () => {
      expect(classifyTransaction(null, null, null)).toBe("PRINCIPAL");
      expect(classifyTransaction(undefined, undefined, undefined)).toBe("PRINCIPAL");
    });

    test("Unknown category with no type defaults to PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "UNKNOWN_CATEGORY")).toBe("PRINCIPAL");
    });
  });

  describe("Texas Property Code 116 Compliance", () => {
    test("Rental income from real property → INCOME", () => {
      expect(classifyTransaction("RENT", null)).toBe("INCOME");
      expect(getClassificationReason("RENT", null)).toContain("regular earnings");
    });

    test("Property tax on rental → INCOME", () => {
      expect(classifyTransaction(null, "TAX")).toBe("INCOME");
      expect(getClassificationReason(null, "TAX")).toContain("ordinary expense");
    });

    test("Sale of trust asset → PRINCIPAL", () => {
      expect(classifyTransaction("SALE_PROCEEDS", null)).toBe("PRINCIPAL");
      expect(getClassificationReason("SALE_PROCEEDS", null)).toContain("corpus/capital");
    });

    test("Roof replacement (capital improvement) → PRINCIPAL", () => {
      expect(classifyTransaction(null, null, "CAPITAL_IMPROVEMENT")).toBe("PRINCIPAL");
      expect(getClassificationReason(null, null, "CAPITAL_IMPROVEMENT")).toContain("Texas Property Code 116");
    });

    test("Dividend from stocks → INCOME", () => {
      expect(classifyTransaction("DIVIDEND", null)).toBe("INCOME");
    });

    test("Stock market capital gain → PRINCIPAL", () => {
      expect(classifyTransaction("CAPITAL_GAIN", null)).toBe("PRINCIPAL");
    });

    test("Interest from bonds → INCOME", () => {
      expect(classifyTransaction("INTEREST", null)).toBe("INCOME");
    });

    test("Trustee compensation → INCOME", () => {
      expect(classifyTransaction(null, "TRUSTEE_FEE")).toBe("INCOME");
    });
  });

  describe("Real-World Scenarios", () => {
    test("Scenario: Rental property monthly operations", () => {
      // Rent collected → INCOME
      expect(classifyTransaction("RENT", null)).toBe("INCOME");

      // Property insurance premium → INCOME (ordinary expense)
      expect(classifyTransaction(null, "INSURANCE")).toBe("INCOME");

      // Plumbing repair → INCOME (maintenance, not improvement)
      expect(classifyTransaction(null, "REPAIR")).toBe("INCOME");

      // Utilities → INCOME
      expect(classifyTransaction(null, "UTILITY")).toBe("INCOME");

      // New HVAC system → PRINCIPAL (capital improvement)
      expect(classifyTransaction(null, null, "CAPITAL_IMPROVEMENT")).toBe("PRINCIPAL");
    });

    test("Scenario: Investment account activity", () => {
      // Quarterly dividend → INCOME
      expect(classifyTransaction("DIVIDEND", null)).toBe("INCOME");

      // Bond interest → INCOME
      expect(classifyTransaction("INTEREST", null)).toBe("INCOME");

      // Sold stock at profit → PRINCIPAL
      expect(classifyTransaction("CAPITAL_GAIN", null)).toBe("PRINCIPAL");

      // Brokerage fee → INCOME (administrative)
      expect(classifyTransaction(null, "PROFESSIONAL_FEE")).toBe("INCOME");
    });

    test("Scenario: Trust administration costs", () => {
      // Trustee annual fee → INCOME
      expect(classifyTransaction(null, "TRUSTEE_FEE")).toBe("INCOME");

      // Attorney fees for trust accounting → INCOME
      expect(classifyTransaction(null, "PROFESSIONAL_FEE")).toBe("INCOME");

      // County filing fees → INCOME
      expect(classifyTransaction(null, "FILING_FEE")).toBe("INCOME");
    });

    test("Scenario: Sale of trust vehicle", () => {
      // Sale proceeds → PRINCIPAL (corpus transaction)
      expect(classifyTransaction("SALE_PROCEEDS", null)).toBe("PRINCIPAL");
    });

    test("Scenario: Fire insurance claim", () => {
      // Insurance proceeds for destroyed property → PRINCIPAL
      expect(classifyTransaction(null, null, "INSURANCE_PROCEEDS")).toBe("PRINCIPAL");
    });
  });

  describe("Edge Cases", () => {
    test("Both income and expense type provided (income takes precedence)", () => {
      // This shouldn't happen in practice, but test priority
      expect(classifyTransaction("DIVIDEND", "TAX")).toBe("INCOME");
    });

    test("Category overrides both income and expense types", () => {
      expect(classifyTransaction("DIVIDEND", "TAX", "CAPITAL_IMPROVEMENT")).toBe("PRINCIPAL");
    });

    test("Empty string category is ignored", () => {
      expect(classifyTransaction("DIVIDEND", null, "")).toBe("INCOME");
    });
  });

  describe("Classification Explanations", () => {
    test("Provides human-readable explanation for income types", () => {
      const reason = getClassificationReason("RENT", null);
      expect(reason).toContain("RENT");
      expect(reason).toContain("regular earnings");
    });

    test("Provides human-readable explanation for expense types", () => {
      const reason = getClassificationReason(null, "TAX");
      expect(reason).toContain("TAX");
      expect(reason).toContain("ordinary expense");
    });

    test("Provides human-readable explanation for special rules", () => {
      const reason = getClassificationReason(null, null, "CAPITAL_IMPROVEMENT");
      expect(reason).toContain("CAPITAL_IMPROVEMENT");
      expect(reason).toContain("Texas Property Code 116");
    });

    test("Provides default explanation when nothing specified", () => {
      const reason = getClassificationReason(null, null, null);
      expect(reason).toContain("default");
    });
  });
});
