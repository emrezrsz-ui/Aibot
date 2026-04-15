/**
 * activity-logger.ts — Live Activity Logging für Trading Hub
 */

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: "FILTER_CHECK" | "ORDER_STATUS" | "ERROR" | "INFO";
  symbol?: string;
  message: string;
  details?: Record<string, any>;
}

// In-Memory Log (max 1000 entries)
const activityLogs: ActivityLog[] = [];
const MAX_LOGS = 1000;

/**
 * Füge einen Log-Eintrag hinzu
 */
export function addActivityLog(
  type: ActivityLog["type"],
  message: string,
  symbol?: string,
  details?: Record<string, any>
): ActivityLog {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    symbol,
    message,
    details,
  };

  activityLogs.push(log);

  // Behalte nur die letzten MAX_LOGS
  if (activityLogs.length > MAX_LOGS) {
    activityLogs.shift();
  }

  return log;
}

/**
 * Hole die letzten N Log-Einträge
 */
export function getRecentLogs(limit: number = 50): ActivityLog[] {
  return activityLogs.slice(-limit).reverse();
}

/**
 * Leere alle Logs
 */
export function clearLogs(): void {
  activityLogs.length = 0;
}

/**
 * Log Filter-Check
 */
export function logFilterCheck(
  symbol: string,
  filterName: string,
  passed: boolean,
  reason: string
): ActivityLog {
  const message = `${filterName}: ${passed ? "✓ OK" : "✗ BLOCKIERT"} - ${reason}`;
  return addActivityLog("FILTER_CHECK", message, symbol, {
    filterName,
    passed,
    reason,
  });
}

/**
 * Log Order-Status
 */
export function logOrderStatus(
  symbol: string,
  status: "PENDING" | "EXECUTED" | "FAILED" | "CANCELLED",
  details: Record<string, any>
): ActivityLog {
  const message = `Order ${status}: ${symbol}`;
  return addActivityLog("ORDER_STATUS", message, symbol, {
    status,
    ...details,
  });
}

/**
 * Log Fehler
 */
export function logError(symbol: string, error: string, details?: Record<string, any>): ActivityLog {
  return addActivityLog("ERROR", `ERROR: ${error}`, symbol, details);
}

/**
 * Log Info
 */
export function logInfo(message: string, symbol?: string, details?: Record<string, any>): ActivityLog {
  return addActivityLog("INFO", message, symbol, details);
}

/**
 * Formatiere Logs für Terminal-Anzeige
 */
export function formatLogsForTerminal(logs: ActivityLog[]): string {
  return logs
    .map((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString("de-DE");
      const symbol = log.symbol ? `[${log.symbol}]` : "";
      const typeEmoji = {
        FILTER_CHECK: "🔍",
        ORDER_STATUS: "📊",
        ERROR: "❌",
        INFO: "ℹ️",
      }[log.type];

      return `${time} ${typeEmoji} ${symbol} ${log.message}`;
    })
    .join("\n");
}
