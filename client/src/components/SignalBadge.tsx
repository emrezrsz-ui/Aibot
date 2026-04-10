/**
 * Signal Badge Component
 * Zeigt Trading-Signale mit Neon-Styling, Währungsnamen und Risikomanagement an
 * Design Philosophy: Futuristisches Neon-Trading-Terminal mit Trade-Persistenz
 *
 * TRADE-ACTIVE-MODUS:
 * - "🔹 TRADE ACTIVE" Badge leuchtet oben neben dem Währungsnamen
 * - Aktueller Preis groß und deutlich sichtbar
 * - Entry-Preis direkt über SL und TP
 * - Hard-Lock: Kein neues BUY/SELL-Signal solange Trade aktiv
 */

import { SignalData, getCurrencyInfo } from "@/lib/indicators";
import { Trade } from "@/lib/tradeSystem";

interface SignalBadgeProps {
  signal: SignalData;
  activeTrade?: Trade | null;
}

export function SignalBadge({ signal, activeTrade }: SignalBadgeProps) {
  const isTradeActive = activeTrade?.status === "ACTIVE";

  // Im Trade-Active-Modus: Farbe nach Trade-Typ, nicht nach neuem Signal
  const displaySignal = isTradeActive ? activeTrade!.type : signal.signal;
  const isBuy = displaySignal === "BUY";
  const isSell = displaySignal === "SELL";
  const isNeutral = !isBuy && !isSell;

  const bgColor = isBuy
    ? "bg-green-900/30 border-green-400/50"
    : isSell
      ? "bg-red-900/30 border-red-500/50"
      : "bg-gray-900/30 border-gray-500/30";

  const textColor = isBuy
    ? "text-green-400"
    : isSell
      ? "text-red-500"
      : "text-gray-400";

  const glowColor = isBuy
    ? "shadow-lg shadow-green-400/20"
    : isSell
      ? "shadow-lg shadow-red-500/20"
      : "shadow-lg shadow-gray-500/10";

  const strengthBar = Math.round((signal.strength / 100) * 100);
  const currencyInfo = getCurrencyInfo(signal.symbol);

  // Berechne Prozentsätze relativ zum aktuellen Preis
  const currentPrice = signal.currentPrice;
  const tpGain = ((signal.takeProfit - currentPrice) / currentPrice) * 100;
  const slLoss = ((currentPrice - signal.stopLoss) / currentPrice) * 100;

  // Für aktiven Trade: Abstände vom aktuellen Preis zu SL/TP
  const activeTPGain = isTradeActive
    ? ((activeTrade!.takeProfit - currentPrice) / currentPrice) * 100
    : 0;
  const activeSLLoss = isTradeActive
    ? ((currentPrice - activeTrade!.stopLoss) / currentPrice) * 100
    : 0;

  return (
    <div
      className={`
        relative px-4 py-4 rounded-lg border
        ${bgColor} ${glowColor}
        transition-all duration-300 hover:shadow-xl
        overflow-hidden group
        ${isTradeActive ? "ring-1 ring-cyan-400/30" : ""}
      `}
    >
      {/* Animated background glow */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-20
          transition-opacity duration-300
          ${isBuy ? "bg-green-400" : isSell ? "bg-red-500" : "bg-gray-400"}
        `}
      />

      {/* Content */}
      <div className="relative z-10 space-y-3">

        {/* ── Header: Währungsname + TRADE ACTIVE Badge ── */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-col gap-1 min-w-0">
            {/* Zeile 1: Signal-Typ + Währungsname */}
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-mono font-bold text-lg leading-none ${textColor} flex-shrink-0`}>
                {/* Hard-Lock: Im Trade-Modus zeige Trade-Typ, kein neues Signal */}
                {isTradeActive ? activeTrade!.type : signal.signal}
              </span>
              <span
                className="font-mono font-bold text-lg leading-none"
                style={{ color: currencyInfo.color }}
              >
                {currencyInfo.displayName}
              </span>
            </div>

            {/* Zeile 2: TRADE ACTIVE Badge (leuchtet wenn aktiv) */}
            {isTradeActive && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 bg-cyan-900/40 border border-cyan-400/60 rounded px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                  <span className="text-[11px] font-bold text-cyan-300 font-mono tracking-wider">
                    🔹 TRADE ACTIVE
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* RSI rechts oben */}
          <span className="text-xs text-gray-500 font-mono flex-shrink-0 mt-0.5">
            RSI: {signal.rsi.toFixed(1)}
          </span>
        </div>

        {/* ── Aktueller Preis — GROSS und DEUTLICH ── */}
        <div className={`rounded-lg px-3 py-2 ${isTradeActive ? "bg-gray-800/50 border border-gray-600/30" : "bg-gray-800/30"}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500 font-mono">Aktueller Preis</span>
            <span className="font-mono font-bold text-2xl text-cyan-300 leading-none">
              ${currentPrice >= 1000
                ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : currentPrice >= 1
                  ? currentPrice.toFixed(4)
                  : currentPrice.toFixed(6)
              }
            </span>
          </div>
        </div>

        {/* ── TRADE-ACTIVE-MODUS: Entry + SL + TP ── */}
        {isTradeActive && activeTrade && (
          <div className="bg-cyan-900/20 border border-cyan-500/40 rounded-lg p-3 space-y-2">
            {/* Titel */}
            <div className="text-[10px] font-bold text-cyan-400/70 font-mono tracking-widest uppercase">
              ▸ Offener Trade
            </div>

            {/* Entry-Preis — direkt über SL und TP */}
            <div className="flex justify-between items-center py-1 border-b border-cyan-500/20">
              <span className="text-xs font-mono text-cyan-400/80 font-bold">Entry:</span>
              <span className="text-sm font-mono font-bold text-cyan-200">
                ${activeTrade.entryPrice >= 1000
                  ? activeTrade.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : activeTrade.entryPrice >= 1
                    ? activeTrade.entryPrice.toFixed(4)
                    : activeTrade.entryPrice.toFixed(6)
                }
              </span>
            </div>

            {/* SL und TP nebeneinander */}
            <div className="grid grid-cols-2 gap-2">
              {/* Stop Loss */}
              <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
                <div className="text-[10px] font-bold text-red-400 font-mono mb-1">STOP LOSS</div>
                <div className="text-sm font-mono font-bold text-red-300">
                  ${activeTrade.stopLoss >= 1000
                    ? activeTrade.stopLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : activeTrade.stopLoss >= 1
                      ? activeTrade.stopLoss.toFixed(4)
                      : activeTrade.stopLoss.toFixed(6)
                  }
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${activeSLLoss > 0 ? "text-red-400" : "text-green-400"}`}>
                  {activeSLLoss > 0 ? "-" : "+"}{Math.abs(activeSLLoss).toFixed(2)}%
                </div>
              </div>

              {/* Take Profit */}
              <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
                <div className="text-[10px] font-bold text-green-400 font-mono mb-1">TAKE PROFIT</div>
                <div className="text-sm font-mono font-bold text-green-300">
                  ${activeTrade.takeProfit >= 1000
                    ? activeTrade.takeProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : activeTrade.takeProfit >= 1
                      ? activeTrade.takeProfit.toFixed(4)
                      : activeTrade.takeProfit.toFixed(6)
                  }
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${activeTPGain > 0 ? "text-green-400" : "text-red-400"}`}>
                  {activeTPGain > 0 ? "+" : ""}{activeTPGain.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Stärke des ursprünglichen Signals */}
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/50 pt-1">
              <span>Signal-Stärke beim Einstieg:</span>
              <span className="text-cyan-300 font-bold">{activeTrade.strength}%</span>
            </div>
          </div>
        )}

        {/* ── NORMALER MODUS (kein aktiver Trade): SL + TP ── */}
        {!isTradeActive && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-800/30 rounded border border-red-500/30">
              <p className="text-red-400 font-bold mb-0.5 font-mono text-[10px]">STOP LOSS</p>
              <p className="font-mono text-red-400 text-sm font-bold">
                ${signal.stopLoss >= 1000
                  ? signal.stopLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : signal.stopLoss >= 1
                    ? signal.stopLoss.toFixed(4)
                    : signal.stopLoss.toFixed(6)
                }
              </p>
              <p className="text-red-300 text-[10px] mt-0.5 font-mono">
                -{Math.abs(slLoss).toFixed(2)}%
              </p>
            </div>
            <div className="p-2 bg-gray-800/30 rounded border border-green-500/30">
              <p className="text-green-400 font-bold mb-0.5 font-mono text-[10px]">TAKE PROFIT</p>
              <p className="font-mono text-green-400 text-sm font-bold">
                ${signal.takeProfit >= 1000
                  ? signal.takeProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : signal.takeProfit >= 1
                    ? signal.takeProfit.toFixed(4)
                    : signal.takeProfit.toFixed(6)
                }
              </p>
              <p className="text-green-300 text-[10px] mt-0.5 font-mono">
                +{Math.abs(tpGain).toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {/* ── EMAs ── */}
        <div className="text-xs">
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-500 font-mono">EMA 12/26:</span>
            <span className="font-mono">
              <span className="text-blue-400">{signal.ema12.toFixed(2)}</span>
              <span className="text-gray-600">/</span>
              <span className="text-purple-400">{signal.ema26.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* ── Signal-Stärke-Balken (nur im Nicht-Trade-Modus) ── */}
        {!isTradeActive && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-mono">Signal Stärke</span>
              <span className={`text-xs font-bold ${textColor}`}>
                {signal.strength}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/30">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isBuy
                    ? "bg-gradient-to-r from-green-400 to-green-500"
                    : isSell
                      ? "bg-gradient-to-r from-red-500 to-red-600"
                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                }`}
                style={{ width: `${strengthBar}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Hard-Lock Hinweis (nur im Trade-Modus) ── */}
        {isTradeActive && (
          <div className="flex items-center gap-1.5 bg-yellow-900/15 border border-yellow-500/25 rounded px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-mono text-yellow-400/70 tracking-wide">
              Scanner pausiert — Trade läuft bis SL oder TP
            </span>
          </div>
        )}
      </div>

      {/* Scan line effect on hover */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-10
          transition-opacity duration-300
          bg-gradient-to-r from-transparent via-white to-transparent
          transform -skew-x-12
        `}
      />
    </div>
  );
}
