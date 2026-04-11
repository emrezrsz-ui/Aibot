/**
 * trade-monitor.ts — Trade Close Monitor
 * ======================================
 * Überwacht aktive Trades gegen Live-Preise und schließt sie automatisch
 * wenn Take-Profit oder Stop-Loss erreicht wird.
 */

import { Router } from "express";

interface ActiveTrade {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  opened_at: Date;
}

interface LivePrice {
  symbol: string;
  price: number;
  timestamp: Date;
}

// In-Memory Store für aktive Trades und Live-Preise
let activeTrades: Map<string, ActiveTrade> = new Map();
let livePrices: Map<string, LivePrice> = new Map();
let closedTrades: Array<{
  id: string;
  close_price: number;
  close_reason: "TP" | "SL";
  closed_at: Date;
}> = [];

/**
 * Aktualisiere Live-Preis (wird vom Scanner aufgerufen)
 */
export function updateLivePrice(symbol: string, price: number): void {
  livePrices.set(symbol, {
    symbol,
    price,
    timestamp: new Date(),
  });
}

/**
 * Lade aktive Trades aus der Datenbank
 */
export async function loadActiveTrades(
  supabaseClient: any
): Promise<void> {
  try {
    if (!supabaseClient) return;

    const { data: trades, error } = await supabaseClient
      .from("trades")
      .select("*")
      .eq("status", "ACTIVE");

    if (error) {
      console.error("[TradeMonitor] Fehler beim Laden von Trades:", error.message);
      return;
    }

    activeTrades.clear();
    for (const trade of trades || []) {
      activeTrades.set(trade.id, {
        id: trade.id,
        symbol: trade.symbol,
        type: trade.type,
        entry_price: parseFloat(trade.entry_price),
        stop_loss: parseFloat(trade.stop_loss),
        take_profit: parseFloat(trade.take_profit),
        opened_at: new Date(trade.opened_at),
      });
    }

    console.log(`[TradeMonitor] ${activeTrades.size} aktive Trades geladen`);
  } catch (err) {
    console.error("[TradeMonitor] Exception beim Laden:", err);
  }
}

/**
 * Prüfe alle aktiven Trades gegen Live-Preise
 * Schließe automatisch wenn TP oder SL erreicht
 */
export async function checkAndCloseTrades(
  supabaseClient: any
): Promise<void> {
  if (!supabaseClient || activeTrades.size === 0) return;

  const toClose: Array<{
    trade: ActiveTrade;
    close_price: number;
    close_reason: "TP" | "SL";
  }> = [];

  // Prüfe jeden aktiven Trade
  for (const [tradeId, trade] of Array.from(activeTrades.entries())) {
    const livePrice = livePrices.get(trade.symbol);
    if (!livePrice) continue; // Kein Live-Preis verfügbar

    const price = livePrice.price;
    let closeReason: "TP" | "SL" | null = null;

    if (trade.type === "BUY") {
      // BUY: Prüfe TP (oben) und SL (unten)
      if (price >= trade.take_profit) {
        closeReason = "TP";
      } else if (price <= trade.stop_loss) {
        closeReason = "SL";
      }
    } else {
      // SELL: Prüfe TP (unten) und SL (oben)
      if (price <= trade.take_profit) {
        closeReason = "TP";
      } else if (price >= trade.stop_loss) {
        closeReason = "SL";
      }
    }

    if (closeReason) {
      toClose.push({
        trade,
        close_price: price,
        close_reason: closeReason,
      });
    }
  }

  // Schließe alle Trades die TP/SL erreicht haben
  for (const { trade, close_price, close_reason } of toClose) {
    try {
      const { error } = await supabaseClient
        .from("trades")
        .update({
          status: "CLOSED",
          close_price,
          close_reason,
          closed_at: new Date().toISOString(),
        })
        .eq("id", trade.id);

      if (error) {
        console.error(
          `[TradeMonitor] Fehler beim Schließen von Trade ${trade.id}:`,
          error.message
        );
      } else {
        console.log(
          `✅ [TradeMonitor] Trade geschlossen: ${trade.symbol} ${trade.type} @ $${close_price.toFixed(
            4
          )} (${close_reason})`
        );

        // Entferne aus aktiven Trades
        activeTrades.delete(trade.id);
        closedTrades.push({
          id: trade.id,
          close_price,
          close_reason,
          closed_at: new Date(),
        });

        // Behalte nur die letzten 100 geschlossenen Trades im Memory
        if (closedTrades.length > 100) {
          closedTrades = closedTrades.slice(-100);
        }
      }
    } catch (err) {
      console.error("[TradeMonitor] Exception beim Schließen:", err);
    }
  }
}

/**
 * Gebe Status des Trade-Monitors zurück
 */
export function getMonitorStatus() {
  return {
    activeTrades: activeTrades.size,
    recentClosures: closedTrades.length,
    livePrices: livePrices.size,
    lastUpdate: new Date(),
  };
}

/**
 * Express Router für Trade-Monitor Endpoints
 */
export function createTradeMonitorRouter(): Router {
  const router = Router();

  router.get("/monitor/status", (req, res) => {
    res.json(getMonitorStatus());
  });

  return router;
}
