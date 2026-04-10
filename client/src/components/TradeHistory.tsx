import { Trade } from "@/lib/tradeSystem";

interface TradeHistoryProps {
  symbol: string;
  trades: Trade[];
  winrate: number;
}

/**
 * Komponente zur Anzeige der letzten 5 Trades und Winrate
 */
export function TradeHistory({ symbol, trades, winrate }: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-cyan-500/20">
        <div className="text-xs text-cyan-400/60 font-mono">
          ▸ LAST 5 TRADES
        </div>
        <div className="mt-2 text-xs text-cyan-400/40 font-mono">
          Keine Trades noch
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-cyan-500/20">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-cyan-400/60 font-mono">
          ▸ LAST 5 TRADES
        </div>
        <div className="text-xs font-mono">
          <span className="text-cyan-400">WINRATE:</span>{" "}
          <span
            className={
              winrate >= 50 ? "text-green-400 font-bold" : "text-red-400 font-bold"
            }
          >
            {winrate}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {trades.map((trade, idx) => (
          <div
            key={trade.id}
            className={`text-xs font-mono p-2 rounded border ${
              trade.closeReason === "TP"
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400/60">#{trades.length - idx}</span>
                <span
                  className={
                    trade.type === "BUY"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {trade.type}
                </span>
                <span className="text-cyan-400/40">@</span>
                <span className="text-cyan-300">
                  ${trade.entryPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    trade.closeReason === "TP"
                      ? "text-green-400 font-bold"
                      : "text-red-400 font-bold"
                  }
                >
                  {trade.closeReason}
                </span>
                <span className="text-cyan-400/40">@</span>
                <span className="text-cyan-300">
                  ${trade.closePrice?.toFixed(2) || "N/A"}
                </span>
              </div>
            </div>

            {/* Gewinn/Verlust Berechnung */}
            {trade.closePrice && (
              <div className="mt-1 text-xs">
                <span className="text-cyan-400/60">P&L: </span>
                <span
                  className={
                    trade.type === "BUY"
                      ? trade.closePrice >= trade.entryPrice
                        ? "text-green-400"
                        : "text-red-400"
                      : trade.closePrice <= trade.entryPrice
                        ? "text-green-400"
                        : "text-red-400"
                  }
                >
                  {trade.type === "BUY"
                    ? ((trade.closePrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2)
                    : ((trade.entryPrice - trade.closePrice) / trade.entryPrice * 100).toFixed(2)}
                  %
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
