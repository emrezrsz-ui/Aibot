import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock, Database, HardDrive, Wifi } from "lucide-react";

interface HealthMetrics {
  uptime: number;
  memory: { used: number; total: number; percentage: number };
  cpu: { cores: number; loadAverage: number };
  timestamp: number;
}

interface DatabaseStatus {
  connected: boolean;
  lastCheck: number;
  queryCount: number;
  errorCount: number;
  latency: number;
}

interface WebSocketStatus {
  connected: boolean;
  reconnectCount: number;
  lastMessage: number;
  messagesPerMinute: number;
}

interface ErrorLog {
  timestamp: number;
  level: "error" | "warn" | "info";
  message: string;
}

export function RailwayStatusDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Queries
  const systemHealth = trpc.health.system.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const databaseStatus = trpc.health.database.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const webSocketStatus = trpc.health.websocket.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const errorLogs = trpc.health.errors.useQuery(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Railway Status</h1>
          <p className="text-gray-400 text-sm">Real-time application monitoring</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded border transition-colors ${
            autoRefresh
              ? "bg-green-900/30 border-green-400/50 text-green-400"
              : "bg-gray-800 border-gray-600 text-gray-400"
          }`}
        >
          {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
        </button>
      </div>

      {/* System Health */}
      <Card className="bg-gray-900/50 border-cyan-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <HardDrive className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemHealth.data && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Uptime</p>
                  <p className="text-lg font-mono text-green-400">
                    {formatUptime(systemHealth.data.uptime)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">CPU Cores</p>
                  <p className="text-lg font-mono text-green-400">
                    {systemHealth.data.cpu.cores}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Memory Usage</p>
                <div className="bg-gray-800 rounded h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all"
                    style={{ width: `${systemHealth.data.memory.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {systemHealth.data.memory.used}MB / {systemHealth.data.memory.total}MB (
                  {systemHealth.data.memory.percentage}%)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card className="bg-gray-900/50 border-cyan-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Database className="w-5 h-5" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {databaseStatus.data && (
            <>
              <div className="flex items-center gap-2">
                {databaseStatus.data.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={databaseStatus.data.connected ? "text-green-400" : "text-red-400"}>
                  {databaseStatus.data.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Latency</p>
                  <p className="font-mono text-cyan-400">{databaseStatus.data.latency}ms</p>
                </div>
                <div>
                  <p className="text-gray-400">Queries</p>
                  <p className="font-mono text-cyan-400">{databaseStatus.data.queryCount}</p>
                </div>
                <div>
                  <p className="text-gray-400">Errors</p>
                  <p className={`font-mono ${databaseStatus.data.errorCount > 0 ? "text-red-400" : "text-green-400"}`}>
                    {databaseStatus.data.errorCount}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* WebSocket Status */}
      <Card className="bg-gray-900/50 border-cyan-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Wifi className="w-5 h-5" />
            WebSocket Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {webSocketStatus.data && (
            <>
              <div className="flex items-center gap-2">
                {webSocketStatus.data.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={webSocketStatus.data.connected ? "text-green-400" : "text-red-400"}>
                  {webSocketStatus.data.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Reconnects</p>
                  <p className="font-mono text-cyan-400">{webSocketStatus.data.reconnectCount}</p>
                </div>
                <div>
                  <p className="text-gray-400">Msg/min</p>
                  <p className="font-mono text-cyan-400">{webSocketStatus.data.messagesPerMinute}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card className="bg-gray-900/50 border-cyan-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <AlertCircle className="w-5 h-5" />
            Recent Errors
          </CardTitle>
          <CardDescription>Last 10 errors</CardDescription>
        </CardHeader>
        <CardContent>
          {errorLogs.data && errorLogs.data.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
              {errorLogs.data.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border-l-2 ${
                    log.level === "error"
                      ? "border-red-400 bg-red-900/20 text-red-400"
                      : log.level === "warn"
                      ? "border-yellow-400 bg-yellow-900/20 text-yellow-400"
                      : "border-green-400 bg-green-900/20 text-green-400"
                  }`}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="uppercase font-bold">{log.level}</span>
                    <span className="text-gray-500">{formatTime(log.timestamp)}</span>
                  </div>
                  <p className="break-words">{log.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No errors recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
