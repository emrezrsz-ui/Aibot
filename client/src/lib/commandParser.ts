/**
 * Command Parser für AI Command Center
 * Parst Befehle wie "XRP5" oder "BTC15m" und führt Markt-Analysen durch
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { fetchKlines, fetchTicker } from "./binance";
import {
  calculateRSI,
  calculateEMA,
  getCurrencyInfo,
  parseBinanceCandles,
  extractClosePrices,
} from "./indicators";

export interface CommandAnalysisResult {
  success: boolean;
  ticker: string;
  displayName: string;
  timeframe: string;
  displayTimeframe: string; // Für die Anzeige (z.B. "1H", "5M")
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  reasoning: string;
  accuracy: number; // Prozentsatz basierend auf RSI-Abstand
  timestamp: number;
  error?: string;
}

// Mapping von Timeframe-Shortcuts zu Binance-Intervallen
// WICHTIG: Alle Keys sind UPPERCASE, da der Input zu UPPERCASE konvertiert wird
const TIMEFRAME_MAP: Record<string, { binance: string; display: string }> = {
  "1": { binance: "1m", display: "1M" },
  "1M": { binance: "1m", display: "1M" },
  "5": { binance: "5m", display: "5M" },
  "5M": { binance: "5m", display: "5M" },
  "15": { binance: "15m", display: "15M" },
  "15M": { binance: "15m", display: "15M" },
  "1H": { binance: "1h", display: "1H" },
  "4H": { binance: "4h", display: "4H" },
  "1D": { binance: "1d", display: "1D" },
  "H": { binance: "1h", display: "1H" },
  "D": { binance: "1d", display: "1D" },
  "M": { binance: "1m", display: "1M" },
};

// Bekannte Kryptowährungen
const KNOWN_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "LTC",
  "BCH",
  "XLM",
  "LINK",
  "UNI",
  "MATIC",
  "AVAX",
  "ATOM",
  "NEAR",
];

/**
 * Parst einen Befehl wie "XRP5" oder "BTC15m" oder "ETH1h"
 * Gibt Ticker, Binance-Timeframe und Display-Timeframe zurück
 */
export function parseCommand(command: string): {
  ticker: string;
  timeframe: string;
  displayTimeframe: string;
  error?: string;
} {
  const input = command.toUpperCase().trim();

  // Versuche Ticker und Timeframe zu extrahieren
  let ticker = "";
  let timeframeStr = "";

  // Finde den Ticker (erste 1-4 Zeichen)
  for (let i = 1; i <= 4; i++) {
    const potential = input.substring(0, i);
    if (KNOWN_TICKERS.includes(potential)) {
      ticker = potential;
      timeframeStr = input.substring(i);
      break;
    }
  }

  if (!ticker) {
    return {
      ticker: "",
      timeframe: "",
      displayTimeframe: "",
      error: `Unbekannter Ticker. Versuche: ${KNOWN_TICKERS.slice(0, 5).join(", ")}...`,
    };
  }

  // Wenn kein Timeframe angegeben, nutze Standard (15m)
  if (!timeframeStr) {
    timeframeStr = "15";
  }

  // Konvertiere Timeframe-Shortcut zu Binance-Format und Display-Format
  // timeframeStr ist bereits UPPERCASE, also direkt in Map nachschlagen
  const timeframeConfig = TIMEFRAME_MAP[timeframeStr] || TIMEFRAME_MAP["15"];
  
  if (!TIMEFRAME_MAP[timeframeStr]) {
    console.warn(`Timeframe "${timeframeStr}" nicht in TIMEFRAME_MAP gefunden. Verwende Standard (15m).`);
  }
  
  const timeframe = timeframeConfig.binance;
  const displayTimeframe = timeframeConfig.display;

  return { ticker, timeframe, displayTimeframe };
}

/**
 * Berechnet die Accuracy basierend auf RSI-Abstand von Extremen
 */
function calculateAccuracy(rsi: number, signal: "BUY" | "SELL" | "NEUTRAL"): number {
  if (signal === "NEUTRAL") {
    return 45; // Neutrale Signale haben niedrigere Accuracy
  }

  if (signal === "BUY") {
    // Je näher RSI an 30 (überverkauft), desto höher die Accuracy
    const distance = Math.max(0, 30 - rsi);
    return Math.min(95, 50 + distance * 1.5);
  }

  // SELL
  // Je näher RSI an 70 (overkauft), desto höher die Accuracy
  const distance = Math.max(0, rsi - 70);
  return Math.min(95, 50 + distance * 1.5);
}

