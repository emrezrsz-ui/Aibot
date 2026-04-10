/**
 * Custom Hook für Trading-Signal-Daten
 * Verwaltet Datenabfrage, Berechnung und Auto-Refresh
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useEffect, useState } from "react";
import { fetchKlines, fetchTicker } from "@/lib/binance";
import {
  calculateRSI,
  calculateEMA,
  generateSignal,
  parseBinanceCandles,
  extractClosePrices,
  SignalData,
} from "@/lib/indicators";

export interface UseTradeSignalsOptions {
  symbols: string[];
  interval: string;
  refreshInterval?: number; // ms
}

export function useTradeSignals({
  symbols,
  interval,
  refreshInterval = 5000,
}: UseTradeSignalsOptions) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const fetchSignals = async () => {
    try {
      setError(null);
      const signalPromises = symbols.map(async (symbol) => {
        // Fetche Ticker-Daten für aktuellen Preis
        const ticker = await fetchTicker(symbol);
        const currentPrice = parseFloat(ticker.lastPrice);

        // Fetche Kerzendaten für Indikator-Berechnung
        const klines = await fetchKlines(symbol, interval, 100);
        const candles = parseBinanceCandles(klines);
        const closePrices = extractClosePrices(candles);

        // Berechne Indikatoren
        const rsi = calculateRSI(closePrices, 14);
        const ema12 = calculateEMA(closePrices, 12);
        const ema26 = calculateEMA(closePrices, 26);

        // Generiere Signal
        const { signal, strength } = generateSignal(
          rsi,
          ema12,
          ema26,
          currentPrice
        );

        return {
          symbol,
          currentPrice,
          rsi,
          ema12,
          ema26,
          signal,
          strength,
          timestamp: Date.now(),
        };
      });

      const results = await Promise.all(signalPromises);
      setSignals(results);
      setLastUpdate(Date.now());
      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fehler beim Abrufen der Daten";
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSignals();
  }, [symbols.join(","), interval]);

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(fetchSignals, refreshInterval);
    return () => clearInterval(timer);
  }, [symbols.join(","), interval, refreshInterval]);

  return {
    signals,
    loading,
    error,
    lastUpdate,
    refetch: fetchSignals,
  };
}
