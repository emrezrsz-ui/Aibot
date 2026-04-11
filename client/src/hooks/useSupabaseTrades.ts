/**
 * useSupabaseTrades Hook
 * ======================
 * Persistiert Trade-Daten in Supabase.
 * Fällt automatisch auf lokalen Speicher zurück wenn Supabase nicht konfiguriert ist.
 *
 * Strategie:
 * - Beim Start: Aktive Trades aus Supabase laden (Wiederherstellung nach Browser-Neustart)
 * - Beim Öffnen eines Trades: In Supabase einfügen
 * - Beim Schließen eines Trades: In Supabase aktualisieren (Status, close_reason, close_price)
 * - Stats werden automatisch via Datenbank-Trigger aktualisiert
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DbTrade,
  isSupabaseConfigured,
  insertTrade,
  updateTrade,
  loadActiveTrades,
  loadTradeHistory,
  upsertStats,
} from "@/lib/supabase";
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

function tradeToDbTrade(trade: Trade): DbTrade {
  return {
    id: trade.id,
    symbol: trade.symbol,
    type: trade.type,
    entry_price: trade.entryPrice,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit,
    strength: trade.strength,
    timeframe: trade.timeframe,
    status: trade.status,
    close_reason: trade.closeReason ?? null,
    close_price: trade.closePrice ?? null,
    opened_at: new Date(trade.timestamp).toISOString(),
    closed_at: trade.closePrice ? new Date().toISOString() : null,
  };
}

function dbTradeToTrade(db: DbTrade): Trade {
  return {
    id: db.id,
    symbol: (db.symbol as string) ?? "",
    type: (db.type as "BUY" | "SELL") ?? "BUY",
    entryPrice: (db.entry_price as number) ?? 0,
    stopLoss: (db.stop_loss as number) ?? 0,
    takeProfit: (db.take_profit as number) ?? 0,
    strength: (db.strength as number) ?? 0,
    timeframe: (db.timeframe as string) ?? "15m",
    status: (db.status as "ACTIVE" | "CLOSED") ?? "ACTIVE",
    closeReason: db.close_reason ?? undefined,
    closePrice: db.close_price ?? undefined,
    timestamp: db.opened_at ? new Date(db.opened_at as string).getTime() : (db.created_at ? new Date(db.created_at).getTime() : Date.now()),
  };
}

// ─── Lokaler Fallback-Speicher (wenn Supabase nicht konfiguriert) ─────────────

const LOCAL_STORAGE_KEY = "crypto_signal_trading_state";

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

export function useSupabaseTrades(marketData: Record<string, number>) {
  const [tradingState, setTradingState] = useState<CoinTradingState>(
    () => loadFromLocalStorage() ?? initializeTradingState()
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [storageMode, setStorageMode] = useState<"supabase" | "local">(
    isSupabaseConfigured ? "supabase" : "local"
  );

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradingStateRef = useRef(tradingState);
  // Ref für marketData: verhindert stale-closure in generateSignal
  const marketDataRef = useRef<Record<string, number>>(marketData);

  useEffect(() => {
    tradingStateRef.current = tradingState;
    // Immer in LocalStorage spiegeln (als Offline-Backup)
    saveToLocalStorage(tradingState);
  }, [tradingState]);

  // marketDataRef immer aktuell halten
  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  // ─── Beim Start: Aktive Trades aus Supabase wiederherstellen ───────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStorageMode("local");
      setIsLoading(false);
      return;
    }

    async function restoreFromSupabase() {
      setIsLoading(true);
      try {
        const [activeTrades, ...historyResults] = await Promise.all([
          loadActiveTrades(),
          ...["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"].map(sym =>
            loadTradeHistory(sym)
          ),
        ]);

        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
        const newState = initializeTradingState();

        // Aktive Trades zuordnen
        activeTrades.forEach(dbTrade => {
          const trade = dbTradeToTrade(dbTrade);
          if (newState[trade.symbol]) {
            newState[trade.symbol].activeTrade = trade;
          }
        });

        // History zuordnen
        symbols.forEach((sym, idx) => {
          const history = historyResults[idx] || [];
          const trades = history.map(dbTradeToTrade);
          newState[sym].history = trades;
          newState[sym].winrate = calculateWinrate(trades);
          // Baue historyByTimeframe aus den geladenen Trades auf
          const byTf: Record<string, Trade[]> = {};
          trades.forEach(t => {
            const tf = t.timeframe;
            if (!byTf[tf]) byTf[tf] = [];
            if (byTf[tf].length < 5) byTf[tf].push(t);
          });
          newState[sym].historyByTimeframe = byTf;
          newState[sym].winrateByTimeframe = calculateWinrateByTimeframe(byTf);
        });

        setTradingState(newState);
        setStorageMode("supabase");
        console.log(
          `[Supabase] ${activeTrades.length} aktive Trades wiederhergestellt`
        );
      } catch (err) {
        console.error("[Supabase] Wiederherstellung fehlgeschlagen:", err);
        setStorageMode("local");
      } finally {
        setIsLoading(false);
      }
    }

    restoreFromSupabase();
  }, []);

  // ─── Signal generieren und Trade öffnen ────────────────────────────────────
  const generateSignal = useCallback(
    // currentPrice wird direkt übergeben (aus signal.currentPrice) — kein stale-closure Problem
    (symbol: string, type: "BUY" | "SELL", strength: number, timeframe: string = "15m", currentPrice: number = 0) => {
      setTradingState(prev => {
        const coinState = prev[symbol];

        // HARD-LOCK: Kein neues Signal wenn Trade aktiv
        if (coinState?.activeTrade?.status === "ACTIVE") {
          return prev;
        }

        // Preis aus Parameter oder aus Ref als Fallback
        const price = currentPrice > 0 ? currentPrice : (marketDataRef.current[symbol] || 0);
        if (price === 0) return prev;
        const currentPriceToUse = price;

        const newTrade = createTrade(symbol, type, currentPriceToUse, strength, timeframe);

        // Asynchron in Supabase speichern
        if (isSupabaseConfigured) {
          insertTrade(tradeToDbTrade(newTrade)).catch(err =>
            console.error("[Supabase] insertTrade fehlgeschlagen:", err)
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
    // Kein Dependency-Array nötig — marketDataRef ist immer aktuell
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Trade-Monitoring: TP/SL-Überprüfung ───────────────────────────────────
  useEffect(() => {
    monitoringIntervalRef.current = setInterval(() => {
      setTradingState(prev => {
        let updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach(symbol => {
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

              // Asynchron in Supabase aktualisieren
              if (isSupabaseConfigured) {
                updateTrade(closedTrade.id, {
                  status: "CLOSED",
                  close_reason: exitReason,
                  close_price: currentPrice,
                  closed_at: new Date().toISOString(),
                }).then(() => {
                  // Stats aktualisieren
                  upsertStats({
                    symbol,
                    timeframe: closedTrade.timeframe,
                    total_trades: newHistory.filter(t => t.status === "CLOSED").length,
                    winning_trades: newHistory.filter(t => t.closeReason === "TP").length,
                    winrate: newWinrate,
                  });
                }).catch(err =>
                  console.error("[Supabase] updateTrade fehlgeschlagen:", err)
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
  }, [marketData]);

  return {
    tradingState,
    generateSignal,
    isLoading,
    storageMode,
  };
}
