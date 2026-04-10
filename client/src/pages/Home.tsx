/**
 * Crypto Signal Dashboard - Home Page
 * Hauptseite mit Trading-Signalen und Live-Marktdaten
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTradeSignals } from "@/hooks/useTradeSignals";
import { useSupabaseTrades } from "@/hooks/useSupabaseTrades";
import { useNotifications } from "@/hooks/useNotifications";
import { SignalBadge } from "@/components/SignalBadge";
import { TradeHistory } from "@/components/TradeHistory";
import { MarketDataCard } from "@/components/MarketDataCard";
import { AICommandCenter } from "@/components/AICommandCenter";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Clock, Bell, BellOff, X, Database, HardDrive } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
];

export default function Home() {
  const [selectedInterval, setSelectedInterval] = useState("15m");
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  const { signals, loading, error, lastUpdate, refetch, marketData } = useTradeSignals({
    symbols: SYMBOLS,
    interval: selectedInterval,
    refreshInterval: 10000,
  });

  // Trade-Persistenz: Supabase (wenn konfiguriert) oder LocalStorage
  const { tradingState, generateSignal, isLoading: tradesLoading, storageMode } =
    useSupabaseTrades(marketData);

  // Notifications
  const { permission, isSupported, requestPermission, checkAndNotify } = useNotifications();

  // Ref für tradingState um Endlosschleifen zu vermeiden
  const tradingStateRef = useRef(tradingState);
  useEffect(() => {
    tradingStateRef.current = tradingState;
  }, [tradingState]);

  const stableGenerateSignal = useCallback(generateSignal, []);

  // Zeige Benachrichtigungs-Banner nach 3 Sekunden
  useEffect(() => {
    if (!isSupported) return;
    if (permission === "default") {
      const timer = setTimeout(() => setShowNotifBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  // Ref für bereits gemeldete Signale
  const notifiedRef = useRef<Set<string>>(new Set());

  // Auto-generate signals mit HARD-LOCK
  useEffect(() => {
    signals.forEach((signal) => {
      if (signal.signal !== "NEUTRAL") {
        const coinState = tradingStateRef.current[signal.symbol];
        if (!coinState?.activeTrade || coinState.activeTrade.status !== "ACTIVE") {
          stableGenerateSignal(
            signal.symbol,
            signal.signal as "BUY" | "SELL",
            signal.strength,
            selectedInterval
          );
        }

        // Benachrichtigung für starke Signale (>75%)
        if (signal.strength >= 75) {
          const notifKey = `${signal.symbol}-${signal.signal}-${selectedInterval}-${Math.floor(Date.now() / 120000)}`;
          if (!notifiedRef.current.has(notifKey)) {
            notifiedRef.current.add(notifKey);
            if (notifiedRef.current.size > 50) {
              const entries = Array.from(notifiedRef.current);
              notifiedRef.current = new Set(entries.slice(-25));
            }
            checkAndNotify({
              symbol: signal.symbol,
              signal: signal.signal as "BUY" | "SELL",
              timeframe: selectedInterval,
              strength: signal.strength,
              price: signal.currentPrice,
            });
          }
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, selectedInterval]);

  const formattedTime = useMemo(() => {
    return new Date(lastUpdate).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdate]);

  const buySignals = signals.filter((s) => s.signal === "BUY");
  const sellSignals = signals.filter((s) => s.signal === "SELL");

  const handleRequestPermission = async () => {
    await requestPermission();
    setShowNotifBanner(false);
  };

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
        {/* Disclaimer */}
        <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-2 md:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs md:text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 font-mono">
              ⚠️ ZU EXPERIMENTELLEN ZWECKEN - KEINE ANLAGEBERATUNG
            </p>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {showNotifBanner && isSupported && permission === "default" && (
          <div className="bg-cyan-900/30 border-b border-cyan-400/40 px-4 py-3 md:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Bell className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <p className="text-cyan-300 font-mono text-sm font-bold">
                  Push-Benachrichtigungen aktivieren?
                </p>
                <p className="text-cyan-400/70 font-mono text-xs mt-0.5">
                  Erhalte sofortige Alerts für starke Signale (&gt;75% Stärke) — auch wenn das Tab im Hintergrund ist.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={handleRequestPermission}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs h-8 px-3 gap-1"
                >
                  <Bell className="w-3 h-3" />
                  Aktivieren
                </Button>
                <Button
                  onClick={() => setShowNotifBanner(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold text-xs h-8 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Supabase-Konfigurationshinweis (nur wenn nicht konfiguriert) */}
        {!isSupabaseConfigured && (
          <div className="bg-yellow-900/20 border-b border-yellow-500/30 px-4 py-2 md:px-6">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
              <HardDrive className="w-3 h-3 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-400/80 font-mono">
                Lokaler Modus — Daten werden im Browser gespeichert.
                Füge <code className="text-yellow-300">VITE_SUPABASE_URL</code> und{" "}
                <code className="text-yellow-300">VITE_SUPABASE_ANON_KEY</code> in den Einstellungen hinzu für persistente Cloud-Speicherung.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-cyan-400/20 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-3 py-2 md:px-6 md:py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-cyan-400 bg-clip-text text-transparent">
                  ◆ CRYPTO SIGNAL DASHBOARD ◆
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Storage-Mode-Indikator */}
                <div
                  title={storageMode === "supabase" ? "Supabase Cloud-Speicher aktiv" : "Lokaler Browser-Speicher"}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${
                    storageMode === "supabase"
                      ? "border-green-400/50 text-green-400 bg-green-900/20"
                      : "border-yellow-400/50 text-yellow-400 bg-yellow-900/20"
                  }`}
                >
                  {storageMode === "supabase" ? (
                    <Database className="w-3 h-3" />
                  ) : (
                    <HardDrive className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">
                    {storageMode === "supabase" ? "Cloud" : "Lokal"}
                  </span>
                </div>

                {/* Notification Status */}
                {isSupported && (
                  <button
                    onClick={() => permission === "default" ? setShowNotifBanner(true) : undefined}
                    title={
                      permission === "granted"
                        ? "Benachrichtigungen aktiv"
                        : permission === "denied"
                        ? "Benachrichtigungen blockiert"
                        : "Benachrichtigungen aktivieren"
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
                      permission === "granted"
                        ? "border-green-400/50 text-green-400 bg-green-900/20"
                        : permission === "denied"
                        ? "border-red-400/50 text-red-400 bg-red-900/20"
                        : "border-cyan-400/50 text-cyan-400 bg-cyan-900/20 cursor-pointer hover:bg-cyan-900/40"
                    }`}
                  >
                    {permission === "granted" ? (
                      <Bell className="w-3 h-3" />
                    ) : (
                      <BellOff className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">
                      {permission === "granted" ? "Alerts AN" : permission === "denied" ? "Blockiert" : "Alerts"}
                    </span>
                  </button>
                )}

                <Button
                  onClick={refetch}
                  disabled={loading}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold gap-2 text-xs md:text-sm h-8 px-3"
                >
                  <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Aktualisieren</span>
                </Button>
              </div>
            </div>

            {/* Time and Interval Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span className="truncate text-xs">Aktualisierung: {formattedTime}</span>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {INTERVALS.map((interval) => (
                  <Button
                    key={interval.value}
                    onClick={() => setSelectedInterval(interval.value)}
                    className={`font-mono text-xs px-2 py-1 h-7 flex-shrink-0 transition-colors ${
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
          {(loading || tradesLoading) && signals.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block">
                  <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-cyan-400 mt-4 font-mono">
                  {tradesLoading ? "Trades werden aus Supabase geladen..." : "Daten werden geladen..."}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {signals.map((signal) => {
                  const activeTrade = tradingState[signal.symbol]?.activeTrade;
                  return (
                    <div key={signal.symbol}>
                      <SignalBadge signal={signal} activeTrade={activeTrade} />
                      <TradeHistory
                        symbol={signal.symbol}
                        trades={tradingState[signal.symbol]?.history || []}
                        winrate={tradingState[signal.symbol]?.winrate || 0}
                        currentTimeframe={selectedInterval}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Market Data Section */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 border-b border-cyan-400/20 pb-3">
              ▸ LIVE-MARKTDATEN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <p className="mt-1 text-xs">
              Speicher: {storageMode === "supabase" ? "☁️ Supabase Cloud" : "💾 Lokaler Browser-Speicher"}
            </p>
            <p className="mt-1 text-xs">
              © 2026 Crypto Signal Dashboard | Nur zu Bildungszwecken
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
