/**
 * Signal Badge Component
 * Zeigt Trading-Signale mit Neon-Styling an
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { SignalData } from "@/lib/indicators";

interface SignalBadgeProps {
  signal: SignalData;
}

export function SignalBadge({ signal }: SignalBadgeProps) {
  const isBuy = signal.signal === "BUY";
  const isSell = signal.signal === "SELL";
  const isNeutral = signal.signal === "NEUTRAL";

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

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border
        ${bgColor} ${glowColor}
        transition-all duration-300 hover:shadow-xl
        overflow-hidden group
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
      <div className="relative z-10 space-y-2">
        {/* Signal Label */}
        <div className="flex items-center justify-between">
          <span className={`font-mono font-bold text-lg ${textColor}`}>
            {signal.signal}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            RSI: {signal.rsi.toFixed(1)}
          </span>
        </div>

        {/* Price and EMAs */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-500">Preis:</span>
            <span className="font-mono font-semibold text-cyan-400">
              ${signal.currentPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-500">EMA 12/26:</span>
            <span className="font-mono text-sm">
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
        <div className="pt-2">
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
