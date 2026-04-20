/**
 * useTradesWithPersistence Hook
 * =============================
 * Persistiert Trades über tRPC in der Datenbank (statt nur LocalStorage).
 * 
 * Strategie:
 * - Beim Start: Aktive Trades aus Datenbank laden via tRPC
 * - Beim Erstellen eines Trades: Via tRPC in Datenbank speichern
 * - Beim Schließen eines Trades: Via tRPC aktualisieren
 * - Fallback auf LocalStorage wenn tRPC nicht verfügbar
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  CoinTradingState,
  Trade,
  calculateWinrate,
  calculateWinrateByTimeframe,
  checkTradeExit,
  closeTrade,
  createTrade,
  initializeTradingState,
  updateHistoryByTimeframe,
  updateTradeHistory,
} from "@/lib/tradeSystem";

// ─── Konvertierungs-Hilfsfunktionen ──────────────────────────────────────────

function tradeToDbTrade(trade: Trade): any {
  return {
    symbol: trade.symbol,
    type: trade.type,
    entryPrice: trade.entryPrice,
    quantity: 1, // Default quantity
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    demoMode: true,
    signalStrength: trade.strength,
  };
}

function dbTradeToTrade(db: any): Trade {
  return {
    id: db.id?.toString() || "",
    symbol: db.symbol ?? "",
    type: db.type ?? "BUY",
    entryPrice: Number(db.entryPrice) || 0,
    stopLoss: Number(db.stopLoss) || 0,
    takeProfit: Number(db.takeProfit) || 0,
    strength: Number(db.signalStrength) || 0,
    timeframe: "15m",
    status: db.status === "CLOSED" ? "CLOSED" : "ACTIVE",
    closeReason: db.status === "CLOSED" ? "TP" : undefined,
    closePrice: db.closePrice ? Number(db.closePrice) : undefined,
    timestamp: db.createdAt ? new Date(db.createdAt).getTime() : Date.now(),
  };
}

// ─── Lokaler Fallback-Speicher ─────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = "crypto_signal_trading_state_v2";

function saveToLocalStorage(state: CoinTradingState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[LocalStorage] Speichern fehlgeschlagen:", e);
  }
}

function loadFromLocalStorage(): CoinTradingState | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoinTradingState;
  } catch (e) {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTradesWithPersistence(marketData: Record<string, number>) {
  const [tradingState, setTradingState] = useState<CoinTradingState>(
    () => loadFromLocalStorage() ?? initializeTradingState()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [storageMode, setStorageMode] = useState<"trpc" | "local">("local");

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradingStateRef = useRef(tradingState);
  const marketDataRef = useRef<Record<string, number>>(marketData);

  // tRPC Queries
  const tradesList = trpc.trades.list.useQuery();
  const activeTradesList = trpc.trades.active.useQuery();
  const saveTradeMutation = trpc.trades.save.useMutation();
  const updateTradeMutation = trpc.trades.update.useMutation();

  useEffect(() => {
    tradingStateRef.current = tradingState;
    saveToLocalStorage(tradingState);
  }, [tradingState]);

  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  // ─── Beim Start: Trades aus tRPC laden ───────────────────────────────────────
  useEffect(() => {
    async function restoreFromTRPC() {
      setIsLoading(true);
      try {
        // Lade aktive Trades
        const activeTrades = activeTradesList.data || [];
        const allTrades = tradesList.data || [];

        if (activeTrades.length === 0 && allTrades.length === 0) {
          console.log("[tRPC] Keine Trades in Datenbank gefunden");
          setStorageMode("local");
          setIsLoading(false);
          return;
        }

        const newState = initializeTradingState();
        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];

        // Aktive Trades zuordnen
        activeTrades.forEach((dbTrade: any) => {
          const trade = dbTradeToTrade(dbTrade);
          if (newState[trade.symbol]) {
            newState[trade.symbol].activeTrade = trade;
          }
        });

        // History zuordnen
        symbols.forEach((sym) => {
          const history = allTrades
            .filter((t: any) => t.symbol === sym && t.status === "CLOSED")
            .map(dbTradeToTrade);
          newState[sym].history = history;
          newState[sym].winrate = calculateWinrate(history);
        });

        setTradingState(newState);
        setStorageMode("trpc");
        console.log(`[tRPC] ${activeTrades.length} aktive Trades wiederhergestellt`);
      } catch (err) {
        console.error("[tRPC] Wiederherstellung fehlgeschlagen:", err);
        setStorageMode("local");
      } finally {
        setIsLoading(false);
      }
    }

    if (tradesList.data || activeTradesList.data) {
      restoreFromTRPC();
    }
  }, [tradesList.data, activeTradesList.data]);

  // ─── Signal generieren und Trade öffnen ────────────────────────────────────
  const generateSignal = useCallback(
    (symbol: string, type: "BUY" | "SELL", strength: number, timeframe: string = "15m", currentPrice: number = 0) => {
      setTradingState((prev) => {
        const coinState = prev[symbol];

        // HARD-LOCK: Kein neues Signal wenn Trade aktiv
        if (coinState?.activeTrade?.status === "ACTIVE") {
          return prev;
        }

        const price = currentPrice > 0 ? currentPrice : (marketDataRef.current[symbol] || 0);
        if (price === 0) return prev;

        const newTrade = createTrade(symbol, type, price, strength, timeframe);

        // Speichere in tRPC (asynchron)
        if (storageMode === "trpc") {
          saveTradeMutation.mutate(
            {
              symbol,
              type,
              entryPrice: price,
              quantity: 1,
              takeProfit: newTrade.takeProfit,
              stopLoss: newTrade.stopLoss,
              demoMode: true,
              signalStrength: strength,
            },
            {
              onError: (err) => {
                console.error("[tRPC] saveTrade fehlgeschlagen:", err);
                // Fallback zu LocalStorage
                setStorageMode("local");
              },
            }
          );
        }

        return {
          ...prev,
          [symbol]: {
            ...coinState,
            activeTrade: newTrade,
          },
        };
      });
    },
    [storageMode, saveTradeMutation]
  );

  // ─── Trade-Monitoring: TP/SL-Überprüfung ───────────────────────────────────
  useEffect(() => {
    monitoringIntervalRef.current = setInterval(() => {
      setTradingState((prev) => {
        let updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach((symbol) => {
          const coinState = updated[symbol];
          const activeTrade = coinState?.activeTrade;

          if (activeTrade?.status === "ACTIVE") {
            const currentPrice = marketData[symbol] || 0;
            const exitReason = checkTradeExit(activeTrade, currentPrice);

            if (exitReason) {
              const closedTrade = closeTrade(activeTrade, exitReason, currentPrice);
              const newHistory = updateTradeHistory(coinState.history, closedTrade);
              const newHistoryByTf = updateHistoryByTimeframe(coinState.historyByTimeframe || {}, closedTrade);
              const newWinrate = calculateWinrate(newHistory);
              const newWinrateByTf = calculateWinrateByTimeframe(newHistoryByTf);

              // Aktualisiere in tRPC (asynchron)
              if (storageMode === "trpc" && activeTrade.id) {
                updateTradeMutation.mutate(
                  {
                    id: parseInt(activeTrade.id),
                    closePrice: currentPrice,
                    status: "CLOSED",
                    profitLoss: (currentPrice - activeTrade.entryPrice) * 1, // quantity = 1
                    profitLossPercent: ((currentPrice - activeTrade.entryPrice) / activeTrade.entryPrice) * 100,
                  },
                  {
                    onError: (err) => {
                      console.error("[tRPC] updateTrade fehlgeschlagen:", err);
                      setStorageMode("local");
                    },
                  }
                );
              }

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
  }, [marketData, storageMode, updateTradeMutation]);

  return {
    tradingState,
    generateSignal,
    isLoading,
    storageMode,
  };
}
