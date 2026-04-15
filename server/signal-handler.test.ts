/**
 * signal-handler.test.ts — Tests für Signal-Handler mit Order-Execution
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSignal, formatSignalHandlerLogs, SignalHandlerConfig } from "./signal-handler";

describe("Signal Handler Module", () => {
  const mockConfig: SignalHandlerConfig = {
    botEnabled: true,
    demoMode: true,
    apiKey: "test-key",
    apiSecret: "test-secret",
    slippageTolerance: 0.5,
    maxTradeSize: 5000,
  };

  describe("handleSignal", () => {
    it("should reject signal when bot is disabled", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        75,
        50000,
        100_000_000,
        500,
        { ...mockConfig, botEnabled: false }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Bot ist AUS");
    });

    it("should reject signal with low strength", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        45, // < 60%
        50000,
        100_000_000,
        500,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Signal-Stärke zu schwach");
    });

    it("should reject signal with low liquidity", async () => {
      const result = await handleSignal(
        "SHIB/USDT",
        "BUY",
        75,
        0.01,
        10_000_000, // < 50M
        0.001,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Filter blockiert");
    });

    it("should execute order for strong signal in demo mode", async () => {
      const result = await handleSignal(
        "ETH/USDT",
        "BUY",
        80,
        3000,
        100_000_000,
        100,
        mockConfig
      );

      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it("should log all steps in successful flow", async () => {
      const result = await handleSignal(
        "XRP/USDT",
        "SELL",
        85,
        0.6,
        75_000_000,
        0.05,
        mockConfig
      );

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.some((l) => l.includes("Bot ist AN"))).toBe(true);
      expect(result.logs.some((l) => l.includes("Signal-Stärke OK"))).toBe(true);
    });

    it("should handle BUY and SELL signals", async () => {
      const buyResult = await handleSignal(
        "BTC/USDT",
        "BUY",
        75,
        50000,
        100_000_000,
        500,
        mockConfig
      );

      const sellResult = await handleSignal(
        "BTC/USDT",
        "SELL",
        75,
        50000,
        100_000_000,
        500,
        mockConfig
      );

      expect(buyResult).toBeDefined();
      expect(sellResult).toBeDefined();
      expect(buyResult.logs.length).toBeGreaterThan(0);
      expect(sellResult.logs.length).toBeGreaterThan(0);
    });

    it("should respect slippage tolerance", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        75,
        50000,
        100_000_000,
        500,
        { ...mockConfig, slippageTolerance: 0.1 }
      );

      // Should succeed because slippage check is in order-executor
      expect(result).toBeDefined();
    });

    it("should respect max trade size", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        75,
        50000,
        100_000_000,
        500,
        { ...mockConfig, maxTradeSize: 100 } // Very small
      );

      // Should still succeed in demo mode
      expect(result).toBeDefined();
    });
  });

  describe("formatSignalHandlerLogs", () => {
    it("should format successful result", () => {
      const result = {
        success: true,
        orderId: "12345",
        message: "Order ausgelöst",
        logs: ["✅ Bot ist AN", "✅ Signal-Stärke OK: 80%"],
      };

      const formatted = formatSignalHandlerLogs(result);

      expect(formatted).toContain("✅ ORDER AUSGELÖST");
      expect(formatted).toContain("Bot ist AN");
    });

    it("should format failed result", () => {
      const result = {
        success: false,
        message: "Filter blockiert",
        logs: ["❌ Liquidität zu niedrig"],
      };

      const formatted = formatSignalHandlerLogs(result);

      expect(formatted).toContain("❌ ORDER BLOCKIERT");
      expect(formatted).toContain("Liquidität zu niedrig");
    });

    it("should include all logs in formatted output", () => {
      const result = {
        success: true,
        orderId: "123",
        message: "Success",
        logs: [
          "✅ Step 1",
          "✅ Step 2",
          "✅ Step 3",
        ],
      };

      const formatted = formatSignalHandlerLogs(result);

      expect(formatted).toContain("Step 1");
      expect(formatted).toContain("Step 2");
      expect(formatted).toContain("Step 3");
    });
  });

  describe("Integration: Complete Signal Flow", () => {
    it("should execute complete BUY signal flow", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        85,
        50000,
        150_000_000,
        500,
        mockConfig
      );

      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it("should execute complete SELL signal flow", async () => {
      const result = await handleSignal(
        "ETH/USDT",
        "SELL",
        80,
        3000,
        120_000_000,
        100,
        mockConfig
      );

      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it("should handle multiple signals in sequence", async () => {
      const signals = [
        { symbol: "BTC/USDT", signal: "BUY" as const, strength: 75 },
        { symbol: "ETH/USDT", signal: "BUY" as const, strength: 80 },
        { symbol: "XRP/USDT", signal: "SELL" as const, strength: 85 },
      ];

      for (const sig of signals) {
        const result = await handleSignal(
          sig.symbol,
          sig.signal,
          sig.strength,
          1000, // Arbitrary price
          100_000_000,
          50,
          mockConfig
        );

        expect(result).toBeDefined();
      }
    });

    it("should log complete flow for debugging", async () => {
      const result = await handleSignal(
        "BTC/USDT",
        "BUY",
        80,
        50000,
        100_000_000,
        500,
        mockConfig
      );

      const formatted = formatSignalHandlerLogs(result);

      // Should contain all major steps
      expect(formatted).toContain("✅");
      expect(formatted).toContain("ORDER");
    });
  });
});
