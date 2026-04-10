/**
 * Command Parser für AI Command Center
 * Parst Befehle wie "XRP5" oder "BTC15" und führt Markt-Analysen durch
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
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  reasoning: string;
  timestamp: number;
  error?: string;
}

// Mapping von Timeframe-Shortcuts zu Binance-Intervallen
const TIMEFRAME_MAP: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "h": "1h",
  "d": "1d",
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
 * Parst einen Befehl wie "XRP5" oder "BTC15m"
 * Gibt Ticker und Timeframe zurück
 */
export function parseCommand(command: string): {
  ticker: string;
  timeframe: string;
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
      error: `Unbekannter Ticker. Versuche: ${KNOWN_TICKERS.slice(0, 5).join(", ")}...`,
    };
  }

  // Wenn kein Timeframe angegeben, nutze Standard (15m)
  if (!timeframeStr) {
    timeframeStr = "15";
  }

  // Konvertiere Timeframe-Shortcut zu Binance-Format
  const timeframe = TIMEFRAME_MAP[timeframeStr] || TIMEFRAME_MAP["15"];

  return { ticker, timeframe };
}

/**
 * Führt eine Markt-Analyse für einen Ticker und Timeframe durch
 */
export async function analyzeMarket(
  ticker: string,
  timeframe: string
): Promise<CommandAnalysisResult> {
  try {
    const symbol = `${ticker}USDT`;
    const currencyInfo = getCurrencyInfo(symbol);

    // Fetche Ticker-Daten
    const tickerData = await fetchTicker(symbol);
    const currentPrice = parseFloat(tickerData.lastPrice);

    // Fetche Kerzendaten
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

    return {
      success: true,
      ticker,
      displayName: currencyInfo.displayName,
      timeframe,
      currentPrice,
      rsi,
      ema12,
      ema26,
      signal,
      reasoning,
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
      currentPrice: 0,
      rsi: 0,
      ema12: 0,
      ema26: 0,
      signal: "NEUTRAL",
      reasoning: "",
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
