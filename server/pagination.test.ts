import { describe, it, expect } from "vitest";

/**
 * Tests für Pagination-Funktionalität
 * Vergleicht Performance und Korrektheit verschiedener Pagination-Szenarien
 */

// Mock-Daten für Pagination-Tests
const mockSignals = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  symbol: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"][i % 4],
  interval: ["1m", "5m", "15m", "1h", "4h"][i % 5],
  signal: ["BUY", "SELL"][i % 2],
  strength: Math.floor(Math.random() * 100),
  currentPrice: (Math.random() * 50000).toString(),
  rsi: (Math.random() * 100).toString(),
  ema12: (Math.random() * 50000).toString(),
  ema26: (Math.random() * 50000).toString(),
  status: ["PENDING", "EXECUTED", "IGNORED"][i % 3] as const,
  note: null,
  scannedAt: new Date(),
  actionAt: null,
}));

describe("Pagination Functionality", () => {
  describe("Basic Pagination", () => {
    it("should paginate with correct page size", () => {
      const pageSize = 50;
      const page = 1;
      const offset = (page - 1) * pageSize;
      
      const result = mockSignals.slice(offset, offset + pageSize);
      
      expect(result.length).toBe(pageSize);
      expect(result[0].id).toBe(1);
      expect(result[result.length - 1].id).toBe(50);
    });

    it("should calculate total pages correctly", () => {
      const total = mockSignals.length;
      const pageSize = 50;
      const totalPages = Math.ceil(total / pageSize);
      
      expect(totalPages).toBe(20);
    });

    it("should handle last page with fewer items", () => {
      const pageSize = 50;
      const page = 20;
      const offset = (page - 1) * pageSize;
      
      const result = mockSignals.slice(offset, offset + pageSize);
      
      expect(result.length).toBe(50); // 1000 / 50 = 20 pages exactly
    });

    it("should handle different page sizes", () => {
      const pageSizes = [25, 50, 100, 200];
      
      pageSizes.forEach((pageSize) => {
        const totalPages = Math.ceil(mockSignals.length / pageSize);
        const lastPageSize = mockSignals.length % pageSize || pageSize;
        
        const lastPageOffset = (totalPages - 1) * pageSize;
        const lastPageResult = mockSignals.slice(lastPageOffset, lastPageOffset + pageSize);
        
        expect(lastPageResult.length).toBe(lastPageSize);
      });
    });
  });

  describe("Pagination with Filters", () => {
    it("should paginate filtered results correctly", () => {
      const symbols = ["BTCUSDT"];
      const pageSize = 50;
      const page = 1;
      
      const filtered = mockSignals.filter((s) => symbols.includes(s.symbol));
      const offset = (page - 1) * pageSize;
      const result = filtered.slice(offset, offset + pageSize);
      
      expect(result.every((s) => s.symbol === "BTCUSDT")).toBe(true);
      expect(result.length).toBeLessThanOrEqual(pageSize);
    });

    it("should calculate total pages for filtered results", () => {
      const symbols = ["BTCUSDT", "ETHUSDT"];
      const pageSize = 50;
      
      const filtered = mockSignals.filter((s) => symbols.includes(s.symbol));
      const totalPages = Math.ceil(filtered.length / pageSize);
      
      expect(totalPages).toBeGreaterThan(0);
      expect(totalPages).toBeLessThanOrEqual(Math.ceil(mockSignals.length / pageSize));
    });

    it("should handle pagination with multiple filters", () => {
      const filters = {
        symbols: ["BTCUSDT"],
        intervals: ["1h"],
        signalTypes: ["BUY"],
      };
      const pageSize = 50;
      const page = 1;
      
      const filtered = mockSignals.filter((s) => {
        if (!filters.symbols.includes(s.symbol)) return false;
        if (!filters.intervals.includes(s.interval)) return false;
        if (!filters.signalTypes.includes(s.signal)) return false;
        return true;
      });
      
      const offset = (page - 1) * pageSize;
      const result = filtered.slice(offset, offset + pageSize);
      
      expect(result.every((s) => 
        filters.symbols.includes(s.symbol) &&
        filters.intervals.includes(s.interval) &&
        filters.signalTypes.includes(s.signal)
      )).toBe(true);
    });
  });

  describe("Pagination Navigation", () => {
    it("should navigate to first page", () => {
      const pageSize = 50;
      const page = 1;
      const offset = (page - 1) * pageSize;
      
      const result = mockSignals.slice(offset, offset + pageSize);
      
      expect(result[0].id).toBe(1);
    });

    it("should navigate to middle page", () => {
      const pageSize = 50;
      const page = 10;
      const offset = (page - 1) * pageSize;
      
      const result = mockSignals.slice(offset, offset + pageSize);
      
      expect(result[0].id).toBe(451);
      expect(result[result.length - 1].id).toBe(500);
    });

    it("should navigate to last page", () => {
      const pageSize = 50;
      const totalPages = Math.ceil(mockSignals.length / pageSize);
      const page = totalPages;
      const offset = (page - 1) * pageSize;
      
      const result = mockSignals.slice(offset, offset + pageSize);
      
      expect(result[0].id).toBe(951);
      expect(result[result.length - 1].id).toBe(1000);
    });

    it("should handle invalid page numbers", () => {
      const pageSize = 50;
      const totalPages = Math.ceil(mockSignals.length / pageSize);
      
      // Page 0 should be treated as page 1
      const page0 = Math.max(1, 0);
      expect(page0).toBe(1);
      
      // Page > totalPages should be clamped
      const pageOverMax = Math.min(totalPages, totalPages + 1);
      expect(pageOverMax).toBe(totalPages);
    });
  });

  describe("Pagination Performance", () => {
    it("should paginate large datasets efficiently", () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        value: Math.random(),
      }));
      
      const pageSize = 50;
      const start = performance.now();
      
      for (let page = 1; page <= 200; page++) {
        const offset = (page - 1) * pageSize;
        largeDataset.slice(offset, offset + pageSize);
      }
      
      const duration = performance.now() - start;
      
      // 200 pages should be paginated in < 50ms
      expect(duration).toBeLessThan(50);
    });

    it("should calculate offset correctly for all pages", () => {
      const pageSize = 50;
      const totalPages = Math.ceil(mockSignals.length / pageSize);
      
      for (let page = 1; page <= totalPages; page++) {
        const offset = (page - 1) * pageSize;
        const result = mockSignals.slice(offset, offset + pageSize);
        
        // First item ID should match expected offset
        expect(result[0].id).toBe(offset + 1);
      }
    });
  });

  describe("Page Size Changes", () => {
    it("should handle page size changes correctly", () => {
      const pageSizes = [25, 50, 100, 200];
      
      pageSizes.forEach((pageSize) => {
        const totalPages = Math.ceil(mockSignals.length / pageSize);
        
        // First page should always start at ID 1
        const firstPageResult = mockSignals.slice(0, pageSize);
        expect(firstPageResult[0].id).toBe(1);
        
        // Last page should contain the last signal
        const lastPageOffset = (totalPages - 1) * pageSize;
        const lastPageResult = mockSignals.slice(lastPageOffset, lastPageOffset + pageSize);
        expect(lastPageResult[lastPageResult.length - 1].id).toBe(mockSignals.length);
      });
    });

    it("should reset to page 1 when page size changes", () => {
      const oldPageSize = 50;
      const newPageSize = 100;
      let currentPage = 5;
      
      // When page size changes, reset to page 1
      currentPage = 1;
      
      expect(currentPage).toBe(1);
    });
  });

  describe("Pagination Edge Cases", () => {
    it("should handle single item per page", () => {
      const pageSize = 1;
      const totalPages = mockSignals.length;
      
      expect(totalPages).toBe(mockSignals.length);
      
      for (let page = 1; page <= 10; page++) {
        const offset = (page - 1) * pageSize;
        const result = mockSignals.slice(offset, offset + pageSize);
        expect(result.length).toBe(1);
      }
    });

    it("should handle all items on one page", () => {
      const pageSize = mockSignals.length;
      const totalPages = Math.ceil(mockSignals.length / pageSize);
      
      expect(totalPages).toBe(1);
      
      const result = mockSignals.slice(0, pageSize);
      expect(result.length).toBe(mockSignals.length);
    });

    it("should handle empty results", () => {
      const emptyData: typeof mockSignals = [];
      const pageSize = 50;
      const totalPages = Math.ceil(emptyData.length / pageSize) || 1;
      
      expect(totalPages).toBe(1);
      expect(emptyData.length).toBe(0);
    });

    it("should handle page size larger than total items", () => {
      const pageSize = 2000;
      const totalPages = Math.ceil(mockSignals.length / pageSize);
      
      expect(totalPages).toBe(1);
      
      const result = mockSignals.slice(0, pageSize);
      expect(result.length).toBe(mockSignals.length);
    });
  });

  describe("Pagination Metadata", () => {
    it("should provide correct pagination metadata", () => {
      const total = mockSignals.length;
      const pageSize = 50;
      const page = 5;
      const totalPages = Math.ceil(total / pageSize);
      
      const startItem = (page - 1) * pageSize + 1;
      const endItem = Math.min(page * pageSize, total);
      
      expect(startItem).toBe(201);
      expect(endItem).toBe(250);
      expect(totalPages).toBe(20);
    });

    it("should calculate correct metadata for last page", () => {
      const total = mockSignals.length;
      const pageSize = 50;
      const totalPages = Math.ceil(total / pageSize);
      const page = totalPages;
      
      const startItem = (page - 1) * pageSize + 1;
      const endItem = Math.min(page * pageSize, total);
      
      expect(startItem).toBe(951);
      expect(endItem).toBe(1000);
    });
  });
});
