/**
 * useActivityLog.ts — WebSocket Hook für Live Activity Logs
 */

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: "FILTER_CHECK" | "ORDER_STATUS" | "ERROR" | "INFO";
  symbol?: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Hook für WebSocket-basierte Activity Logs
 */
export function useActivityLog(enabled: boolean = true) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Verbinde zu Socket.IO Server
    const newSocket = io("/", {
      path: "/socket.io/",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection Events
    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Activity-Log WebSocket verbunden");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Activity-Log WebSocket getrennt");
    });

    // Activity-Log Events
    newSocket.on("activity:log", (log: ActivityLogEntry) => {
      setLogs((prev) => {
        const updated = [log, ...prev];
        // Behalte nur die letzten 100 Logs
        return updated.slice(0, 100);
      });
    });

    // Bulk-Logs laden
    newSocket.on("activity:logs", (newLogs: ActivityLogEntry[]) => {
      setLogs(newLogs);
    });

    // Error Handling
    newSocket.on("error", (error: any) => {
      console.error("WebSocket Error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [enabled]);

  // Funktion zum Löschen aller Logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    if (socket) {
      socket.emit("activity:clear");
    }
  }, [socket]);

  // Funktion zum Laden der letzten N Logs
  const loadLogs = useCallback((limit: number = 50) => {
    if (socket) {
      socket.emit("activity:get", { limit });
    }
  }, [socket]);

  return {
    logs,
    isConnected,
    clearLogs,
    loadLogs,
  };
}

/**
 * Formatiere Activity-Log für Terminal-Anzeige
 */
export function formatActivityLogs(logs: ActivityLogEntry[]): string {
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
