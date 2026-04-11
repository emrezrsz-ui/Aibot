import { Trade } from "@/lib/tradeSystem";

interface TradeHistoryProps {
  symbol: string;
  trades: Trade[]; // Fallback für ältere Aufrufe
  historyByTimeframe?: Record<string, Trade[]>; // Bevorzugt: pro Timeframe
  winrateByTimeframe?: Record<string, number>;
  winrate: number;
  currentTimeframe?: string;
}

/**
 * Komponente zur Anzeige der letzten 5 Trades und Winrate
 */
export function TradeHistory({ symbol, trades, historyByTimeframe, winrateByTimeframe, winrate, currentTimeframe = "15m" }: TradeHistoryProps) {
  // Bevorzuge historyByTimeframe (korrekte Struktur), Fallback auf gefiltertes Array
  const filteredTrades: Trade[] = historyByTimeframe
    ? (historyByTimeframe[currentTimeframe] || [])
    : trades.filter((t) => t.timeframe === currentTimeframe);

  // Winrate aus winrateByTimeframe oder berechnet
  const timeframeWinrate = winrateByTimeframe
    ? (winrateByTimeframe[currentTimeframe] ?? 0)
    : filteredTrades.length > 0
    ? Math.round(
        (filteredTrades.filter((t) => t.closeReason === "TP").length / filteredTrades.length) * 100
      )
    : 0;

  if (filteredTrades.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-cyan-500/20">
        <div className="text-xs text-cyan-400/60 font-mono">
          ▸ LAST 5 TRADES ({currentTimeframe.toUpperCase()})
        </div>
        <div className="mt-2 text-xs text-cyan-400/40 font-mono">
          No trades in this timeframe yet
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-cyan-500/20">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-cyan-400/60 font-mono">
          ▸ LAST 5 TRADES ({currentTimeframe.toUpperCase()})
        </div>
        <div className="text-xs font-mono">
          <span className="text-cyan-400">WINRATE:</span>{" "}
          <span
            className={
              timeframeWinrate >= 50 ? "text-green-400 font-bold" : "text-red-400 font-bold"
            }
          >
            {timeframeWinrate}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {filteredTrades.map((trade, idx) => (
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
                <span className="text-cyan-400/60">#{filteredTrades.length - idx}</span>
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
                  ${trade.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  ${trade.closePrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "N/A"}
                </span>
              </div>
            </div>

            {/* Gewinn/Verlust Berechnung */}
            {trade.closePrice && (
              <div className="mt-1 flex justify-between items-center text-xs">
                <span className="text-cyan-400/60">P&L: </span>
                <span
                  className={
                    trade.type === "BUY"
                      ? trade.closePrice >= trade.entryPrice
                        ? "text-green-400 font-bold"
                        : "text-red-400 font-bold"
                      : trade.closePrice <= trade.entryPrice
                        ? "text-green-400 font-bold"
                        : "text-red-400 font-bold"
                  }
                >
                  {trade.type === "BUY"
                    ? (trade.closePrice >= trade.entryPrice ? "+" : "")
                    : (trade.closePrice <= trade.entryPrice ? "+" : "")}
                  {trade.type === "BUY"
                    ? ((trade.closePrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(3)
                    : ((trade.entryPrice - trade.closePrice) / trade.entryPrice * 100).toFixed(3)}%
                </span>
              </div>
            )}
            <div className="mt-1 text-cyan-400/30 text-[10px]">
              {new Date(trade.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              {" · "}{trade.timeframe.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
