import { useCallback, useEffect, useRef, useState } from "react";
import {
  CoinTradingState,
  calculateWinrate,
  calculateWinrateByTimeframe,
  checkTradeExit,
  closeTrade,
  createTrade,
  initializeTradingState,
  updateHistoryByTimeframe,
  updateTradeHistory,
} from "@/lib/tradeSystem";

/**
 * Hook für Trade-Monitoring und Persistenz
 * Verwaltet aktive Trades, überprüft TP/SL und aktualisiert History
 */
export function useTradeMonitoring(marketData: Record<string, number>) {
  const [tradingState, setTradingState] = useState<CoinTradingState>(
    initializeTradingState()
  );
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Generiere ein neues Signal und erstelle einen Trade
   * HARD-LOCK: Wenn ein Trade ACTIVE ist, wird diese Funktion komplett ignoriert
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const generateSignal = useCallback((
    symbol: string,
    type: "BUY" | "SELL",
    strength: number,
    timeframe: string = "15m"
  ) => {
    setTradingState((prev) => {
      const coinState = prev[symbol];
      // HARD-LOCK: Wenn bereits ein aktiver Trade existiert, IGNORIERE KOMPLETT
      if (coinState?.activeTrade?.status === "ACTIVE") {
        return prev;
      }
      const currentPrice = marketData[symbol] || 0;
      const newTrade = createTrade(symbol, type, currentPrice, strength, timeframe);
      return {
        ...prev,
        [symbol]: {
          ...coinState,
          activeTrade: newTrade,
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Starte Trade-Monitoring (sekundliche Überprüfung)
   */
  useEffect(() => {
    monitoringIntervalRef.current = setInterval(() => {
      setTradingState((prev) => {
        let updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach((symbol) => {
          const coinState = updated[symbol];
          const activeTrade = coinState?.activeTrade;

          if (activeTrade && activeTrade.status === "ACTIVE") {
            const currentPrice = marketData[symbol] || 0;
            const exitReason = checkTradeExit(activeTrade, currentPrice);

            if (exitReason) {
              const closedTrade = closeTrade(activeTrade, exitReason, currentPrice);
              const newHistory = updateTradeHistory(coinState.history, closedTrade);
              const newHistoryByTf = updateHistoryByTimeframe(
                coinState.historyByTimeframe || {},
                closedTrade
              );
              const newWinrate = calculateWinrate(newHistory);
              const newWinrateByTf = calculateWinrateByTimeframe(newHistoryByTf);

              updated[symbol] = {
                activeTrade: null,
                history: newHistory,
                historyByTimeframe: newHistoryByTf,
                winrate: newWinrate,
                winrateByTimeframe: newWinrateByTf,
              };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [marketData]);

  return {
    tradingState,
    generateSignal,
  };
}
