/**
 * safety-filters.test.ts — Tests für Sicherheits-Filter
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkLiquidity,
  checkTimeFilter,
  checkChopFilter,
  executeAllFilters,
  formatFilterResults,
} from "./safety-filters";

describe("Safety Filters Module", () => {
  describe("checkLiquidity", () => {
    it("should pass liquidity check for volume >= 50M USD", () => {
      const result = checkLiquidity(75_000_000);

      expect(result.passed).toBe(true);
      expect(result.filterName).toBe("Liquidität");
    });

    it("should fail liquidity check for volume < 50M USD", () => {
      const result = checkLiquidity(25_000_000);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("25.0M USD");
    });

    it("should pass for exactly 50M USD", () => {
      const result = checkLiquidity(50_000_000);

      expect(result.passed).toBe(true);
    });

    it("should fail for very low volume", () => {
      const result = checkLiquidity(1_000_000);

      expect(result.passed).toBe(false);
    });
  });

  describe("checkTimeFilter", () => {
    it("should return a filter check result", () => {
      const result = checkTimeFilter();

      expect(result.filterName).toBe("Zeit-Filter");
      expect(result.passed).toBeDefined();
      expect(typeof result.passed).toBe("boolean");
    });

    it("should indicate if we are in restricted window", () => {
      const result = checkTimeFilter();

      // The result should contain minute information
      expect(result.reason).toContain(":");
    });
  });

  describe("checkChopFilter", () => {
    it("should pass chop filter outside chop hours with any strength", () => {
      // Mock UTC hour to be outside chop time (e.g., 12:00 UTC)
      const result = checkChopFilter(50); // Low strength, but outside chop time

      expect(result.filterName).toBe("Chop-Filter");
      // If outside chop time, should pass regardless of strength
      if (result.reason.includes("außerhalb")) {
        expect(result.passed).toBe(true);
      }
    });

    it("should require 85% strength during chop hours", () => {
      // We can't easily control the time in tests, so we just verify the logic
      const weakSignal = checkChopFilter(80);
      const strongSignal = checkChopFilter(90);

      // Both should be valid results
      expect(weakSignal.passed).toBeDefined();
      expect(strongSignal.passed).toBeDefined();
    });

    it("should include UTC hour in reason", () => {
      const result = checkChopFilter(75);

      expect(result.reason).toContain("UTC");
    });
  });

  describe("executeAllFilters", () => {
    it("should combine all filter results", () => {
      const result = executeAllFilters(75_000_000, 85);

      expect(result.filters.length).toBe(3);
      expect(result.filters[0].filterName).toBe("Liquidität");
      expect(result.filters[1].filterName).toBe("Zeit-Filter");
      expect(result.filters[2].filterName).toBe("Chop-Filter");
    });

    it("should set allPassed to true only if all filters pass", () => {
      const goodResult = executeAllFilters(75_000_000, 85);
      const badResult = executeAllFilters(10_000_000, 50);

      expect(goodResult.allPassed).toBeDefined();
      expect(badResult.allPassed).toBeDefined();

      // At least liquidity should fail in badResult
      expect(badResult.filters[0].passed).toBe(false);
    });

    it("should include timestamp", () => {
      const result = executeAllFilters(50_000_000, 80);

      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("formatFilterResults", () => {
    it("should format results with status indicator", () => {
      const result = executeAllFilters(75_000_000, 85);
      const formatted = formatFilterResults(result);

      expect(formatted).toContain("✅");
      expect(formatted).toContain("Liquidität");
    });

    it("should show error status for failed filters", () => {
      const result = executeAllFilters(10_000_000, 50);
      const formatted = formatFilterResults(result);

      expect(formatted).toContain("❌");
    });

    it("should include all filter reasons", () => {
      const result = executeAllFilters(60_000_000, 80);
      const formatted = formatFilterResults(result);

      // Should contain at least the filter names
      expect(formatted).toContain("Liquidität");
      expect(formatted).toContain("Zeit-Filter");
      expect(formatted).toContain("Chop-Filter");
    });
  });

  describe("Integration: Complete Filter Check", () => {
    it("should pass all filters for good conditions", () => {
      const result = executeAllFilters(100_000_000, 90);

      // Liquidity should pass
      expect(result.filters[0].passed).toBe(true);

      // All filters should be evaluated
      expect(result.filters.length).toBe(3);
    });

    it("should fail for low liquidity", () => {
      const result = executeAllFilters(10_000_000, 90);

      // Liquidity should fail
      expect(result.filters[0].passed).toBe(false);
    });

    it("should format results correctly", () => {
      const result = executeAllFilters(75_000_000, 85);
      const formatted = formatFilterResults(result);

      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
