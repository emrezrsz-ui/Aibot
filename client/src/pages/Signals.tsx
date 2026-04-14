/**
 * Signals Page — Scanner-Signale Verwaltung
 * ==========================================
 * Dedizierte Seite für die manuelle Verwaltung von Scanner-Signalen.
 * Zeigt WebSocket-Status und alle erfassten Signale mit Status-Verwaltung.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ScannerSignals } from "@/components/ScannerSignals";
import { TradePerformance } from "@/components/TradePerformance";
import { FilterSettingsPanel } from "@/components/FilterSettingsPanel";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScannerHealth {
  status: string;
  mode: string;
  websocket: {
    connected: boolean;
    reconnectCount: number;
    lastMessage: string | null;
  };
  signals: {
    lastSignal: string | null;
    totalSignals: number;
    candleCloses: number;
    lastError: string | null;
  };
  buffers: {
    initialized: number;
    expected: number;
  };
  symbols: string[];
  intervals: string[];
}

export default function Signals() {
  const [health, setHealth] = useState<ScannerHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setHealthError(false);
      } else {
        setHealthError(true);
      }
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 15_000); // Alle 15s aktualisieren
    return () => clearInterval(timer);
  }, []);

  const wsConnected = healthError ? false : (health?.websocket?.connected ?? false);
  const lastMessage = health?.websocket?.lastMessage
    ? new Date(health.websocket.lastMessage).toLocaleTimeString("de-DE")
    : "—";
  const candleCloses = health?.signals?.candleCloses ?? 0;
  const totalSignals = health?.signals?.totalSignals ?? 0;
  const buffersReady = health?.buffers
    ? `${health.buffers.initialized}/${health.buffers.expected}`
    : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-mono">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(0, 217, 255, 0.1) 25%, rgba(0, 217, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 217, 255, 0.1) 75%, rgba(0, 217, 255, 0.1) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0, 217, 255, 0.1) 25%, rgba(0, 217, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 217, 255, 0.1) 75%, rgba(0, 217, 255, 0.1) 76%, transparent 77%, transparent)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-400/20 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Link href="/">
                  <Button className="h-8 px-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-400/30">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-cyan-400 bg-clip-text text-transparent">
                    ◆ SCANNER-SIGNALE ◆
                  </h1>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Manuelle Verwaltung aller erfassten Markt-Signale
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* WebSocket Status Bar */}
        <div className="border-b border-gray-800/50 bg-gray-900/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
            <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
              {/* Verbindungsstatus */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                  wsConnected
                    ? "border-green-400/40 bg-green-900/20 text-green-400"
                    : "border-red-400/40 bg-red-900/20 text-red-400"
                }`}
              >
                {wsConnected ? (
                  <Wifi className="w-3.5 h-3.5" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" />
                )}
                <span className="font-bold">
                  {healthLoading
                  ? "Prüfe..."
                  : healthError
                  ? "Server nicht erreichbar"
                  : wsConnected
                  ? "WebSocket LIVE"
                  : "Getrennt"}
                </span>
                {wsConnected && (
                  <span className="relative flex h-2 w-2 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                )}
              </div>

              {/* Statistiken */}
              {health && (
                <>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Activity className="w-3 h-3" />
                    <span>Kerzen: <span className="text-gray-300">{candleCloses}</span></span>
                  </div>
                  <div className="text-gray-400">
                    Signale: <span className="text-gray-300">{totalSignals}</span>
                  </div>
                  <div className="text-gray-400">
                    Buffer: <span className="text-gray-300">{buffersReady}</span>
                  </div>
                  <div className="text-gray-400">
                    Letzte Nachricht: <span className="text-gray-300">{lastMessage}</span>
                  </div>
                  {health.websocket?.reconnectCount > 0 && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <RefreshCw className="w-3 h-3" />
                      <span>Reconnects: {health.websocket.reconnectCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
          {/* Filter-Einstellungen */}
          <FilterSettingsPanel />

          {/* Performance Dashboard */}
          <section>
            <h2 className="text-lg font-bold text-cyan-400 font-mono mb-4">📊 PERFORMANCE DASHBOARD</h2>
            <TradePerformance performanceData={null} isLoading={false} />
          </section>

          {/* Scanner Signals */}
          <section>
            <h2 className="text-lg font-bold text-cyan-400 font-mono mb-4">🔔 SCANNER-SIGNALE</h2>
            <ScannerSignals />
          </section>
        </main>
      </div>
    </div>
  );
}
