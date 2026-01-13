import { describe, expect, test } from "bun:test"
import {
  calculateAge,
  formatCurrency,
  formatDate,
  formatPercent,
  getWithdrawalStatus,
} from "../src/utils/formatters"

describe("formatters", () => {
  describe("formatDate", () => {
    test("formats valid date string", () => {
      // Use a full ISO date to avoid timezone issues
      const result = formatDate("2025-01-15T12:00:00")
      expect(result).toBe("Jan 15, 2025")
    })

    test("returns em dash for null", () => {
      expect(formatDate(null)).toBe("—")
    })

    test("returns em dash for empty string", () => {
      expect(formatDate("")).toBe("—")
    })
  })

  describe("formatCurrency", () => {
    test("formats number correctly", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56")
    })

    test("formats string number correctly", () => {
      expect(formatCurrency("1234.56")).toBe("$1,234.56")
    })

    test("formats large numbers with commas", () => {
      expect(formatCurrency(1234567.89)).toBe("$1,234,567.89")
    })

    test("handles zero", () => {
      expect(formatCurrency(0)).toBe("$0.00")
    })

    test("handles null", () => {
      expect(formatCurrency(null)).toBe("$0.00")
    })

    test("handles invalid string", () => {
      expect(formatCurrency("not a number")).toBe("$0.00")
    })

    test("handles negative numbers", () => {
      expect(formatCurrency(-500)).toBe("-$500.00")
    })
  })

  describe("calculateAge", () => {
    test("calculates age correctly", () => {
      // This will need adjustment based on current date
      const today = new Date()
      const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
      const dob = tenYearsAgo.toISOString().split("T")[0]!
      expect(calculateAge(dob)).toBe(10)
    })

    test("handles birthday not yet occurred this year", () => {
      const today = new Date()
      // Set birthday to next month
      const futureMonth = (today.getMonth() + 1) % 12
      const birthYear = today.getFullYear() - 25
      const dob = `${birthYear}-${String(futureMonth + 1).padStart(2, "0")}-15`
      // Should be 24 since birthday hasn't occurred yet
      const age = calculateAge(dob)
      expect(age).toBe(24)
    })
  })

  describe("getWithdrawalStatus", () => {
    test("returns eligible for past dates", () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const result = getWithdrawalStatus(pastDate.toISOString())
      expect(result.isEligible).toBe(true)
      expect(result.color).toBe("green")
      expect(result.status).toBe("ELIGIBLE NOW")
    })

    test("returns days for near future dates", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const result = getWithdrawalStatus(futureDate.toISOString())
      expect(result.isEligible).toBe(false)
      expect(result.color).toBe("amber")
      expect(result.daysUntil).toBeGreaterThanOrEqual(29)
      expect(result.daysUntil).toBeLessThanOrEqual(31)
    })

    test("returns years for far future dates", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 3)
      const result = getWithdrawalStatus(futureDate.toISOString())
      expect(result.isEligible).toBe(false)
      expect(result.color).toBe("slate")
      expect(result.status).toContain("years")
    })
  })

  describe("formatPercent", () => {
    test("formats number correctly", () => {
      expect(formatPercent(25)).toBe("25.00%")
    })

    test("formats string number correctly", () => {
      expect(formatPercent("33.333")).toBe("33.33%")
    })

    test("handles null", () => {
      expect(formatPercent(null)).toBe("0%")
    })

    test("handles zero", () => {
      expect(formatPercent(0)).toBe("0.00%")
    })

    test("handles invalid string", () => {
      expect(formatPercent("invalid")).toBe("0%")
    })
  })
})
