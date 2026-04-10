/**
 * Trade Persistence System
 * Verwaltet aktive Trades, Trade History und Winrate pro Kryptowährung
 */

export interface Trade {
  id: string;
  symbol: string; // z.B. "BTC/USDT"
  type: "BUY" | "SELL";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  strength: number; // RSI-basierte Signalstärke (0-100)
  timestamp: number; // Zeitstempel der Signal-Generierung
  status: "ACTIVE" | "CLOSED";
  closeReason?: "TP" | "SL"; // Grund für Schließung
  closePrice?: number; // Schlusspreis
}

export interface TradeHistory {
  symbol: string;
  trades: Trade[];
  winrate: number; // Prozentsatz (0-100)
}

export interface CoinTradingState {
  [symbol: string]: {
    activeTrade: Trade | null;
    history: Trade[]; // Letzte 5 Trades
    winrate: number;
  };
}

/**
 * Erstelle einen neuen Trade
 */
export function createTrade(
  symbol: string,
  type: "BUY" | "SELL",
  currentPrice: number,
  strength: number
): Trade {
  const slPercentage = 0.015; // 1.5%
  const tpPercentage = 0.03; // 3%

  let stopLoss: number;
  let takeProfit: number;

  if (type === "BUY") {
    stopLoss = currentPrice * (1 - slPercentage);
    takeProfit = currentPrice * (1 + tpPercentage);
  } else {
    // SELL
    stopLoss = currentPrice * (1 + slPercentage);
    takeProfit = currentPrice * (1 - tpPercentage);
  }

  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    type,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    strength,
    timestamp: Date.now(),
    status: "ACTIVE",
  };
}

/**
 * Überprüfe, ob ein Trade sein Ziel (TP oder SL) erreicht hat
 */
export function checkTradeExit(trade: Trade, currentPrice: number): "TP" | "SL" | null {
  if (trade.status !== "ACTIVE") return null;

  if (trade.type === "BUY") {
    // BUY: TP wenn Preis >= TP, SL wenn Preis <= SL
    if (currentPrice >= trade.takeProfit) {
      return "TP";
    }
    if (currentPrice <= trade.stopLoss) {
      return "SL";
    }
  } else {
    // SELL: TP wenn Preis <= TP, SL wenn Preis >= SL
    if (currentPrice <= trade.takeProfit) {
      return "TP";
    }
    if (currentPrice >= trade.stopLoss) {
      return "SL";
    }
  }

  return null;
}

/**
 * Schließe einen Trade
 */
export function closeTrade(
  trade: Trade,
  closeReason: "TP" | "SL",
  closePrice: number
): Trade {
  return {
    ...trade,
    status: "CLOSED",
    closeReason,
    closePrice,
  };
}

/**
 * Berechne Winrate aus Trade History
 */
export function calculateWinrate(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  if (closedTrades.length === 0) return 0;

  const wins = closedTrades.filter((t) => t.closeReason === "TP").length;
  return Math.round((wins / closedTrades.length) * 100);
}

/**
 * Aktualisiere Trade History (behalte nur letzte 5)
 */
export function updateTradeHistory(history: Trade[], newTrade: Trade): Trade[] {
  const updated = [newTrade, ...history];
  return updated.slice(0, 5); // Behalte nur letzte 5
}

/**
 * Initialisiere Trading State für alle Coins
 */
export function initializeTradingState(): CoinTradingState {
  return {
    "BTC/USDT": {
      activeTrade: null,
      history: [],
      winrate: 0,
    },
    "ETH/USDT": {
      activeTrade: null,
      history: [],
      winrate: 0,
    },
    "SOL/USDT": {
      activeTrade: null,
      history: [],
      winrate: 0,
    },
  };
}
