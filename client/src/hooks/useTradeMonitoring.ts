import { useEffect, useRef, useState } from "react";
import {
  CoinTradingState,
  Trade,
  calculateWinrate,
  checkTradeExit,
  closeTrade,
  createTrade,
  initializeTradingState,
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
  const generateSignal = (
    symbol: string,
    type: "BUY" | "SELL",
    strength: number,
    timeframe: string = "15m"
  ) => {
    setTradingState((prev) => {
      const coinState = prev[symbol];

      // HARD-LOCK: Wenn bereits ein aktiver Trade existiert, IGNORIERE KOMPLETT
      if (coinState?.activeTrade?.status === "ACTIVE") {
        console.log(`[HARD-LOCK] ${symbol}: Trade ACTIVE - Signal ${type} BLOCKIERT`);
        return prev; // Keine Änderungen, State bleibt unverändert
      }

      const currentPrice = marketData[symbol] || 0;
      const newTrade = createTrade(symbol, type, currentPrice, strength, timeframe);

      return {
        ...prev,
        [symbol]: {
          ...coinState,
          activeTrade: newTrade,
          scannerPaused: false,
        },
      };
    });
  };

  /**
   * Starte Trade-Monitoring (sekundliche Überprüfung)
   */
  useEffect(() => {
    monitoringIntervalRef.current = setInterval(() => {
      setTradingState((prev) => {
        let updated = { ...prev };
        let hasChanges = false;

        // Überprüfe jeden aktiven Trade
        Object.keys(updated).forEach((symbol) => {
          const coinState = updated[symbol];
          const activeTrade = coinState?.activeTrade;

          if (activeTrade && activeTrade.status === "ACTIVE") {
            const currentPrice = marketData[symbol] || 0;

            // Überprüfe TP/SL
            const exitReason = checkTradeExit(activeTrade, currentPrice);

            if (exitReason) {
              // Trade wurde geschlossen
              const closedTrade = closeTrade(activeTrade, exitReason, currentPrice);
              const newHistory = updateTradeHistory(
                coinState.history,
                closedTrade
              );
              const newWinrate = calculateWinrate(newHistory);

              updated[symbol] = {
                activeTrade: null,
                history: newHistory,
                winrate: newWinrate,
              };

              hasChanges = true;
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000); // Überprüfe jede Sekunde

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
