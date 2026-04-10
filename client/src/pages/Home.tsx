/**
 * Crypto Signal Dashboard - Home Page
 * Hauptseite mit Trading-Signalen und Live-Marktdaten
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useState, useMemo } from "react";
import { useTradeSignals } from "@/hooks/useTradeSignals";
import { SignalBadge } from "@/components/SignalBadge";
import { MarketDataCard } from "@/components/MarketDataCard";
import { AICommandCenter } from "@/components/AICommandCenter";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Clock } from "lucide-react";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
];

export default function Home() {
  const [selectedInterval, setSelectedInterval] = useState("15m");
  const { signals, loading, error, lastUpdate, refetch } = useTradeSignals({
    symbols: SYMBOLS,
    interval: selectedInterval,
    refreshInterval: 10000,
  });

  const formattedTime = useMemo(() => {
    return new Date(lastUpdate).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdate]);

  const buySignals = signals.filter((s) => s.signal === "BUY");
  const sellSignals = signals.filter((s) => s.signal === "SELL");

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
        {/* Disclaimer - Always visible at top */}
        <div className="bg-red-900/30 border-b border-red-500/50 px-4 py-3 md:px-6 md:py-4">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-red-400 font-bold text-sm md:text-base">
                ⚠️ ZU EXPERIMENTELLEN ZWECKEN - KEINE ANLAGEBERATUNG
              </p>
              <p className="text-red-300 text-xs md:text-sm mt-1">
                Dieses Dashboard dient nur zu Bildungszwecken. Die angezeigten Signale sind keine Anlageberatung.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="border-b border-cyan-400/20 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-5">
            {/* Title and Controls - Responsive */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                  ◆ CRYPTO SIGNAL DASHBOARD ◆
                </h1>
                <p className="text-gray-400 text-xs md:text-sm truncate">
                  Live Trading-Signale basierend auf RSI & EMA-Strategie
                </p>
              </div>
              <Button
                onClick={refetch}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold gap-2 text-sm md:text-base flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Aktualisieren</span>
                <span className="sm:hidden">↻</span>
              </Button>
            </div>

            {/* Time and Interval Selection - Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm flex-shrink-0">
                <Clock className="w-4 h-4" />
                <span className="truncate">Aktualisierung: {formattedTime}</span>
              </div>
              <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1">
                {INTERVALS.map((interval) => (
                  <Button
                    key={interval.value}
                    onClick={() => setSelectedInterval(interval.value)}
                    className={`font-mono text-xs px-2 md:px-3 py-1 h-auto flex-shrink-0 ${
                      selectedInterval === interval.value
                        ? "bg-cyan-500 text-black hover:bg-cyan-600"
                        : "bg-gray-800 text-cyan-400 hover:bg-gray-700 border border-cyan-400/30"
                    }`}
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Signal Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-green-900/30 border border-green-400/50 rounded-lg">
              <p className="text-green-400 text-sm font-bold mb-1">KAUF-SIGNALE</p>
              <p className="text-3xl font-bold text-green-400">{buySignals.length}</p>
            </div>
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-bold mb-1">VERKAUF-SIGNALE</p>
              <p className="text-3xl font-bold text-red-500">{sellSignals.length}</p>
            </div>
            <div className="p-4 bg-gray-800/30 border border-gray-500/30 rounded-lg">
              <p className="text-gray-400 text-sm font-bold mb-1">GESAMT-SIGNALE</p>
              <p className="text-3xl font-bold text-cyan-400">{signals.length}</p>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && signals.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block">
                  <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-cyan-400 mt-4 font-mono">
                  Daten werden geladen...
                </p>
              </div>
            </div>
          )}

          {/* AI Command Center */}
          <div className="mb-12 p-6 bg-gray-900/50 border border-cyan-400/20 rounded-lg">
            <AICommandCenter />
          </div>

          {/* Signals Grid */}
          {signals.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 border-b border-cyan-400/20 pb-3">
                ▸ TRADING-SIGNALE
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signals.map((signal) => (
                  <SignalBadge key={signal.symbol} signal={signal} />
                ))}
              </div>
            </div>
          )}

          {/* Market Data Section */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 border-b border-cyan-400/20 pb-3">
              ▸ LIVE-MARKTDATEN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SYMBOLS.map((symbol) => (
                <MarketDataCard key={symbol} symbol={symbol} />
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-cyan-400/20 bg-gray-900/50 mt-12">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 text-center text-gray-500 text-xs font-mono">
            <p className="text-xs md:text-sm">
              Datenquelle: Binance API | RSI (14) & EMA (12/26) Strategie | Aktualisierung: Alle 10 Sekunden
            </p>
            <p className="mt-2 text-xs">
              © 2026 Crypto Signal Dashboard | Nur zu Bildungszwecken
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
