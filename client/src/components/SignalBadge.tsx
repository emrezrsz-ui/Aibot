/**
 * Signal Badge Component
 * Zeigt Trading-Signale mit Neon-Styling, Währungsnamen und Risikomanagement an
 * Design Philosophy: Futuristisches Neon-Trading-Terminal mit Trade-Persistenz
 */

import { SignalData, getCurrencyInfo } from "@/lib/indicators";
import { Trade } from "@/lib/tradeSystem";

interface SignalBadgeProps {
  signal: SignalData;
  activeTrade?: Trade | null;
}

export function SignalBadge({ signal, activeTrade }: SignalBadgeProps) {
  const isBuy = signal.signal === "BUY";
  const isSell = signal.signal === "SELL";
  const isNeutral = signal.signal === "NEUTRAL";
  const isTradeActive = activeTrade?.status === "ACTIVE";

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

  // Hole Währungsinformationen
  const currencyInfo = getCurrencyInfo(signal.symbol);

  // Berechne Gewinn/Verlust Prozentsätze
  const tpGain = ((signal.takeProfit - signal.currentPrice) / signal.currentPrice) * 100;
  const slLoss = ((signal.currentPrice - signal.stopLoss) / signal.currentPrice) * 100;

  return (
    <div
      className={`
        relative px-4 py-4 rounded-lg border
        ${bgColor} ${glowColor}
        transition-all duration-300 hover:shadow-xl
        overflow-hidden group
        ${isTradeActive ? "trade-active" : ""}
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
        {/* Header: Signal Type + Currency Name + Trade Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-mono font-bold text-lg ${textColor} flex-shrink-0`}>
              {signal.signal}
            </span>
            <span
              className="font-mono font-bold text-lg truncate"
              style={{ color: currencyInfo.color }}
            >
              {currencyInfo.displayName}
            </span>
            {isTradeActive && (
              <span className="text-xs font-bold text-cyan-400 neon-glow animate-pulse ml-2">
                ◆ TRADE ACTIVE
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-mono flex-shrink-0">
            RSI: {signal.rsi.toFixed(1)}
          </span>
        </div>

        {/* Current Price */}
        <div className="text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Preis:</span>
            <span className="font-mono font-semibold text-cyan-400">
              ${signal.currentPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Active Trade Levels */}
        {isTradeActive && activeTrade && (
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-2">
            <div className="text-xs text-cyan-400/60 font-mono mb-2">▸ ACTIVE TRADE</div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-cyan-400/60">Entry:</span>
              <span className="text-cyan-300">
                ${activeTrade.entryPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-red-400">SL:</span>
              <span className="text-red-300">
                ${activeTrade.stopLoss.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-green-400">TP:</span>
              <span className="text-green-300">
                ${activeTrade.takeProfit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Stop Loss & Take Profit (für inaktive Signale) */}
        {!isTradeActive && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-800/30 rounded border border-red-500/30">
              <p className="text-red-400 font-bold mb-0.5">SL</p>
              <p className="font-mono text-red-400 text-sm">
                ${signal.stopLoss.toFixed(2)}
              </p>
              <p className="text-red-300 text-xs mt-0.5">
                -{slLoss.toFixed(2)}%
              </p>
            </div>
            <div className="p-2 bg-gray-800/30 rounded border border-green-500/30">
              <p className="text-green-400 font-bold mb-0.5">TP</p>
              <p className="font-mono text-green-400 text-sm">
                ${signal.takeProfit.toFixed(2)}
              </p>
              <p className="text-green-300 text-xs mt-0.5">
                +{tpGain.toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {/* EMAs */}
        <div className="text-xs">
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-500">EMA 12/26:</span>
            <span className="font-mono">
              <span className="text-blue-400">
                {signal.ema12.toFixed(2)}
              </span>
              <span className="text-gray-600">/</span>
              <span className="text-purple-400">
                {signal.ema26.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {/* Strength Bar */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Signal Stärke</span>
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
      </div>

      {/* Scan line effect on hover */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-30
          transition-opacity duration-300
          bg-gradient-to-r from-transparent via-white to-transparent
          transform -skew-x-12
          animate-pulse
        `}
      />
    </div>
  );
}
