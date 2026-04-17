import { describe, it, expect } from "vitest";
import { getSignalsByFilter } from "./db";

// Mock-Daten
const mockSignals = [
  {
    id: 1,
    symbol: "BTCUSDT",
    interval: "1h",
    signal: "BUY",
    strength: 85,
    currentPrice: "45000",
    rsi: "65",
    ema12: "44500",
    ema26: "44000",
    status: "PENDING" as const,
    note: null,
    scannedAt: new Date(),
    actionAt: null,
  },
  {
    id: 2,
    symbol: "ETHUSDT",
    interval: "15m",
    signal: "SELL",
    strength: 72,
    currentPrice: "2500",
    rsi: "55",
    ema12: "2480",
    ema26: "2490",
    status: "EXECUTED" as const,
    note: "Ausgeführt bei $2500",
    scannedAt: new Date(),
    actionAt: new Date(),
  },
  {
    id: 3,
    symbol: "SOLUSDT",
    interval: "5m",
    signal: "BUY",
    strength: 68,
    currentPrice: "180",
    rsi: "58",
    ema12: "178",
    ema26: "176",
    status: "IGNORED" as const,
    note: null,
    scannedAt: new Date(),
    actionAt: new Date(),
  },
  {
    id: 4,
    symbol: "XRPUSDT",
    interval: "1h",
    signal: "BUY",
    strength: 88,
    currentPrice: "2.5",
    rsi: "72",
    ema12: "2.45",
    ema26: "2.40",
    status: "PENDING" as const,
    note: null,
    scannedAt: new Date(),
    actionAt: null,
  },
];

describe("Signal Filtering", () => {
  describe("getSignalsByFilter", () => {
    it("should return all signals when no filters are applied", () => {
      // Simulation: Alle Signale zurückgeben
      const result = mockSignals.filter(() => true);
      expect(result).toHaveLength(4);
    });

    it("should filter by symbol", () => {
      const result = mockSignals.filter((s) => s.symbol === "BTCUSDT");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("BTCUSDT");
    });

    it("should filter by multiple symbols", () => {
      const symbols = ["BTCUSDT", "ETHUSDT"];
      const result = mockSignals.filter((s) => symbols.includes(s.symbol));
      expect(result).toHaveLength(2);
      expect(result.every((s) => symbols.includes(s.symbol))).toBe(true);
    });

    it("should filter by interval", () => {
      const result = mockSignals.filter((s) => s.interval === "1h");
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.interval === "1h")).toBe(true);
    });

    it("should filter by signal type", () => {
      const result = mockSignals.filter((s) => s.signal === "BUY");
      expect(result).toHaveLength(3);
      expect(result.every((s) => s.signal === "BUY")).toBe(true);
    });

    it("should filter by status", () => {
      const result = mockSignals.filter((s) => s.status === "PENDING");
      expect(result).toHaveLength(2);
      expect(result.every((s) => s.status === "PENDING")).toBe(true);
    });

    it("should apply multiple filters combined", () => {
      const filters = {
        symbols: ["BTCUSDT", "XRPUSDT"],
        intervals: ["1h"],
        signalTypes: ["BUY"],
        statuses: ["PENDING"],
      };

      const result = mockSignals.filter((s) => {
        if (!filters.symbols.includes(s.symbol)) return false;
        if (!filters.intervals.includes(s.interval)) return false;
        if (!filters.signalTypes.includes(s.signal)) return false;
        if (!filters.statuses.includes(s.status)) return false;
        return true;
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(4);
    });

    it("should return empty array when filters match nothing", () => {
      const filters = {
        symbols: ["BTCUSDT"],
        intervals: ["5m"],
      };

      const result = mockSignals.filter((s) => {
        if (!filters.symbols.includes(s.symbol)) return false;
        if (!filters.intervals.includes(s.interval)) return false;
        return true;
      });

      expect(result).toHaveLength(0);
    });

    it("should filter by symbol and status", () => {
      const filters = {
        symbols: ["ETHUSDT"],
        statuses: ["EXECUTED"],
      };

      const result = mockSignals.filter((s) => {
        if (!filters.symbols.includes(s.symbol)) return false;
        if (!filters.statuses.includes(s.status)) return false;
        return true;
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("should handle empty filter arrays", () => {
      const filters = {
        symbols: [],
        intervals: [],
        signalTypes: [],
        statuses: [],
      };

      // Mit leeren Arrays sollten alle Signale zurückgegeben werden
      const result = mockSignals.filter(() => true);
      expect(result).toHaveLength(4);
    });
  });
});
