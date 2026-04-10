/**
 * Technical Indicators Library
 * Berechnet RSI, EMA und generiert Trading-Signale
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalData {
  symbol: string;
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: number; // 0-100
  timestamp: number;
}

/**
 * Berechnet den Relative Strength Index (RSI)
 * RSI > 70 = Overkauft (Verkaufssignal)
 * RSI < 30 = Überverkauft (Kaufsignal)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutrale Rückgabe bei unzureichenden Daten

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

/**
 * Berechnet den Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return Math.round(ema * 100) / 100;
}

/**
 * Generiert Trading-Signale basierend auf RSI und EMA-Crossover
 */
export function generateSignal(
  rsi: number,
  ema12: number,
  ema26: number,
  currentPrice: number
): { signal: "BUY" | "SELL" | "NEUTRAL"; strength: number } {
  let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  let strength = 50;

  // RSI-basierte Signale
  if (rsi < 30) {
    signal = "BUY";
    strength = Math.min(100, 30 - rsi + 70); // Je niedriger RSI, desto stärker das Signal
  } else if (rsi > 70) {
    signal = "SELL";
    strength = Math.min(100, rsi - 70 + 70);
  }

  // EMA-Crossover-Bestätigung
  if (ema12 > ema26 && signal !== "SELL") {
    signal = "BUY";
    strength = Math.min(100, strength + 10);
  } else if (ema12 < ema26 && signal !== "BUY") {
    signal = "SELL";
    strength = Math.min(100, strength + 10);
  }

  // Preis-Bestätigung
  if (currentPrice > ema12 && currentPrice > ema26 && signal === "BUY") {
    strength = Math.min(100, strength + 5);
  } else if (currentPrice < ema12 && currentPrice < ema26 && signal === "SELL") {
    strength = Math.min(100, strength + 5);
  }

  return { signal, strength: Math.round(strength) };
}

/**
 * Konvertiert Binance-Kerzendaten in das interne Format
 */
export function parseBinanceCandles(data: any[]): CandleData[] {
  return data.map((candle) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[7]),
  }));
}

/**
 * Extrahiert Schlusskurse aus Kerzendaten
 */
export function extractClosePrices(candles: CandleData[]): number[] {
  return candles.map((c) => c.close);
}
