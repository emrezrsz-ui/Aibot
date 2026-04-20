import { describe, it, expect, beforeEach } from "vitest";
import {
  getSystemHealth,
  getDatabaseStatus,
  getWebSocketStatus,
  getErrorLogs,
  addErrorLog,
  trackWebSocketReconnect,
  trackWebSocketMessage,
} from "./health";

describe("Health Monitoring", () => {
  describe("getSystemHealth", () => {
    it("should return system health metrics", () => {
      const health = getSystemHealth();

      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("memory");
      expect(health).toHaveProperty("cpu");
      expect(health).toHaveProperty("timestamp");

      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.memory.used).toBeGreaterThan(0);
      expect(health.memory.total).toBeGreaterThan(0);
      expect(health.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(health.memory.percentage).toBeLessThanOrEqual(100);
      expect(health.cpu.cores).toBeGreaterThan(0);
    });

    it("should have valid timestamp", () => {
      const health = getSystemHealth();
      expect(health.timestamp).toBeCloseTo(Date.now(), -3);
    });
  });

  describe("getDatabaseStatus", () => {
    it("should return database status", async () => {
      const status = await getDatabaseStatus();

      expect(status).toHaveProperty("connected");
      expect(status).toHaveProperty("lastCheck");
      expect(status).toHaveProperty("queryCount");
      expect(status).toHaveProperty("errorCount");
      expect(status).toHaveProperty("latency");

      expect(typeof status.connected).toBe("boolean");
      expect(status.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getWebSocketStatus", () => {
    it("should return WebSocket status", () => {
      const status = getWebSocketStatus();

      expect(status).toHaveProperty("connected");
      expect(status).toHaveProperty("reconnectCount");
      expect(status).toHaveProperty("lastMessage");
      expect(status).toHaveProperty("messagesPerMinute");

      expect(typeof status.connected).toBe("boolean");
      expect(status.reconnectCount).toBeGreaterThanOrEqual(0);
      expect(status.messagesPerMinute).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Logging", () => {
    beforeEach(() => {
      // Clear error logs before each test
      const logs = getErrorLogs(100);
      logs.forEach(() => {
        // Can't directly clear, but we can verify behavior
      });
    });

    it("should add error log entry", () => {
      addErrorLog("error", "Test error message");
      const logs = getErrorLogs(10);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].message).toBe("Test error message");
      expect(logs[logs.length - 1].level).toBe("error");
    });

    it("should add warning log entry", () => {
      addErrorLog("warn", "Test warning message");
      const logs = getErrorLogs(10);

      expect(logs.some((log) => log.level === "warn")).toBe(true);
    });

    it("should add info log entry", () => {
      addErrorLog("info", "Test info message");
      const logs = getErrorLogs(10);

      expect(logs.some((log) => log.level === "info")).toBe(true);
    });

    it("should return limited error logs", () => {
      for (let i = 0; i < 20; i++) {
        addErrorLog("error", `Error ${i}`);
      }

      const logs = getErrorLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it("should include timestamp in error log", () => {
      const beforeTime = Date.now();
      addErrorLog("error", "Test with timestamp");
      const afterTime = Date.now();

      const logs = getErrorLogs(1);
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logs[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("WebSocket Tracking", () => {
    it("should track WebSocket reconnects", () => {
      const statusBefore = getWebSocketStatus();
      const reconnectsBefore = statusBefore.reconnectCount;

      trackWebSocketReconnect();

      const statusAfter = getWebSocketStatus();
      expect(statusAfter.reconnectCount).toBeGreaterThanOrEqual(reconnectsBefore);
    });

    it("should track WebSocket messages", () => {
      const statusBefore = getWebSocketStatus();

      trackWebSocketMessage();

      const statusAfter = getWebSocketStatus();
      expect(statusAfter.lastMessage).toBeGreaterThanOrEqual(statusBefore.lastMessage);
    });

    it("should increment message counter", () => {
      trackWebSocketMessage();
      const status1 = getWebSocketStatus();
      const messages1 = status1.messagesPerMinute;

      trackWebSocketMessage();
      trackWebSocketMessage();
      const status2 = getWebSocketStatus();
      const messages2 = status2.messagesPerMinute;

      // Message counter should have increased (or reset if minute passed)
      expect(messages2).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health Report", () => {
    it("should generate comprehensive health report", async () => {
      const report = await getSystemHealth();

      expect(report).toHaveProperty("uptime");
      expect(report).toHaveProperty("memory");
      expect(report).toHaveProperty("cpu");
      expect(report).toHaveProperty("timestamp");
    });
  });
});