/**
 * Führt eine Markt-Analyse für einen Ticker und Timeframe durch
 */
export async function analyzeMarket(
  ticker: string,
  timeframe: string,
  displayTimeframe: string
): Promise<CommandAnalysisResult> {
  try {
    const symbol = `${ticker}USDT`;
    const currencyInfo = getCurrencyInfo(symbol);

    // Fetche Ticker-Daten
    const tickerData = await fetchTicker(symbol);
    const currentPrice = parseFloat(tickerData.lastPrice);

    // Fetche Kerzendaten mit dem angeforderten Timeframe
    const klines = await fetchKlines(symbol, timeframe, 100);
    const candles = parseBinanceCandles(klines);
    const closePrices = extractClosePrices(candles);

    // Berechne Indikatoren
    const rsi = calculateRSI(closePrices, 14);
    const ema12 = calculateEMA(closePrices, 12);
    const ema26 = calculateEMA(closePrices, 26);

    // Generiere Signal und Begründung
    const { signal, reasoning } = generateAnalysisSignal(
      rsi,
      ema12,
      ema26,
      currentPrice
    );

    // Berechne Accuracy
    const accuracy = calculateAccuracy(rsi, signal);

    return {
      success: true,
      ticker,
      displayName: currencyInfo.displayName,
      timeframe,
      displayTimeframe,
      currentPrice,
      rsi,
      ema12,
      ema26,
      signal,
      reasoning,
      accuracy: Math.round(accuracy),
      timestamp: Date.now(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Fehler bei der Analyse";
    return {
      success: false,
      ticker,
      displayName: "",
      timeframe,
      displayTimeframe: "",
      currentPrice: 0,
      rsi: 0,
      ema12: 0,
      ema26: 0,
      signal: "NEUTRAL",
      reasoning: "",
      accuracy: 0,
      timestamp: Date.now(),
      error: errorMessage,
    };
  }
}

/**
 * Generiert ein Signal mit detaillierter Begründung
 */
function generateAnalysisSignal(
  rsi: number,
  ema12: number,
  ema26: number,
  currentPrice: number
): { signal: "BUY" | "SELL" | "NEUTRAL"; reasoning: string } {
  const reasons: string[] = [];
  let buyScore = 0;
  let sellScore = 0;

  // RSI-Analyse
  if (rsi < 30) {
    reasons.push("RSI überverkauft");
    buyScore += 2;
  } else if (rsi > 70) {
    reasons.push("RSI overkauft");
    sellScore += 2;
  } else if (rsi < 50) {
    reasons.push("RSI schwach");
    sellScore += 1;
  } else {
    reasons.push("RSI neutral");
  }

  // EMA-Analyse
  if (ema12 > ema26) {
    reasons.push("EMA 12 > 26 (Aufwärtstrend)");
    buyScore += 2;
  } else if (ema12 < ema26) {
    reasons.push("EMA 12 < 26 (Abwärtstrend)");
    sellScore += 2;
  } else {
    reasons.push("EMA neutral");
  }

  // Preis-Position
  if (currentPrice > ema12 && currentPrice > ema26) {
    reasons.push("Preis über EMAs");
    buyScore += 1;
  } else if (currentPrice < ema12 && currentPrice < ema26) {
    reasons.push("Preis unter EMAs");
    sellScore += 1;
  }

  // Bestimme Signal
  let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  if (buyScore > sellScore + 1) {
    signal = "BUY";
  } else if (sellScore > buyScore + 1) {
    signal = "SELL";
  }

  // Erstelle Begründung
  const reasoning = createReasoning(signal, reasons, rsi, ema12, ema26);

  return { signal, reasoning };
}

/**
 * Erstellt eine menschenlesbare Begründung für das Signal
 */
function createReasoning(
  signal: "BUY" | "SELL" | "NEUTRAL",
  reasons: string[],
  rsi: number,
  ema12: number,
  ema26: number
): string {
  if (signal === "BUY") {
    return `Kaufsignal erkannt: ${reasons.slice(0, 2).join(", ")}. Technische Indikatoren deuten auf Aufwärtspotenzial hin.`;
  } else if (signal === "SELL") {
    return `Verkaufssignal erkannt: ${reasons.slice(0, 2).join(", ")}. Technische Indikatoren deuten auf Abwärtsdruck hin.`;
  } else {
    // NEUTRAL - mit Vorsicht-Erklärung
    const conflictingSignals = reasons.slice(0, 2).join(" vs. ");
    return `Vorsicht: Widersprüchliche Signale (${conflictingSignals}). Warte auf klarere Marktbedingungen, bevor du handelst.`;
  }
}
