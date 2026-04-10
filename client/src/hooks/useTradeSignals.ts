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
  calculateStopLossAndTakeProfit,
  parseBinanceCandles,
  extractClosePrices,
  SignalData,
} from "@/lib/indicators";

export interface UseTradeSignalsOptions {
  symbols: string[];
  interval: string;
  refreshInterval?: number; // ms
}

export interface UseTradeSignalsReturn {
  signals: SignalData[];
  marketData: Record<string, number>;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  refetch: () => Promise<void>;
}

export function useTradeSignals({
  symbols,
  interval,
  refreshInterval = 5000,
}: UseTradeSignalsOptions) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [marketData, setMarketData] = useState<Record<string, number>>({});
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

        // Berechne Stop Loss und Take Profit
        const { stopLoss, takeProfit } = calculateStopLossAndTakeProfit(
          signal,
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
          stopLoss,
          takeProfit,
          timestamp: Date.now(),
        };
      });

      const results = await Promise.all(signalPromises);
      setSignals(results);
      
      // Erstelle marketData Map für Trade Monitoring
      const marketDataMap: Record<string, number> = {};
      results.forEach((result) => {
        marketDataMap[result.symbol] = result.currentPrice;
      });
      setMarketData(marketDataMap);
      
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
    marketData,
    loading,
    error,
    lastUpdate,
    refetch: fetchSignals,
  };
}
