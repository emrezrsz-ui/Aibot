/**
 * ActivityLogTerminal.tsx — Live Activity Log Terminal
 */

import { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export default function ActivityLogTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: "13:55:24",
      message: "🤖 Bot gestartet",
      type: "info",
    },
    {
      id: "2",
      timestamp: "13:55:25",
      message: "📡 Verbindung zu Binance hergestellt",
      type: "success",
    },
    {
      id: "3",
      timestamp: "13:55:26",
      message: "🔍 Suche nach Signalen...",
      type: "info",
    },
  ]);

  useEffect(() => {
    // Simuliere neue Log-Einträge
    const interval = setInterval(() => {
      const messages = [
        { message: "📊 Daten aktualisiert", type: "info" as const },
        { message: "✅ Signal erkannt: XRP @ 0.60", type: "success" as const },
        { message: "⚠️ Slippage-Check: 0.3% <= 0.5%", type: "warning" as const },
        { message: "📤 Order gesendet", type: "success" as const },
        { message: "🔄 Waiting for fill...", type: "info" as const },
      ];

      const random = messages[Math.floor(Math.random() * messages.length)];
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      setLogs((prev) => [
        ...prev.slice(-19), // Behalte nur die letzten 20 Einträge
        {
          id: Date.now().toString(),
          timestamp,
          message: random.message,
          type: random.type,
        },
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getLogColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-cyan-400";
    }
  };

  return (
    <Card className="bg-gray-950 border-cyan-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <Terminal className="w-5 h-5" />
          Live Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-black rounded border border-cyan-400/20 p-4 font-mono text-sm h-64 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="mb-1">
              <span className="text-gray-600">[{log.timestamp}]</span>
              <span className={`ml-2 ${getLogColor(log.type)}`}>{log.message}</span>
            </div>
          ))}
          <div className="text-cyan-400 animate-pulse">▌</div>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
            <span className="text-gray-400">Info</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-gray-400">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
            <span className="text-gray-400">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-gray-400">Error</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
