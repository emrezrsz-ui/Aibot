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
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
}

export interface CurrencyInfo {
  symbol: string;
  displayName: string;
  color: string; // Hex color für Markenfarbe
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
 * Berechnet Stop Loss und Take Profit
 * BUY: SL = 1.5% unter Preis, TP = 3% über Preis
 * SELL: SL = 1.5% über Preis, TP = 3% unter Preis
 */
export function calculateStopLossAndTakeProfit(
  signal: "BUY" | "SELL" | "NEUTRAL",
  currentPrice: number
): { stopLoss: number; takeProfit: number } {
  if (signal === "NEUTRAL") {
    return { stopLoss: 0, takeProfit: 0 };
  }

  if (signal === "BUY") {
    const stopLoss = currentPrice * 0.985; // 1.5% unter
    const takeProfit = currentPrice * 1.03; // 3% über
    return {
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
    };
  }

  // SELL
  const stopLoss = currentPrice * 1.015; // 1.5% über
  const takeProfit = currentPrice * 0.97; // 3% unter
  return {
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
  };
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
 * Gibt Währungsinformationen zurück (Name und Markenfarbe)
 */
export function getCurrencyInfo(symbol: string): CurrencyInfo {
  const currencyMap: Record<string, CurrencyInfo> = {
    BTCUSDT: {
      symbol: "BTCUSDT",
      displayName: "BTC/USDT",
      color: "#F7931A", // Bitcoin Orange
    },
    ETHUSDT: {
      symbol: "ETHUSDT",
      displayName: "ETH/USDT",
      color: "#627EEA", // Ethereum Purple-Blue
    },
    SOLUSDT: {
      symbol: "SOLUSDT",
      displayName: "SOL/USDT",
      color: "#14F195", // Solana Green
    },
  };

  return (
    currencyMap[symbol] || {
      symbol,
      displayName: symbol.replace("USDT", "/USDT"),
      color: "#00d9ff",
    }
  );
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

/**
 * Formatiert Preis mit korrekter Dezimalstelle
 */
export function formatPriceValue(price: number, decimals: number = 2): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
