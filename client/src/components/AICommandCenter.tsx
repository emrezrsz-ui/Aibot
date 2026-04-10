/**
 * AI Command Center Component
 * Interaktive Markt-Analyse mit Terminal-Look
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useCommandCenter } from "@/hooks/useCommandCenter";
import { getCurrencyInfo } from "@/lib/indicators";
import { Terminal, Send, Loader2 } from "lucide-react";

export function AICommandCenter() {
  const {
    input,
    setInput,
    result,
    loading,
    error,
    history,
    handleSubmit,
  } = useCommandCenter();

  const isBuy = result?.signal === "BUY";
  const isSell = result?.signal === "SELL";
  const isNeutral = result?.signal === "NEUTRAL";

  const signalColor = isBuy
    ? "text-green-400"
    : isSell
      ? "text-red-500"
      : "text-yellow-400";

  const signalBgColor = isBuy
    ? "bg-green-900/20 border-green-400/30"
    : isSell
      ? "bg-red-900/20 border-red-500/30"
      : "bg-yellow-900/20 border-yellow-400/30";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-mono font-bold text-cyan-400">
          AI COMMAND CENTER
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-cyan-400/30 to-transparent" />
      </div>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-magenta-400/10 rounded-lg blur" />
          <div className="relative bg-gray-900/50 border border-cyan-400/30 rounded-lg p-3 flex items-center gap-2 focus-within:border-cyan-400/60 transition-colors">
            <span className="text-cyan-400 font-mono text-sm flex-shrink-0">
              &gt;
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="z.B. XRP5, BTC15m, ETH1h..."
              className="flex-1 bg-transparent text-cyan-400 font-mono text-sm placeholder-cyan-400/40 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex-shrink-0 p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Hilfe-Text */}
        <p className="text-xs text-gray-500 font-mono">
          Eingabe: [TICKER][TIMEFRAME] • Beispiele: XRP5 (5 Min), BTC15m
          (15 Min), ETH1h (1 Stunde)
        </p>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 font-mono text-sm">
            <span className="text-red-500">✗ Error:</span> {error}
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && result.success && (
        <div
          className={`p-4 rounded-lg border ${signalBgColor} transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 font-mono mb-1">
                {result.displayName} • {result.timeframe.toUpperCase()}
              </p>
              <p className={`text-2xl font-mono font-bold ${signalColor}`}>
                {result.signal}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-mono">PREIS</p>
              <p className="text-lg font-mono text-cyan-400">
                ${result.currentPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="mb-4 p-3 bg-gray-800/30 rounded border border-gray-700/30">
            <p className="text-sm text-gray-300 font-mono leading-relaxed">
              {result.reasoning}
            </p>
          </div>

          {/* Indicators Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-gray-800/20 rounded border border-gray-700/20">
              <p className="text-gray-500 font-mono mb-1">RSI (14)</p>
              <p className="font-mono font-bold text-cyan-400">
                {result.rsi.toFixed(1)}
              </p>
              <p className="text-gray-600 text-xs mt-1">
                {result.rsi > 70
                  ? "Overkauft"
                  : result.rsi < 30
                    ? "Überverkauft"
                    : "Neutral"}
              </p>
            </div>

            <div className="p-2 bg-gray-800/20 rounded border border-gray-700/20">
              <p className="text-gray-500 font-mono mb-1">EMA 12</p>
              <p className="font-mono font-bold text-blue-400">
                {result.ema12.toFixed(2)}
              </p>
            </div>

            <div className="p-2 bg-gray-800/20 rounded border border-gray-700/20">
              <p className="text-gray-500 font-mono mb-1">EMA 26</p>
              <p className="font-mono font-bold text-purple-400">
                {result.ema26.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="mt-3 p-2 bg-gray-800/20 rounded border border-gray-700/20">
            <p className="text-xs text-gray-500 font-mono mb-1">TREND</p>
            <p className="font-mono text-sm">
              {result.ema12 > result.ema26 ? (
                <span className="text-green-400">
                  ↑ Aufwärtstrend (EMA 12 &gt; 26)
                </span>
              ) : result.ema12 < result.ema26 ? (
                <span className="text-red-400">
                  ↓ Abwärtstrend (EMA 12 &lt; 26)
                </span>
              ) : (
                <span className="text-yellow-400">→ Seitwärtstrend</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            Letzte Befehle
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-900/30 border border-gray-700/20 rounded text-xs font-mono hover:border-gray-600/40 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400">&gt; {item.command}</span>
                  <span
                    className={
                      item.result.signal === "BUY"
                        ? "text-green-400"
                        : item.result.signal === "SELL"
                          ? "text-red-500"
                          : "text-yellow-400"
                    }
                  >
                    {item.result.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-4 bg-gray-900/30 border border-cyan-400/20 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <p className="text-sm text-cyan-400 font-mono">Analysiere Markt...</p>
        </div>
      )}
    </div>
  );
}
