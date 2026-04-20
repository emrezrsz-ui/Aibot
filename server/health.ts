import os from "os";
import { getDb } from "./db";
import { scanSignals } from "../drizzle/schema";

/**
 * System Health Metrics
 * Returns CPU, Memory, and Uptime information
 */
export interface SystemHealth {
  uptime: number; // seconds since server start
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number; // 0-100
  };
  cpu: {
    cores: number;
    loadAverage: number;
  };
  timestamp: number; // Unix timestamp
}

/**
 * Database Status
 */
export interface DatabaseStatus {
  connected: boolean;
  lastCheck: number; // Unix timestamp
  queryCount: number;
  errorCount: number;
  latency: number; // ms
}

/**
 * WebSocket Status
 */
export interface WebSocketStatus {
  connected: boolean;
  reconnectCount: number;
  lastMessage: number; // Unix timestamp
  messagesPerMinute: number;
}

/**
 * Error Log Entry
 */
export interface ErrorLogEntry {
  timestamp: number;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
}

// Global state for monitoring
let startTime = Date.now();
let errorLogs: ErrorLogEntry[] = [];
let queryCount = 0;
let errorCount = 0;
let webSocketReconnectCount = 0;
let lastWebSocketMessage = Date.now();
let webSocketMessageCount = 0;

/**
 * Get system health metrics
 */
export function getSystemHealth(): SystemHealth {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    uptime,
    memory: {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg()[0] || 0,
    },
    timestamp: Date.now(),
  };
}

/**
 * Get database status
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const startTime = Date.now();
  let connected = false;
  let latency = 0;

  try {
    // Try a simple query to check connection
    const db = await getDb();
    if (db) {
      await db.select().from(scanSignals).limit(1);
      connected = true;
      latency = Date.now() - startTime;
      queryCount++;
    }
  } catch (error) {
    connected = false;
    errorCount++;
    addErrorLog("error", `Database connection failed: ${error}`);
  }

  return {
    connected,
    lastCheck: Date.now(),
    queryCount,
    errorCount,
    latency,
  };
}

/**
 * Get WebSocket status
 */
export function getWebSocketStatus(): WebSocketStatus {
  const messagesPerMinute = webSocketMessageCount;
  webSocketMessageCount = 0; // Reset counter

  return {
    connected: true, // Simplified - would need WebSocket instance to check properly
    reconnectCount: webSocketReconnectCount,
    lastMessage: lastWebSocketMessage,
    messagesPerMinute,
  };
}

/**
 * Get error logs (last N entries)
 */
export function getErrorLogs(limit: number = 10): ErrorLogEntry[] {
  return errorLogs.slice(-limit);
}

/**
 * Add error log entry
 */
export function addErrorLog(
  level: "error" | "warn" | "info",
  message: string,
  stack?: string
): void {
  const entry: ErrorLogEntry = {
    timestamp: Date.now(),
    level,
    message,
    stack,
  };

  errorLogs.push(entry);

  // Keep only last 100 errors in memory
  if (errorLogs.length > 100) {
    errorLogs = errorLogs.slice(-100);
  }

  // Log to console as well
  if (level === "error") {
    console.error(`[${new Date().toISOString()}] ${message}`, stack);
  } else if (level === "warn") {
    console.warn(`[${new Date().toISOString()}] ${message}`);
  } else {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

/**
 * Track WebSocket reconnect
 */
export function trackWebSocketReconnect(): void {
  webSocketReconnectCount++;
}

/**
 * Track WebSocket message
 */
export function trackWebSocketMessage(): void {
  lastWebSocketMessage = Date.now();
  webSocketMessageCount++;
}

/**
 * Get comprehensive health report
 */
export async function getHealthReport() {
  const systemHealth = getSystemHealth();
  const databaseStatus = await getDatabaseStatus();
  const webSocketStatus = getWebSocketStatus();
  const recentErrors = getErrorLogs(5);

  return {
    status: databaseStatus.connected ? "healthy" : "degraded",
    timestamp: Date.now(),
    system: systemHealth,
    database: databaseStatus,
    websocket: webSocketStatus,
    recentErrors,
  };
}
