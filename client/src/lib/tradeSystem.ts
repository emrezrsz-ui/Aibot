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
  timeframe: string; // z.B. "1m", "5m", "15m", "1h", "4h"
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
    history: Trade[]; // Alle abgeschlossenen Trades (flach, für Supabase-Sync)
    historyByTimeframe: Record<string, Trade[]>; // Letzte 5 Trades pro Timeframe
    winrate: number;
    winrateByTimeframe: Record<string, number>; // Winrate pro Timeframe
  };
}

/**
 * Erstelle einen neuen Trade
 */
export function createTrade(
  symbol: string,
  type: "BUY" | "SELL",
  currentPrice: number,
  strength: number,
  timeframe: string = "15m"
): Trade {
  // Dynamische SL/TP Berechnung basierend auf Timeframe (1:2 Ratio)
  let slPercentage: number;
  let tpPercentage: number;

  // Timeframe-spezifische Ziele
  switch (timeframe.toUpperCase()) {
    case "1M":
      slPercentage = 0.002; // 0.2%
      tpPercentage = 0.004; // 0.4%
      break;
    case "5M":
      slPercentage = 0.003; // 0.3%
      tpPercentage = 0.006; // 0.6%
      break;
    case "15M":
      slPercentage = 0.005; // 0.5%
      tpPercentage = 0.01; // 1.0%
      break;
    case "1H":
      slPercentage = 0.008; // 0.8%
      tpPercentage = 0.016; // 1.6%
      break;
    case "4H":
      slPercentage = 0.015; // 1.5%
      tpPercentage = 0.03; // 3.0%
      break;
    case "1D":
      slPercentage = 0.025; // 2.5%
      tpPercentage = 0.05; // 5.0%
      break;
    default:
      slPercentage = 0.005; // 0.5%
      tpPercentage = 0.01; // 1.0%
  }

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
    id: crypto.randomUUID(),
    symbol,
    type,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    strength,
    timestamp: Date.now(),
    timeframe,
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
 * Aktualisiere Trade History (flach, alle Timeframes)
 */
export function updateTradeHistory(history: Trade[], newTrade: Trade): Trade[] {
  const updated = [newTrade, ...history];
  return updated.slice(0, 50); // Behalte letzte 50 für Supabase-Sync
}

/**
 * Aktualisiere Trade History nach Timeframe (behalte nur letzte 5 pro Timeframe)
 */
export function updateHistoryByTimeframe(
  historyByTimeframe: Record<string, Trade[]>,
  newTrade: Trade
): Record<string, Trade[]> {
  const tf = newTrade.timeframe;
  const existing = historyByTimeframe[tf] || [];
  const updated = [newTrade, ...existing].slice(0, 5); // Max 5 pro Timeframe
  return { ...historyByTimeframe, [tf]: updated };
}

/**
 * Berechne Winrate pro Timeframe
 */
export function calculateWinrateByTimeframe(
  historyByTimeframe: Record<string, Trade[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  Object.entries(historyByTimeframe).forEach(([tf, trades]) => {
    const closed = trades.filter(t => t.status === "CLOSED");
    if (closed.length === 0) { result[tf] = 0; return; }
    const wins = closed.filter(t => t.closeReason === "TP").length;
    result[tf] = Math.round((wins / closed.length) * 100);
  });
  return result;
}

/**
 * Initialisiere Trading State für alle Coins
 * Keys müssen mit den SYMBOLS in Home.tsx übereinstimmen (BTCUSDT, ETHUSDT, etc.)
 */
export function initializeTradingState(): CoinTradingState {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
  const state: CoinTradingState = {};
  symbols.forEach((symbol) => {
    state[symbol] = {
      activeTrade: null,
      history: [],
      historyByTimeframe: {},
      winrate: 0,
      winrateByTimeframe: {},
    };
  });
  return state;
}
