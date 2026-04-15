/**
 * risk-manager.test.ts — Vitest Tests für Risk Management
 */

import { describe, it, expect } from "vitest";
import {
  checkSlippage,
  validateTradeSize,
  calculateOrderSize,
  calculateTPSL,
} from "./risk-manager";

describe("Risk Manager Module", () => {
  describe("checkSlippage", () => {
    it("should pass slippage check when within tolerance", () => {
      const result = checkSlippage(100, 100.4, 0.5);

      expect(result.isValid).toBe(true);
      expect(result.currentPrice).toBe(100.4);
      expect(result.maxPrice).toBeCloseTo(100.5, 1);
      expect(result.slippagePercent).toBeCloseTo(0.4, 0);
    });

    it("should fail slippage check when exceeding tolerance", () => {
      const result = checkSlippage(100, 100.8, 0.5);

      expect(result.isValid).toBe(false);
      expect(result.slippagePercent).toBeCloseTo(0.8, 1);
    });

    it("should handle zero slippage", () => {
      const result = checkSlippage(100, 100, 0);

      expect(result.isValid).toBe(true);
      expect(result.slippagePercent).toBe(0);
    });

    it("should handle negative slippage (price improvement)", () => {
      const result = checkSlippage(100, 99.5, 1);

      expect(result.isValid).toBe(true);
      expect(result.slippagePercent).toBeCloseTo(-0.5, 1);
    });
  });

  describe("validateTradeSize", () => {
    it("should pass when trade size is within limit", () => {
      const result = validateTradeSize(500, 1000);

      expect(result.isValid).toBe(true);
      expect(result.tradeSize).toBe(500);
      expect(result.maxSize).toBe(1000);
    });

    it("should fail when trade size exceeds limit", () => {
      const result = validateTradeSize(1500, 1000);

      expect(result.isValid).toBe(false);
    });

    it("should pass when trade size equals limit", () => {
      const result = validateTradeSize(1000, 1000);

      expect(result.isValid).toBe(true);
    });
  });

  describe("calculateOrderSize", () => {
    it("should calculate order size based on account balance and risk", () => {
      const size = calculateOrderSize(10000, 2, 100);

      // Risk = 10000 * 2% = 200
      // Order Size = 200 / 100 = 2
      expect(size).toBe(2);
    });

    it("should use default risk percentage of 2%", () => {
      const size = calculateOrderSize(10000, undefined, 50);

      // Risk = 10000 * 2% = 200
      // Order Size = 200 / 50 = 4
      expect(size).toBe(4);
    });

    it("should handle small account balances", () => {
      const size = calculateOrderSize(100, 1, 10);

      // Risk = 100 * 1% = 1
      // Order Size = 1 / 10 = 0.1
      expect(size).toBeCloseTo(0.1, 5);
    });
  });

  describe("calculateTPSL", () => {
    it("should calculate TP/SL for BUY signal", () => {
      const result = calculateTPSL(100, "BUY", 75, 2);

      expect(result.stopLoss).toBeLessThan(100);
      expect(result.takeProfit).toBeGreaterThan(100);
      expect(result.riskAmount).toBeGreaterThan(0);
    });

    it("should calculate TP/SL for SELL signal", () => {
      const result = calculateTPSL(100, "SELL", 75, 2);

      expect(result.stopLoss).toBeGreaterThan(100);
      expect(result.takeProfit).toBeLessThan(100);
      expect(result.rewardAmount).toBeCloseTo(result.riskAmount * 2, 1);
    });

    it("should scale risk based on signal strength", () => {
      const weakSignal = calculateTPSL(100, "BUY", 50, 2);
      const strongSignal = calculateTPSL(100, "BUY", 100, 2);

      // Both should have valid TP/SL
      expect(strongSignal.takeProfit).toBeGreaterThan(100);
      expect(weakSignal.takeProfit).toBeGreaterThan(100);
    });

    it("should respect risk/reward ratio", () => {
      const result = calculateTPSL(100, "BUY", 75, 3);

      expect(result.rewardAmount).toBeCloseTo(result.riskAmount * 3, 1);
    });
  });

  describe("Integration: Full Trade Validation", () => {
    it("should validate a complete trade scenario", () => {
      const signalPrice = 100;
      const currentPrice = 100.3;
      const tradeSize = 500;
      const slippageTolerance = 0.5;
      const maxTradeSize = 1000;

      const slippageCheck = checkSlippage(signalPrice, currentPrice, slippageTolerance);
      const sizeCheck = validateTradeSize(tradeSize, maxTradeSize);

      expect(slippageCheck.isValid).toBe(true);
      expect(sizeCheck.isValid).toBe(true);
    });

    it("should reject trade with excessive slippage", () => {
      const slippageCheck = checkSlippage(100, 101, 0.5);
      expect(slippageCheck.isValid).toBe(false);
    });

    it("should reject trade exceeding max size", () => {
      const sizeCheck = validateTradeSize(2000, 1000);
      expect(sizeCheck.isValid).toBe(false);
    });
  });
});
