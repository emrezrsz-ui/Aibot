/**
 * indicators.ts — Advanced Indicator Calculations
 * ================================================
 * Erweiterte Indikatoren für professionelle Trading-Filter:
 * - EMA 200 (Multi-Timeframe-Analyse)
 * - Volumen-SMA 20 (Volumen-Bestätigung)
 * - Verbesserte Signal-Stärke-Berechnung
 * - XRP-Sonderregel
 */

// ─── EMA Berechnung (generisch) ───────────────────────────────────────────────
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── RSI Berechnung ───────────────────────────────────────────────────────────
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ─── SMA Berechnung (für Volumen) ─────────────────────────────────────────────
export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const sum = values.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// ─── Distanz zum EMA (in Prozent) ──────────────────────────────────────────────
export function calculateEMADistance(currentPrice: number, ema: number): number {
  if (ema === 0) return 0;
  return Math.abs((currentPrice - ema) / ema * 100);
}

// ─── RSI-Stärke-Faktor (0–1) ──────────────────────────────────────────────────
// Wie stark ist der RSI überkauft/überverkauft?
export function calculateRSIStrength(rsi: number): number {
  if (rsi < 30) {
    // Überverkauft: je niedriger, desto stärker (0–30 → 0.5–1.0)
    return 0.5 + (30 - rsi) / 60;
  } else if (rsi > 70) {
    // Überkauft: je höher, desto stärker (70–100 → 0.5–1.0)
    return 0.5 + (rsi - 70) / 60;
  }
  // Neutral (30–70): 0–0.5
  return Math.max(0, (50 - Math.abs(rsi - 50)) / 100);
}

// ─── Volumen-Bestätigung (0–1) ────────────────────────────────────────────────
// Wie stark ist das aktuelle Volumen über dem SMA?
export function calculateVolumeConfirmation(currentVolume: number, volumeSMA: number): number {
  if (volumeSMA === 0) return 0.5;
  const ratio = currentVolume / volumeSMA;
  // 1.0x = 0.5, 1.5x = 0.75, 2.0x = 1.0
  return Math.min(1.0, 0.5 + (ratio - 1) / 2);
}

// ─── Verbesserte Signal-Stärke-Berechnung ─────────────────────────────────────
export interface SignalStrengthInput {
  rsi: number;
  ema12: number;
  ema26: number;
  currentPrice: number;
  currentVolume: number;
  volumeSMA20: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  symbol: string;
}

export function calculateAdvancedSignalStrength(input: SignalStrengthInput): number {
  const {
    rsi,
    ema12,
    ema26,
    currentPrice,
    currentVolume,
    volumeSMA20,
    signal,
    symbol,
  } = input;

  if (signal === "NEUTRAL") return 50;

  // ─── Basis-Stärke (wie bisher) ────────────────────────────────────────────
  let strength = 55;

  // RSI-Komponente (20% Gewichtung)
  const rsiStrength = calculateRSIStrength(rsi);
  if (signal === "BUY" && rsi < 35) {
    strength += rsiStrength * 20;
  } else if (signal === "SELL" && rsi > 65) {
    strength += rsiStrength * 20;
  }

  // EMA-Crossover-Komponente (20% Gewichtung)
  if (signal === "BUY" && ema12 > ema26) {
    strength += 20;
  } else if (signal === "SELL" && ema12 < ema26) {
    strength += 20;
  }

  // Preis-Position zum EMA12 (15% Gewichtung)
  const emaDistance = calculateEMADistance(currentPrice, ema12);
  if (signal === "BUY" && currentPrice > ema12) {
    strength += Math.min(15, emaDistance * 0.5);
  } else if (signal === "SELL" && currentPrice < ema12) {
    strength += Math.min(15, emaDistance * 0.5);
  }

  // Volumen-Komponente (25% Gewichtung)
  const volumeConfirmation = calculateVolumeConfirmation(currentVolume, volumeSMA20);
  strength += volumeConfirmation * 25;

  // ─── XRP-Sonderregel: Aggressivere Volumen-Gewichtung ─────────────────────
  if (symbol === "XRPUSDT") {
    // Bei XRP: Volumen-Ausbrüche stärker gewichten
    const volumeRatio = currentVolume / volumeSMA20;
    if (volumeRatio > 1.5) {
      // Volumen-Spike: +10 bis +20 Punkte
      strength += Math.min(20, (volumeRatio - 1.5) * 20);
    }
  }

  return Math.min(100, Math.round(strength));
}

// ─── Multi-Timeframe-Trend-Filter ─────────────────────────────────────────────
/**
 * Prüft, ob der aktuelle Preis über/unter dem EMA 200 des 4h-Charts liegt.
 * Wird für MTF-Trend-Filter verwendet.
 *
 * @param currentPrice Aktueller Preis
 * @param ema200_4h EMA 200 des 4h-Charts
 * @param signal BUY oder SELL
 * @returns true wenn Signal mit Trend übereinstimmt, false sonst
 */
export function checkMTFTrendFilter(
  currentPrice: number,
  ema200_4h: number,
  signal: "BUY" | "SELL"
): boolean {
  if (ema200_4h === 0) return true; // Keine Daten → Filter nicht anwenden

  if (signal === "BUY") {
    // BUY nur wenn Preis über EMA 200 (Aufwärtstrend)
    return currentPrice > ema200_4h;
  } else {
    // SELL nur wenn Preis unter EMA 200 (Abwärtstrend)
    return currentPrice < ema200_4h;
  }
}

// ─── Volumen-Bestätigungs-Filter ──────────────────────────────────────────────
/**
 * Prüft, ob das aktuelle Volumen über dem SMA 20 liegt.
 *
 * @param currentVolume Aktuelles Volumen
 * @param volumeSMA20 SMA 20 des Volumens
 * @returns true wenn Volumen bestätigt, false sonst
 */
export function checkVolumeConfirmationFilter(
  currentVolume: number,
  volumeSMA20: number
): boolean {
  if (volumeSMA20 === 0) return true; // Keine Daten → Filter nicht anwenden
  return currentVolume > volumeSMA20;
}
