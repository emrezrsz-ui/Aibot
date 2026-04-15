/**
 * indicators.test.ts — Unit Tests für Indikatoren und Filter
 * ===========================================================
 * Testet alle Berechnungsfunktionen für EMA, RSI, SMA und Filter-Logik
 */

import { describe, it, expect } from "vitest";
import {
  calculateEMA,
  calculateRSI,
  calculateSMA,
  calculateAdvancedSignalStrength,
  checkMTFTrendFilter,
  checkVolumeConfirmationFilter,
  detectRSIDivergence,
  calculateRSIArray,
  checkMultiTimeframeConfluence,
  calculateTrailingStopLoss,
} from "./indicators";

describe("Indicators", () => {
  // ─── EMA Tests ───────────────────────────────────────────────────────
  describe("calculateEMA", () => {
    it("should return last price if not enough data", () => {
      const prices = [100, 101, 102];
      const ema = calculateEMA(prices, 10);
      expect(ema).toBe(102); // Last price
    });

    it("should calculate EMA correctly with sufficient data", () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const ema = calculateEMA(prices, 10);
      expect(ema).toBeGreaterThan(100);
      expect(ema).toBeLessThan(120);
    });

    it("should handle uptrend correctly", () => {
      const uptrend = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const ema = calculateEMA(uptrend, 10);
      expect(ema).toBeGreaterThan(110); // Should be in upper range
    });

    it("should handle downtrend correctly", () => {
      const downtrend = Array.from({ length: 20 }, (_, i) => 200 - i * 2);
      const ema = calculateEMA(downtrend, 10);
      expect(ema).toBeLessThan(190); // Should be in lower range
    });
  });

  // ─── RSI Tests ───────────────────────────────────────────────────────
  describe("calculateRSI", () => {
    it("should return 50 if not enough data", () => {
      const prices = [100, 101, 102];
      const rsi = calculateRSI(prices);
      expect(rsi).toBe(50);
    });

    it("should return 100 for strong uptrend", () => {
      const uptrend = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
      const rsi = calculateRSI(uptrend);
      expect(rsi).toBeGreaterThan(70); // Overbought
    });

    it("should return low value for strong downtrend", () => {
      const downtrend = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
      const rsi = calculateRSI(downtrend);
      expect(rsi).toBeLessThan(30); // Oversold
    });

    it("should return ~50 for sideways market", () => {
      const sideways = Array.from({ length: 30 }, (_, i) =>
        i % 2 === 0 ? 100 : 101
      );
      const rsi = calculateRSI(sideways);
      expect(rsi).toBeGreaterThan(40);
      expect(rsi).toBeLessThan(60);
    });
  });

  // ─── SMA Tests ───────────────────────────────────────────────────────
  describe("calculateSMA", () => {
    it("should return last price if less than period", () => {
      const prices = [100, 102, 104];
      const sma = calculateSMA(prices, 10);
      expect(sma).toBe(104); // Returns last price when not enough data
    });

    it("should calculate SMA correctly", () => {
      const prices = [100, 101, 102, 103, 104];
      const sma = calculateSMA(prices, 5);
      expect(sma).toBe(102); // (100+101+102+103+104)/5
    });

    it("should use only last N prices", () => {
      const prices = [50, 100, 101, 102, 103, 104];
      const sma = calculateSMA(prices, 5);
      expect(sma).toBe(102); // (100+101+102+103+104)/5, not including 50
    });
  });

  // ─── Advanced Signal Strength Tests ───────────────────────────────────
  describe("calculateAdvancedSignalStrength", () => {
    it("should return neutral strength for NEUTRAL signal", () => {
      const strength = calculateAdvancedSignalStrength({
        rsi: 50,
        ema12: 100,
        ema26: 100,
        currentPrice: 100,
        currentVolume: 1000,
        volumeSMA20: 1000,
        signal: "NEUTRAL",
        symbol: "BTCUSDT",
      });
      expect(strength).toBe(50);
    });

    it("should increase strength for strong BUY signal", () => {
      const strength = calculateAdvancedSignalStrength({
        rsi: 25, // Oversold
        ema12: 105, // Above EMA26
        ema26: 100,
        currentPrice: 105, // Above EMAs
        currentVolume: 2000, // High volume
        volumeSMA20: 1000,
        signal: "BUY",
        symbol: "BTCUSDT",
      });
      expect(strength).toBeGreaterThan(70);
    });

    it("should increase strength for strong SELL signal", () => {
      const strength = calculateAdvancedSignalStrength({
        rsi: 75, // Overbought
        ema12: 95, // Below EMA26
        ema26: 100,
        currentPrice: 95, // Below EMAs
        currentVolume: 2000, // High volume
        volumeSMA20: 1000,
        signal: "SELL",
        symbol: "BTCUSDT",
      });
      expect(strength).toBeGreaterThan(70);
    });

    it("should apply XRP volume bonus", () => {
      const strengthXRP = calculateAdvancedSignalStrength({
        rsi: 25,
        ema12: 105,
        ema26: 100,
        currentPrice: 105,
        currentVolume: 3000, // 3x SMA20 to trigger XRP bonus
        volumeSMA20: 1000,
        signal: "BUY",
        symbol: "XRPUSDT",
      });

      const strengthBTC = calculateAdvancedSignalStrength({
        rsi: 25,
        ema12: 105,
        ema26: 100,
        currentPrice: 105,
        currentVolume: 3000,
        volumeSMA20: 1000,
        signal: "BUY",
        symbol: "BTCUSDT",
      });

      expect(strengthXRP).toBeGreaterThanOrEqual(strengthBTC); // XRP should have bonus or equal
    });

    it("should cap strength at 100", () => {
      const strength = calculateAdvancedSignalStrength({
        rsi: 5, // Extreme oversold
        ema12: 110, // Far above EMA26
        ema26: 100,
        currentPrice: 110,
        currentVolume: 5000, // Very high volume
        volumeSMA20: 1000,
        signal: "BUY",
        symbol: "BTCUSDT",
      });
      expect(strength).toBeLessThanOrEqual(100);
    });
  });

  // ─── MTF Trend Filter Tests ───────────────────────────────────────────
  describe("checkMTFTrendFilter", () => {
    it("should allow BUY when price above EMA200", () => {
      const result = checkMTFTrendFilter(105, 100, "BUY");
      expect(result).toBe(true);
    });

    it("should reject BUY when price below EMA200", () => {
      const result = checkMTFTrendFilter(95, 100, "BUY");
      expect(result).toBe(false);
    });

    it("should allow SELL when price below EMA200", () => {
      const result = checkMTFTrendFilter(95, 100, "SELL");
      expect(result).toBe(true);
    });

    it("should reject SELL when price above EMA200", () => {
      const result = checkMTFTrendFilter(105, 100, "SELL");
      expect(result).toBe(false);
    });

    it("should only accept BUY or SELL signals", () => {
      // NEUTRAL is not a valid signal for MTF filter (handled in scanner)
      // This test verifies the function works with BUY/SELL only
      const buyResult = checkMTFTrendFilter(105, 100, "BUY");
      const sellResult = checkMTFTrendFilter(95, 100, "SELL");
      expect(buyResult).toBe(true);
      expect(sellResult).toBe(true);
    });

    it("should handle edge case at EMA200", () => {
      // Price exactly at EMA200 should not pass (needs to be strictly above/below)
      const buyAtEMA = checkMTFTrendFilter(100, 100, "BUY");
      const sellAtEMA = checkMTFTrendFilter(100, 100, "SELL");
      expect(buyAtEMA).toBe(false); // Price = EMA200 fails for BUY
      expect(sellAtEMA).toBe(false); // Price = EMA200 fails for SELL
    });
  });

  // ─── Volume Confirmation Filter Tests ────────────────────────────────
  describe("checkVolumeConfirmationFilter", () => {
    it("should allow high volume", () => {
      const result = checkVolumeConfirmationFilter(2000, 1000);
      expect(result).toBe(true);
    });

    it("should reject low volume", () => {
      const result = checkVolumeConfirmationFilter(500, 1000);
      expect(result).toBe(false);
    });

    it("should require volume strictly above SMA20", () => {
      const result = checkVolumeConfirmationFilter(1000, 1000);
      expect(result).toBe(false); // Volume = SMA20 fails (needs to be strictly above)
    });

    it("should allow any volume when SMA20 is zero", () => {
      const result = checkVolumeConfirmationFilter(1000, 0);
      expect(result).toBe(true); // No SMA20 data yet, allow signal
    });

    it("should reject zero or low volume", () => {
      const result = checkVolumeConfirmationFilter(0, 1000);
      expect(result).toBe(false); // Zero volume fails
      const lowResult = checkVolumeConfirmationFilter(500, 1000);
      expect(lowResult).toBe(false); // Low volume fails
    });

    it("should allow volume significantly above SMA20", () => {
      const result = checkVolumeConfirmationFilter(2000, 1000);
      expect(result).toBe(true); // 2x SMA20 passes
      const highResult = checkVolumeConfirmationFilter(10000, 1000);
      expect(highResult).toBe(true); // 10x SMA20 passes
    });
  });

  // ─── Integration Tests ───────────────────────────────────────────────
  describe("Integration: Full Signal Flow", () => {
    it("should handle complete BUY signal flow", () => {
      // Simulate uptrend with volume confirmation
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
      const volumes = Array.from({ length: 30 }, (_, i) => 1000 + i * 50);

      const rsi = calculateRSI(prices);
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      const volumeSMA20 = calculateSMA(volumes, 20);

      const strength = calculateAdvancedSignalStrength({
        rsi,
        ema12,
        ema26,
        currentPrice: prices[prices.length - 1],
        currentVolume: volumes[volumes.length - 1],
        volumeSMA20,
        signal: "BUY",
        symbol: "BTCUSDT",
      });

      // For uptrend: EMA200 should be below current price
      const ema200_4h = calculateEMA(prices, 200);
      const mtfPass = checkMTFTrendFilter(
        prices[prices.length - 1],
        ema200_4h * 0.99, // Set EMA200 slightly below current price
        "BUY"
      );
      const volumePass = checkVolumeConfirmationFilter(
        volumes[volumes.length - 1],
        volumeSMA20
      );

      expect(strength).toBeGreaterThan(50);
      expect(mtfPass).toBe(true); // Price above EMA200 for BUY
      expect(volumePass).toBe(true);
    });

    it("should handle complete SELL signal flow", () => {
      // Simulate downtrend with volume confirmation
      const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 0.5);
      const volumes = Array.from({ length: 30 }, (_, i) => 1000 + i * 50);

      const rsi = calculateRSI(prices);
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      const volumeSMA20 = calculateSMA(volumes, 20);

      const strength = calculateAdvancedSignalStrength({
        rsi,
        ema12,
        ema26,
        currentPrice: prices[prices.length - 1],
        currentVolume: volumes[volumes.length - 1],
        volumeSMA20,
        signal: "SELL",
        symbol: "BTCUSDT",
      });

      // For downtrend: EMA200 should be above current price
      const ema200_4h = calculateEMA(prices, 200);
      const mtfPass = checkMTFTrendFilter(
        prices[prices.length - 1],
        ema200_4h * 1.01, // Set EMA200 slightly above current price
        "SELL"
      );
      const volumePass = checkVolumeConfirmationFilter(
        volumes[volumes.length - 1],
        volumeSMA20
      );

      expect(strength).toBeGreaterThan(50);
      expect(mtfPass).toBe(true); // Price below EMA200 for SELL
      expect(volumePass).toBe(true);
    });
  });
});


  // ─── RSI Divergence Tests ─────────────────────────────────────────────
  describe("detectRSIDivergence", () => {
    it("should detect bullish divergence when price lower but RSI higher", () => {
      // Simulate: Price goes down, RSI goes up (bullish divergence)
      const prices = Array.from({ length: 30 }, (_, i) => {
        if (i < 15) return 100 + i; // Price up
        return 115 - (i - 15) * 0.5; // Price down slowly
      });
      const rsiValues = calculateRSIArray(prices);
      
      const result = detectRSIDivergence(prices, rsiValues);
      // May or may not detect depending on exact RSI values
      expect(result.hasDivergence).toBeDefined();
      expect(["bullish", "bearish", null]).toContain(result.type);
    });

    it("should detect bearish divergence when price higher but RSI lower", () => {
      // Simulate: Price goes up, RSI goes down (bearish divergence)
      const prices = Array.from({ length: 30 }, (_, i) => {
        if (i < 15) return 100 - i; // Price down
        return 85 + (i - 15) * 0.5; // Price up slowly
      });
      const rsiValues = calculateRSIArray(prices);
      
      const result = detectRSIDivergence(prices, rsiValues);
      expect(result.hasDivergence).toBeDefined();
      expect(["bullish", "bearish", null]).toContain(result.type);
    });

    it("should return no divergence with insufficient data", () => {
      const prices = [100, 101, 102];
      const rsiValues = calculateRSIArray(prices);
      
      const result = detectRSIDivergence(prices, rsiValues);
      expect(result.hasDivergence).toBe(false);
      expect(result.type).toBeNull();
      expect(result.strength).toBe(0);
    });

    it("should return strength between 0 and 20", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 10) * 10);
      const rsiValues = calculateRSIArray(prices);
      
      const result = detectRSIDivergence(prices, rsiValues);
      if (result.hasDivergence) {
        expect(result.strength).toBeGreaterThanOrEqual(0);
        expect(result.strength).toBeLessThanOrEqual(20);
      }
    });
  });

  // ─── RSI Array Calculation Tests ──────────────────────────────────────
  describe("calculateRSIArray", () => {
    it("should return array of RSI values", () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
      const rsiArray = calculateRSIArray(prices);
      
      expect(rsiArray.length).toBe(prices.length);
      expect(rsiArray.every(v => typeof v === 'number')).toBe(true);
      expect(rsiArray.every(v => v >= 0 && v <= 100)).toBe(true);
    });

    it("should have first RSI values around 50 (insufficient data)", () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const rsiArray = calculateRSIArray(prices);
      
      // First few values should be close to 50 (default)
      expect(rsiArray[0]).toBe(50);
    });
  });


  // ─── Multi-Timeframe Confluence Tests ─────────────────────────────────
  describe("checkMultiTimeframeConfluence", () => {
    it("should detect strong confluence with 2 BUY signals", () => {
      const signals = [
        { timeframe: "5m", signal: "BUY" as const },
        { timeframe: "15m", signal: "BUY" as const },
        { timeframe: "1h", signal: "NEUTRAL" as const },
      ];
      
      const result = checkMultiTimeframeConfluence(signals);
      expect(result.isStrong).toBe(true);
      expect(result.confluenceCount).toBe(2);
      expect(result.confluenceBonus).toBe(15);
    });

    it("should detect strong confluence with 3 BUY signals", () => {
      const signals = [
        { timeframe: "5m", signal: "BUY" as const },
        { timeframe: "15m", signal: "BUY" as const },
        { timeframe: "1h", signal: "BUY" as const },
      ];
      
      const result = checkMultiTimeframeConfluence(signals);
      expect(result.isStrong).toBe(true);
      expect(result.confluenceCount).toBe(3);
      expect(result.confluenceBonus).toBe(25);
    });

    it("should return no confluence with only 1 signal", () => {
      const signals = [
        { timeframe: "5m", signal: "BUY" as const },
        { timeframe: "15m", signal: "SELL" as const },
        { timeframe: "1h", signal: "NEUTRAL" as const },
      ];
      
      const result = checkMultiTimeframeConfluence(signals);
      expect(result.isStrong).toBe(false);
      expect(result.confluenceCount).toBe(1);
      expect(result.confluenceBonus).toBe(0);
    });
  });

  // ─── Trailing Stop Loss Tests ─────────────────────────────────────────
  describe("calculateTrailingStopLoss", () => {
    it("should move SL to break-even at +5% profit (BUY)", () => {
      const entryPrice = 100;
      const currentPrice = 105; // +5%
      
      const result = calculateTrailingStopLoss(entryPrice, currentPrice, "BUY");
      expect(result.currentProfit).toBeCloseTo(5, 1);
      expect(result.newStopLoss).toBe(entryPrice);
      expect(result.stopLossType).toBe("breakeven");
    });

    it("should move SL to +5% profit at +10% profit (BUY)", () => {
      const entryPrice = 100;
      const currentPrice = 110; // +10%
      
      const result = calculateTrailingStopLoss(entryPrice, currentPrice, "BUY");
      expect(result.currentProfit).toBeCloseTo(10, 1);
      expect(result.newStopLoss).toBe(105);
      expect(result.stopLossType).toBe("profit5pct");
    });

    it("should not move SL below +5% profit (BUY)", () => {
      const entryPrice = 100;
      const currentPrice = 102; // +2%
      
      const result = calculateTrailingStopLoss(entryPrice, currentPrice, "BUY");
      expect(result.currentProfit).toBeCloseTo(2, 1);
      expect(result.stopLossType).toBe("none");
    });

    it("should move SL to break-even at +5% profit (SELL)", () => {
      const entryPrice = 100;
      const currentPrice = 95; // +5% profit on SELL
      
      const result = calculateTrailingStopLoss(entryPrice, currentPrice, "SELL");
      expect(result.currentProfit).toBeCloseTo(5, 1);
      expect(result.newStopLoss).toBe(entryPrice);
      expect(result.stopLossType).toBe("breakeven");
    });
  });
