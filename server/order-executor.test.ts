/**
 * order-executor.test.ts — Tests für Order-Execution
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateOrderExecution,
  placeMarketOrder,
  calculateDynamicTPSL,
  OrderValidation,
  OrderExecutionResult,
} from "./order-executor";

describe("Order Executor Module", () => {
  describe("validateOrderExecution", () => {
    it("should validate order with correct slippage", async () => {
      const mockExchange = {
        fetchBalance: vi.fn().mockResolvedValue({
          USDT: { free: 10000, used: 0, total: 10000 },
        }),
      };

      const result = await validateOrderExecution(
        mockExchange,
        "BTC/USDT",
        "BUY",
        0.1,
        50000,
        50000,
        0.5,
        5000
      );

      expect(result.isValid).toBe(true);
      expect(result.slippageOk).toBe(true);
    });

    it("should reject order with excessive slippage", async () => {
      const mockExchange = {
        fetchBalance: vi.fn().mockResolvedValue({
          USDT: { free: 10000, used: 0, total: 10000 },
        }),
      };

      const result = await validateOrderExecution(
        mockExchange,
        "BTC/USDT",
        "BUY",
        0.1,
        51000, // 2% slippage
        50000,
        0.5, // 0.5% tolerance
        5000
      );

      expect(result.isValid).toBe(false);
      expect(result.slippageOk).toBe(false);
    });

    it("should reject order exceeding max trade size", async () => {
      const mockExchange = {
        fetchBalance: vi.fn().mockResolvedValue({
          USDT: { free: 10000, used: 0, total: 10000 },
        }),
      };

      const result = await validateOrderExecution(
        mockExchange,
        "BTC/USDT",
        "BUY",
        1, // 1 BTC = 50,000 USDT > 5000 max
        50000,
        50000,
        0.5,
        5000
      );

      expect(result.isValid).toBe(false);
      expect(result.sizeOk).toBe(false);
    });

    it("should reject order with insufficient balance", async () => {
      const mockExchange = {
        fetchBalance: vi.fn().mockResolvedValue({
          USDT: { free: 1000, used: 0, total: 1000 },
        }),
      };

      const result = await validateOrderExecution(
        mockExchange,
        "BTC/USDT",
        "BUY",
        0.1, // 0.1 BTC = 5000 USDT > 1000 available
        50000,
        50000,
        0.5,
        10000
      );

      expect(result.isValid).toBe(false);
      expect(result.balanceOk).toBe(false);
    });
  });

  describe("placeMarketOrder", () => {
    it("should execute demo order successfully", async () => {
      const result = await placeMarketOrder(
        "test-key",
        "test-secret",
        "BTC/USDT",
        "BUY",
        0.1,
        50000,
        50000,
        0.5,
        5000,
        true // demo mode
      );

      expect(result.success).toBe(true);
      expect(result.orderId).toContain("DEMO-");
      expect(result.symbol).toBe("BTC/USDT");
      expect(result.side).toBe("BUY");
    });

    it("should handle invalid credentials in real mode", async () => {
      const result = await placeMarketOrder(
        "invalid-key",
        "invalid-secret",
        "BTC/USDT",
        "BUY",
        0.1,
        50000,
        50000,
        0.5,
        5000,
        false // real mode
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return correct order details", async () => {
      const result = await placeMarketOrder(
        "test-key",
        "test-secret",
        "ETH/USDT",
        "SELL",
        1,
        3000,
        3000,
        0.5,
        10000,
        true
      );

      expect(result.symbol).toBe("ETH/USDT");
      expect(result.side).toBe("SELL");
      expect(result.amount).toBe(1);
      expect(result.price).toBe(3000);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe("calculateDynamicTPSL", () => {
    it("should calculate TP/SL for BUY signal", () => {
      const result = calculateDynamicTPSL(100, "BUY", 75, 10);

      expect(result.takeProfit).toBeGreaterThan(100);
      expect(result.stopLoss).toBeLessThan(100);
      expect(result.riskReward).toBeGreaterThan(0);
    });

    it("should calculate TP/SL for SELL signal", () => {
      const result = calculateDynamicTPSL(100, "SELL", 75, 10);

      expect(result.takeProfit).toBeLessThan(100);
      expect(result.stopLoss).toBeGreaterThan(100);
      expect(result.riskReward).toBeGreaterThan(0);
    });

    it("should scale TP/SL based on ATR", () => {
      const smallATR = calculateDynamicTPSL(100, "BUY", 75, 5);
      const largeATR = calculateDynamicTPSL(100, "BUY", 75, 20);

      // Larger ATR should result in wider TP/SL
      expect(largeATR.takeProfit - 100).toBeGreaterThan(smallATR.takeProfit - 100);
      expect(100 - largeATR.stopLoss).toBeGreaterThan(100 - smallATR.stopLoss);
    });

    it("should maintain risk/reward ratio of 1:2", () => {
      const result = calculateDynamicTPSL(100, "BUY", 75, 10);

      const risk = 100 - result.stopLoss;
      const reward = result.takeProfit - 100;

      expect(result.riskReward).toBeGreaterThanOrEqual(2); // TP multiplier = 3, SL multiplier = 1.5 => ratio ~2
    });
  });

  describe("Integration: Order Execution Flow", () => {
    it("should complete full order execution in demo mode", async () => {
      const result = await placeMarketOrder(
        "test-key",
        "test-secret",
        "XRP/USDT",
        "BUY",
        100,
        0.6,
        0.6,
        0.5,
        1000,
        true
      );

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.symbol).toBe("XRP/USDT");
      expect(result.amount).toBe(100);
    });

    it("should calculate correct TP/SL for order", () => {
      const tpsl = calculateDynamicTPSL(0.6, "BUY", 80, 0.02);

      expect(tpsl.takeProfit).toBeGreaterThan(0.6);
      expect(tpsl.stopLoss).toBeLessThan(0.6);
      expect(tpsl.riskReward).toBeGreaterThan(1);
    });
  });
});
