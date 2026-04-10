/**
 * Custom Hook für Trading-Signal-Daten
 * =====================================
 * ARCHITEKTUR: Zwei-Schichten-Ansatz für maximale Performance
 *
 * 1. PREISE (Echtzeit via WebSocket):
 *    - Binance Combined Stream: wss://stream.binance.us:9443/stream?streams=...
 *    - Latenz: <100ms (kein Polling mehr)
 *    - Alle 4 Coins in einer einzigen WebSocket-Verbindung
 *
 * 2. SIGNALE (REST-API, alle 30 Sekunden):
 *    - Klines für RSI/EMA-Berechnung (100 Kerzen pro Coin)
 *    - Nur 4 Requests alle 30s statt 8 Requests alle 10s
 *    - Signale werden mit dem aktuellen WebSocket-Preis kombiniert
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchKlines } from "@/lib/binance";
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
  refreshInterval?: number; // ms — wird für Klines-Refresh verwendet (empfohlen: 30000)
}

export interface UseTradeSignalsReturn {
  signals: SignalData[];
  marketData: Record<string, number>;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  refetch: () => Promise<void>;
}

// Binance WebSocket URL (US-Endpoint, kein API-Key nötig für öffentliche Streams)
const WS_BASE = "wss://stream.binance.us:9443/stream";
// Fallback: Globaler Endpoint falls US-Endpoint nicht erreichbar
const WS_BASE_GLOBAL = "wss://stream.binance.com:9443/stream";

export function useTradeSignals({
  symbols,
  interval,
  refreshInterval = 30000, // Klines alle 30s (statt Preise alle 10s)
}: UseTradeSignalsOptions) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [marketData, setMarketData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Refs für WebSocket und Preise (kein Re-Render bei Preis-Update)
  const wsRef = useRef<WebSocket | null>(null);
  const livePricesRef = useRef<Record<string, number>>({});
  const klineDataRef = useRef<Record<string, { rsi: number; ema12: number; ema26: number }>>({});
  const signalsRef = useRef<SignalData[]>([]);
  const intervalRef = useRef(interval);
  const symbolsRef = useRef(symbols);
  const wsReconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const priceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const useGlobalEndpoint = useRef(false);

  // Refs aktuell halten
  useEffect(() => { intervalRef.current = interval; }, [interval]);
  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);

  // ─── Hilfsfunktion: Signal aus aktuellen Daten berechnen ──────────────────
  const buildSignal = useCallback((symbol: string, currentPrice: number): SignalData | null => {
    const kd = klineDataRef.current[symbol];
    if (!kd || currentPrice === 0) return null;

    const { signal, strength } = generateSignal(kd.rsi, kd.ema12, kd.ema26, currentPrice);
    const { stopLoss, takeProfit } = calculateStopLossAndTakeProfit(signal, currentPrice);

    return {
      symbol,
      currentPrice,
      rsi: kd.rsi,
      ema12: kd.ema12,
      ema26: kd.ema26,
      signal,
      strength,
      stopLoss,
      takeProfit,
      timestamp: Date.now(),
    };
  }, []);

  // ─── Klines laden (REST, alle 30s) ────────────────────────────────────────
  const fetchKlineData = useCallback(async () => {
    try {
      setError(null);
      const currentSymbols = symbolsRef.current;
      const currentInterval = intervalRef.current;

      // Alle Klines parallel laden
      const klinePromises = currentSymbols.map(async (symbol) => {
        const klines = await fetchKlines(symbol, currentInterval, 100);
        const candles = parseBinanceCandles(klines);
        const closePrices = extractClosePrices(candles);
        const rsi = calculateRSI(closePrices, 14);
        const ema12 = calculateEMA(closePrices, 12);
        const ema26 = calculateEMA(closePrices, 26);
        return { symbol, rsi, ema12, ema26 };
      });

      const results = await Promise.all(klinePromises);

      // Kline-Daten speichern
      results.forEach(({ symbol, rsi, ema12, ema26 }) => {
        klineDataRef.current[symbol] = { rsi, ema12, ema26 };
      });

      // Signale mit aktuellen Live-Preisen neu berechnen
      const newSignals: SignalData[] = [];
      const newMarketData: Record<string, number> = {};

      currentSymbols.forEach((symbol) => {
        const currentPrice = livePricesRef.current[symbol] || 0;
        const sig = buildSignal(symbol, currentPrice);
        if (sig) {
          newSignals.push(sig);
          newMarketData[symbol] = currentPrice;
        }
      });

      if (newSignals.length > 0) {
        signalsRef.current = newSignals;
        setSignals(newSignals);
        setMarketData(newMarketData);
        setLastUpdate(Date.now());
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim Abrufen der Klines";
      console.error("[Klines] Fehler:", msg);
      setError(msg);
      setLoading(false);
    }
  }, [buildSignal]);

  // ─── WebSocket: Echtzeit-Preise ────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    // Bestehende Verbindung schließen
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const currentSymbols = symbolsRef.current;
    // Combined Stream: btcusdt@miniTicker/ethusdt@miniTicker/...
    const streams = currentSymbols
      .map(s => `${s.toLowerCase()}@miniTicker`)
      .join("/");

    const baseUrl = useGlobalEndpoint.current ? WS_BASE_GLOBAL : WS_BASE;
    const wsUrl = `${baseUrl}?streams=${streams}`;

    console.log("[WS] Verbinde:", wsUrl);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn("[WS] Verbindung fehlgeschlagen, versuche globalen Endpoint");
      useGlobalEndpoint.current = true;
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Verbunden — Echtzeit-Preise aktiv");
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Combined Stream Format: { stream: "btcusdt@miniTicker", data: { c: "price", ... } }
        if (data.data && data.data.c) {
          const symbol = data.data.s as string; // z.B. "BTCUSDT"
          const price = parseFloat(data.data.c);

          if (price > 0) {
            livePricesRef.current[symbol] = price;
          }
        }
      } catch (e) {
        // Ignoriere Parse-Fehler
      }
    };

    ws.onerror = (e) => {
      console.warn("[WS] Fehler — wechsle zu globalem Endpoint");
      useGlobalEndpoint.current = true;
    };

    ws.onclose = (event) => {
      console.log("[WS] Verbindung getrennt, reconnect in 3s...", event.code);
      wsRef.current = null;
      // Automatischer Reconnect nach 3 Sekunden
      wsReconnectTimer.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
  }, []);

  // ─── Preis-Update-Loop: UI alle 500ms aktualisieren ───────────────────────
  // (WebSocket empfängt Preise schneller als wir rendern müssen)
  const startPriceUpdateLoop = useCallback(() => {
    if (priceUpdateTimer.current) clearInterval(priceUpdateTimer.current);

    priceUpdateTimer.current = setInterval(() => {
      const currentSymbols = symbolsRef.current;
      const newMarketData: Record<string, number> = {};
      const newSignals: SignalData[] = [];
      let hasChanges = false;

      currentSymbols.forEach((symbol) => {
        const livePrice = livePricesRef.current[symbol];
        if (!livePrice || livePrice === 0) return;

        newMarketData[symbol] = livePrice;

        // Nur Signal neu berechnen wenn Kline-Daten vorhanden
        const kd = klineDataRef.current[symbol];
        if (kd) {
          const sig = buildSignal(symbol, livePrice);
          if (sig) {
            newSignals.push(sig);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setMarketData({ ...newMarketData });
        setSignals([...newSignals]);
        setLastUpdate(Date.now());
        if (loading) setLoading(false);
      }
    }, 500); // UI-Update alle 500ms — flüssig ohne Performance-Probleme
  }, [buildSignal, loading]);

  // ─── Initialisierung ──────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Sofort Klines laden (für RSI/EMA)
    fetchKlineData();

    // 2. WebSocket für Echtzeit-Preise starten
    connectWebSocket();

    // 3. Preis-Update-Loop starten
    startPriceUpdateLoop();

    // 4. Klines alle 30s neu laden (für aktualisierte Indikatoren)
    const klineTimer = setInterval(fetchKlineData, refreshInterval);

    return () => {
      // Cleanup
      clearInterval(klineTimer);
      if (priceUpdateTimer.current) clearInterval(priceUpdateTimer.current);
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Verhindere Reconnect beim Unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), interval]);

  // ─── Bei Interval-Wechsel: Klines sofort neu laden ───────────────────────
  useEffect(() => {
    fetchKlineData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  return {
    signals,
    marketData,
    loading,
    error,
    lastUpdate,
    refetch: fetchKlineData,
  };
}
