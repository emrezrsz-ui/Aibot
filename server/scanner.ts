/**
 * scanner.ts — 24/7 Crypto Scanner (WebSocket + REST Fallback)
 * =============================================================
 * Verbindet sich über WebSocket mit Binance (wss://stream.binance.com)
 * für Echtzeit-Kerzendaten. Berechnet RSI + EMA bei jeder geschlossenen
 * Kerze und speichert Signale in der Datenbank.
 *
 * Architektur:
 * 1. Beim Start: REST-Fetch der letzten 100 Kerzen (historische Basis)
 * 2. Danach: WebSocket-Stream für Live-Updates
 * 3. Bei Kerzen-Close (x=true): Signal berechnen + speichern
 * 4. Automatischer Reconnect bei Verbindungsabbruch
 * 5. Alle 24h: Reconnect (Binance-Limit)
 *
 * Benötigte Env-Vars (Railway Variables):
 *   SUPABASE_URL              = https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = eyJ... (Service Role Key)
 */

import { Router } from "express";
import WebSocket from "ws";
import { insertScanSignal } from "./db";
import { updateLivePrice, loadActiveTrades, checkAndCloseTrades } from "./trade-monitor";
import {
  calculateEMA,
  calculateRSI,
  calculateSMA,
  calculateAdvancedSignalStrength,
  checkMTFTrendFilter,
  checkVolumeConfirmationFilter,
} from "./indicators";
import { getActiveFilters } from "./filter-config";

// ─── Konfiguration ────────────────────────────────────────────────────────────
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const INTERVALS = ["15m", "1h"];
const INTERVALS_WITH_4H = ["15m", "1h", "4h"]; // Für MTF-Analyse
const ALERT_THRESHOLD = 75;
const CANDLE_BUFFER_SIZE = 100; // Rollierende Kerzen-Historie
const VOLUME_BUFFER_SIZE = 100; // Für Volumen-SMA 20
const RECONNECT_DELAY_MS = 5_000; // 5 Sekunden Reconnect-Pause
const MAX_RECONNECT_DELAY_MS = 60_000; // Max 60 Sekunden
const FORCED_RECONNECT_MS = 23 * 60 * 60 * 1000; // 23h (vor Binance 24h-Limit)

// ─── Supabase (dynamisch geladen) ────────────────────────────────────────────
async function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

// Indikatoren werden jetzt aus indicators.ts importiert

// Signal-Generierung wird jetzt in processClosedCandle mit advancedSignalStrength durchgeführt

// ─── Scan-Ergebnis Typ ──────────────────────────────────────────────────────
interface ScanResult {
  symbol: string;
  interval: string;
  signal: string;
  strength: number;
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  timestamp: string;
}

// ─── Kerzen-Buffer: Rollierende Close-Preise pro Symbol/Intervall ────────────
type BufferKey = string; // z.B. "BTCUSDT_15m"
const candleBuffers = new Map<BufferKey, number[]>();
const volumeBuffers = new Map<BufferKey, number[]>(); // Für Volumen-SMA 20
const ema200Buffers = new Map<BufferKey, number[]>(); // Für 4h EMA 200 (MTF)

function getBufferKey(symbol: string, interval: string): BufferKey {
  return `${symbol}_${interval}`;
}

function getBuffer(symbol: string, interval: string): number[] {
  const key = getBufferKey(symbol, interval);
  if (!candleBuffers.has(key)) {
    candleBuffers.set(key, []);
  }
  return candleBuffers.get(key)!;
}

function getVolumeBuffer(symbol: string, interval: string): number[] {
  const key = getBufferKey(symbol, interval);
  if (!volumeBuffers.has(key)) {
    volumeBuffers.set(key, []);
  }
  return volumeBuffers.get(key)!;
}

function getEMA200Buffer(symbol: string, interval: string): number[] {
  const key = getBufferKey(symbol, interval);
  if (!ema200Buffers.has(key)) {
    ema200Buffers.set(key, []);
  }
  return ema200Buffers.get(key)!;
}

function pushToBuffer(symbol: string, interval: string, closePrice: number, volume: number = 0) {
  const buffer = getBuffer(symbol, interval);
  buffer.push(closePrice);
  // Rollierendes Fenster: max CANDLE_BUFFER_SIZE Kerzen behalten
  if (buffer.length > CANDLE_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - CANDLE_BUFFER_SIZE);
  }

  // Volumen speichern
  if (volume > 0) {
    const volBuffer = getVolumeBuffer(symbol, interval);
    volBuffer.push(volume);
    if (volBuffer.length > VOLUME_BUFFER_SIZE) {
      volBuffer.splice(0, volBuffer.length - VOLUME_BUFFER_SIZE);
    }
  }

  // EMA 200 aktualisieren (für MTF-Analyse)
  if (interval === "4h") {
    const ema200Buffer = getEMA200Buffer(symbol, interval);
    ema200Buffer.push(closePrice);
    if (ema200Buffer.length > 200) {
      ema200Buffer.splice(0, ema200Buffer.length - 200);
    }
  }
}

// ─── REST-API: Historische Kerzen laden (Initialisierung) ────────────────────
async function fetchKlinesREST(symbol: string, interval: string, limit = 100): Promise<number[]> {
  const endpoints = [
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json() as unknown[][];
      return data.map((k) => parseFloat(k[4] as string));
    } catch {
      continue;
    }
  }
  throw new Error(`Binance REST API nicht erreichbar für ${symbol}/${interval}`);
}

// ─── Historische Daten laden (für alle Symbole/Intervalle) ───────────────────
async function initializeBuffers(): Promise<void> {
  console.log("[Scanner/WS] Lade historische Kerzendaten via REST...");
  let loaded = 0, failed = 0;

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        const closes = await fetchKlinesREST(symbol, interval, CANDLE_BUFFER_SIZE);
        const key = getBufferKey(symbol, interval);
        candleBuffers.set(key, closes);
        loaded++;
        // Kurze Pause um Rate-Limits zu vermeiden
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        failed++;
        console.warn(`  ⚠️ ${symbol}/${interval}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  console.log(`[Scanner/WS] Historische Daten geladen: ${loaded} OK, ${failed} fehlgeschlagen`);
}

// ─── Status-Tracking ─────────────────────────────────────────────────────────
let wsConnected = false;
let wsReconnectCount = 0;
let wsLastMessage: Date | null = null;
let lastSignalTime: Date | null = null;
let lastScanResults: ScanResult[] = [];
let lastScanError: string | null = null;
let signalCount = 0;
let candleCloseCount = 0;

// ─── Signal verarbeiten (bei Kerzen-Close) ───────────────────────────────────
async function processClosedCandle(
  symbol: string,
  interval: string,
  closePrice: number
): Promise<ScanResult | null> {
  // Close-Preis in den Buffer schreiben
  pushToBuffer(symbol, interval, closePrice);

  const buffer = getBuffer(symbol, interval);
  if (buffer.length < 30) {
    return null; // Nicht genug Daten für Berechnung
  }

  const rsi = calculateRSI(buffer);
  const ema12 = calculateEMA(buffer, 12);
  const ema26 = calculateEMA(buffer, 26);

  // Basis-Signal (BUY/SELL/NEUTRAL)
  let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  if (rsi < 35 || ema12 > ema26) {
    signal = "BUY";
  } else if (rsi > 65 || ema12 < ema26) {
    signal = "SELL";
  }

  // Volumen-Daten für Signal-Stärke
  const volumeBuffer = getVolumeBuffer(symbol, interval);
  const currentVolume = volumeBuffer.length > 0 ? volumeBuffer[volumeBuffer.length - 1] : 0;
  const volumeSMA20 = volumeBuffer.length > 0 ? calculateSMA(volumeBuffer, 20) : 0;

  // Verbesserte Signal-Stärke-Berechnung
  const strength = calculateAdvancedSignalStrength({
    rsi,
    ema12,
    ema26,
    currentPrice: closePrice,
    currentVolume,
    volumeSMA20,
    signal,
    symbol,
  });

  // ─── Filter-Logik anwenden ──────────────────────────────────────────────────
  const filters = getActiveFilters();
  let filterRejected = false;
  let filterReason = "";

  // MTF-Trend-Filter (4h EMA 200)
  if (filters.mtfTrendFilterEnabled && signal !== "NEUTRAL") {
    const ema200Buffer = getEMA200Buffer(symbol, "4h");
    const ema200_4h = ema200Buffer.length >= 200 ? calculateEMA(ema200Buffer, 200) : 0;
    
    if (ema200_4h > 0 && !checkMTFTrendFilter(closePrice, ema200_4h, signal)) {
      filterRejected = true;
      filterReason = `MTF-Filter: Preis ${signal === "BUY" ? "unter" : "über"} EMA200(4h)`;
    }
  }

  // Volumen-Bestätigungs-Filter (SMA 20)
  if (!filterRejected && filters.volumeConfirmationEnabled && signal !== "NEUTRAL") {
    if (!checkVolumeConfirmationFilter(currentVolume, volumeSMA20)) {
      filterRejected = true;
      filterReason = `Volumen-Filter: ${currentVolume.toFixed(0)} <= SMA20(${volumeSMA20.toFixed(0)})`;
    }
  }

  // Log Filter-Ergebnis
  if (filterRejected) {
    console.log(`  ⛔ Signal gefiltert: ${filterReason}`);
  }

  const result: ScanResult = {
    symbol,
    interval,
    signal,
    strength,
    currentPrice: closePrice,
    rsi: Math.round(rsi * 10) / 10,
    ema12: Math.round(ema12 * 100) / 100,
    ema26: Math.round(ema26 * 100) / 100,
    timestamp: new Date().toISOString(),
  };

  const emoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "⚪";
  console.log(
    `  ${emoji} ${symbol.padEnd(10)} ${interval.padEnd(4)} | ` +
    `${signal.padEnd(7)} ${strength}% | RSI: ${result.rsi} | $${closePrice.toFixed(4)}`
  );

  // Signal in DB speichern (≥50%) — aber nur wenn nicht gefiltert
  if (signal !== "NEUTRAL" && strength >= 50 && !filterRejected) {
    try {
      await insertScanSignal({
        symbol,
        interval,
        signal,
        strength,
        currentPrice: String(closePrice),
        rsi: String(result.rsi),
        ema12: String(result.ema12),
        ema26: String(result.ema26),
      });
    } catch (dbErr) {
      console.warn("[Scanner/WS] DB-Insert fehlgeschlagen:", dbErr instanceof Error ? dbErr.message : dbErr);
    }
  }

  // Starke Signale auch in Supabase speichern (für Legacy-Kompatibilität) — aber nur wenn nicht gefiltert
  if (signal !== "NEUTRAL" && strength >= ALERT_THRESHOLD && !filterRejected) {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        const { data: existing } = await supabase
          .from("trades")
          .select("id")
          .eq("symbol", symbol)
          .eq("status", "ACTIVE")
          .limit(1);

        if (!existing || existing.length === 0) {
          const slPct = 0.02;
          const tpPct = 0.04;
          const stopLoss = signal === "BUY" ? closePrice * (1 - slPct) : closePrice * (1 + slPct);
          const takeProfit = signal === "BUY" ? closePrice * (1 + tpPct) : closePrice * (1 - tpPct);

          const { error } = await supabase.from("trades").insert({
            id: crypto.randomUUID(),
            symbol,
            type: signal,
            entry_price: closePrice,
            stop_loss: stopLoss,
            take_profit: takeProfit,
            strength,
            timeframe: interval,
            status: "ACTIVE",
            opened_at: new Date().toISOString(),
          });

          if (error) {
            console.error(`  ❌ Supabase-Fehler: ${error.message}`);
          } else {
            console.log(`  💾 Trade gespeichert: ${symbol} ${signal} @ $${closePrice.toFixed(4)}`);
          }
        }
      }
    } catch (err) {
      console.error("  ❌ Supabase-Exception:", err);
    }
  }

  // Status aktualisieren
  signalCount++;
  lastSignalTime = new Date();

  // lastScanResults aktualisieren (neuestes Signal pro Symbol/Intervall behalten)
  const existingIdx = lastScanResults.findIndex(
    r => r.symbol === symbol && r.interval === interval
  );
  if (existingIdx >= 0) {
    lastScanResults[existingIdx] = result;
  } else {
    lastScanResults.push(result);
  }

  return result;
}

// ─── Binance WebSocket Kline Payload ─────────────────────────────────────────
interface BinanceKlineEvent {
  stream: string;
  data: {
    e: string;    // Event type
    E: number;    // Event time
    s: string;    // Symbol
    k: {
      t: number;  // Kline start time
      T: number;  // Kline close time
      s: string;  // Symbol
      i: string;  // Interval
      o: string;  // Open price
      c: string;  // Close price
      h: string;  // High price
      l: string;  // Low price
      v: string;  // Volume
      x: boolean; // Is this kline closed?
    };
  };
}

// ─── WebSocket-Verbindung ────────────────────────────────────────────────────
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let forcedReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let currentReconnectDelay = RECONNECT_DELAY_MS;
const HEARTBEAT_TIMEOUT_MS = 300_000; // 5 Minuten ohne Nachricht → Reconnect (Binance sendet Heartbeats alle 3min)

function buildStreamUrl(): string {
  // Combined Stream: alle Symbole × alle Intervalle
  const streams = SYMBOLS.flatMap(symbol =>
    INTERVALS.map(interval =>
      `${symbol.toLowerCase()}@kline_${interval}`
    )
  );
  return `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`;
}

function connectWebSocket(): void {
  // Alte Verbindung aufräumen
  if (ws) {
    try { ws.terminate(); } catch { /* ignore */ }
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (forcedReconnectTimer) {
    clearTimeout(forcedReconnectTimer);
    forcedReconnectTimer = null;
  }

  const url = buildStreamUrl();
  const streamCount = SYMBOLS.length * INTERVALS.length;
  console.log(`\n🔌 [Scanner/WS] Verbinde mit Binance WebSocket (${streamCount} Streams)...`);
  console.log(`   URL: ${url.substring(0, 80)}...`);

  ws = new WebSocket(url);

  ws.on("open", () => {
    wsConnected = true;
    currentReconnectDelay = RECONNECT_DELAY_MS; // Reset Backoff
    console.log(`✅ [Scanner/WS] WebSocket verbunden! ${streamCount} Kline-Streams aktiv.`);

    // Forced Reconnect vor dem 24h-Limit
    forcedReconnectTimer = setTimeout(() => {
      console.log("[Scanner/WS] 23h erreicht — erzwinge Reconnect (Binance 24h-Limit)");
      reconnect();
    }, FORCED_RECONNECT_MS);

    // Heartbeat-Watchdog: Wenn >90s keine Nachricht, Reconnect
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (wsLastMessage) {
        const silentMs = Date.now() - wsLastMessage.getTime();
        if (silentMs > HEARTBEAT_TIMEOUT_MS) {
          console.warn(`[Scanner/WS] Heartbeat-Timeout: ${Math.round(silentMs / 1000)}s ohne Nachricht — Reconnect`);
          lastScanError = "Heartbeat-Timeout — Reconnect";
          reconnect();
        }
      }
    }, 30_000); // Prüfe alle 30s
  });

  ws.on("message", (data: WebSocket.Data) => {
    wsLastMessage = new Date();

    try {
      const event = JSON.parse(data.toString()) as BinanceKlineEvent;
      const kline = event.data?.k;
      if (!kline) return;

      const closePrice = parseFloat(kline.c);
      const symbol = kline.s;
      const interval = kline.i;

      // Aktualisiere Live-Preis für Trade-Monitor
      updateLivePrice(symbol, closePrice);

      // Nur geschlossene Kerzen verarbeiten (x === true)
      if (kline.x) {
        candleCloseCount++;
        console.log(`\n📋 [Scanner/WS] Kerze geschlossen: ${symbol} ${interval} @ $${closePrice}`);

        processClosedCandle(symbol, interval, closePrice).catch(err => {
          console.error("[Scanner/WS] Signal-Verarbeitung fehlgeschlagen:", err);
        });
      }
    } catch (err) {
      // Ungültige Nachricht — ignorieren
      console.warn("[Scanner/WS] Ungültige Nachricht:", err instanceof Error ? err.message : err);
    }
  });

  ws.on("ping", (data: Buffer) => {
    // Binance sendet alle 20s einen Ping — Pong antworten
    try {
      ws?.pong(data);
    } catch { /* ignore */ }
  });

  ws.on("error", (err: Error) => {
    console.error("[Scanner/WS] WebSocket-Fehler:", err.message);
    lastScanError = `WebSocket-Fehler: ${err.message}`;
  });

  ws.on("close", (code: number, reason: Buffer) => {
    wsConnected = false;
    const reasonStr = reason.toString() || "unbekannt";
    console.warn(`[Scanner/WS] WebSocket geschlossen (Code: ${code}, Grund: ${reasonStr})`);

    if (forcedReconnectTimer) {
      clearTimeout(forcedReconnectTimer);
      forcedReconnectTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    // Automatischer Reconnect mit exponentiellem Backoff
    scheduleReconnect();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) return; // Bereits geplant

  wsReconnectCount++;
  console.log(`[Scanner/WS] Reconnect #${wsReconnectCount} in ${currentReconnectDelay / 1000}s...`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, currentReconnectDelay);

  // Exponentielles Backoff (5s → 10s → 20s → 40s → 60s max)
  currentReconnectDelay = Math.min(currentReconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
}

function reconnect(): void {
  if (ws) {
    try { ws.close(1000, "Planned reconnect"); } catch { /* ignore */ }
  }
}

// ─── Manueller REST-Scan (Fallback / On-Demand) ─────────────────────────────
export async function runScan(): Promise<ScanResult[]> {
  const startTime = Date.now();
  console.log(`\n🔍 [Scanner/REST] Manueller Scan gestartet: ${new Date().toISOString()}`);

  const results: ScanResult[] = [];

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        const closes = await fetchKlinesREST(symbol, interval, CANDLE_BUFFER_SIZE);
        if (closes.length < 30) continue;

        // Buffer aktualisieren
        const key = getBufferKey(symbol, interval);
        candleBuffers.set(key, closes);

        const currentPrice = closes[closes.length - 1];
        const rsi = calculateRSI(closes);
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);

        // Basis-Signal
        let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
        if (rsi < 35 || ema12 > ema26) {
          signal = "BUY";
        } else if (rsi > 65 || ema12 < ema26) {
          signal = "SELL";
        }

        // Volumen-Daten (REST-Fallback hat kein Volumen, daher Fallback-Wert)
        const strength = calculateAdvancedSignalStrength({
          rsi,
          ema12,
          ema26,
          currentPrice,
          currentVolume: 0,
          volumeSMA20: 0,
          signal,
          symbol,
        });

        const result: ScanResult = {
          symbol, interval, signal, strength, currentPrice,
          rsi: Math.round(rsi * 10) / 10,
          ema12: Math.round(ema12 * 100) / 100,
          ema26: Math.round(ema26 * 100) / 100,
          timestamp: new Date().toISOString(),
        };

        results.push(result);

        const emoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "⚪";
        console.log(
          `  ${emoji} ${symbol.padEnd(10)} ${interval.padEnd(4)} | ` +
          `${signal.padEnd(7)} ${strength}% | RSI: ${result.rsi} | $${currentPrice.toFixed(4)}`
        );

        // Signal in DB speichern (≥50%)
        if (signal !== "NEUTRAL" && strength >= 50) {
          try {
            await insertScanSignal({
              symbol, interval, signal, strength,
              currentPrice: String(currentPrice),
              rsi: String(result.rsi),
              ema12: String(result.ema12),
              ema26: String(result.ema26),
            });
          } catch (dbErr) {
            console.warn("[Scanner/REST] DB-Insert fehlgeschlagen:", dbErr instanceof Error ? dbErr.message : dbErr);
          }
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`  ❌ Fehler bei ${symbol}/${interval}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ [Scanner/REST] Scan abgeschlossen in ${duration}s — ${results.length} Signale`);

  lastScanResults = results;
  lastScanError = null;
  lastSignalTime = new Date();

  return results;
}

// ─── REST-Polling Fallback (wenn WebSocket fehlschlaegt) ──────────────────────
let restPollingTimer: ReturnType<typeof setInterval> | null = null;

function startRESTPolling(): void {
  if (restPollingTimer) return; // Bereits aktiv
  console.log("[Scanner/REST] Starte REST-Polling (WebSocket nicht verfuegbar)...");
  
  // Sofort einen Scan durchfuehren
  runScan().catch(err => console.error("[Scanner/REST] Fehler:", err));
  
  // Dann alle 5 Minuten
  restPollingTimer = setInterval(() => {
    runScan().catch(err => console.error("[Scanner/REST] Fehler:", err));
  }, 5 * 60 * 1000);
}

function stopRESTPolling(): void {
  if (restPollingTimer) {
    clearInterval(restPollingTimer);
    restPollingTimer = null;
    console.log("[Scanner/REST] REST-Polling gestoppt");
  }
}

// ─── Start-Funktion ──────────────────────────────────────────────────────────
export async function startAutoScan(): Promise<void> {
  console.log("[Scanner] Starte Scanner (WebSocket + REST-Fallback)...");
  console.log(`[Scanner] Symbole: ${SYMBOLS.join(", ")}`);
  console.log(`[Scanner] Intervalle: ${INTERVALS.join(", ")}`);

  // 1. Historische Daten via REST laden
  await initializeBuffers();

  // 2. WebSocket-Verbindung aufbauen (mit REST-Fallback)
  connectWebSocket();
  
  // 3. Nach 30 Sekunden: Wenn WebSocket nicht verbunden, starte REST-Polling
  setTimeout(() => {
    if (!wsConnected) {
      console.warn("[Scanner] WebSocket nach 30s nicht verbunden — starte REST-Polling Fallback");
      startRESTPolling();
    }
  }, 30_000);
}

// ─── Express Router ──────────────────────────────────────────────────────────
export function createScannerRouter(): Router {
  const router = Router();

  // Health-Check (erweitert um WebSocket-Status)
  router.get("/health", (_req, res) => {
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    );
    res.json({
      status: "ok",
      service: "Crypto Signal Scanner (WebSocket)",
      mode: wsConnected ? "websocket" : "disconnected",
      uptime: Math.round(process.uptime()),
      websocket: {
        connected: wsConnected,
        reconnectCount: wsReconnectCount,
        lastMessage: wsLastMessage?.toISOString() ?? null,
      },
      signals: {
        lastSignal: lastSignalTime?.toISOString() ?? null,
        totalSignals: signalCount,
        candleCloses: candleCloseCount,
        lastError: lastScanError,
      },
      buffers: {
        initialized: candleBuffers.size,
        expected: SYMBOLS.length * INTERVALS.length,
      },
      supabaseConfigured,
      symbols: SYMBOLS,
      intervals: INTERVALS,
    });
  });

  // Manueller Scan-Trigger (REST-Fallback)
  router.post("/api/scan", async (_req, res) => {
    try {
      const results = await runScan();
      res.json({ success: true, results, count: results.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Letzte Scan-Ergebnisse abrufen
  router.get("/api/signals", (_req, res) => {
    res.json({
      success: true,
      mode: wsConnected ? "websocket" : "rest-fallback",
      lastSignal: lastSignalTime?.toISOString() ?? null,
      results: lastScanResults,
      strongSignals: lastScanResults.filter(r => r.strength >= ALERT_THRESHOLD && r.signal !== "NEUTRAL"),
    });
  });

  // Starke Signale
  router.get("/api/signals/strong", (_req, res) => {
    const strong = lastScanResults.filter(r => r.strength >= ALERT_THRESHOLD && r.signal !== "NEUTRAL");
    res.json({ success: true, count: strong.length, signals: strong });
  });

  // WebSocket Reconnect erzwingen
  router.post("/api/scanner/reconnect", (_req, res) => {
    console.log("[Scanner/WS] Manueller Reconnect angefordert");
    reconnect();
    res.json({ success: true, message: "Reconnect initiiert" });
  });

  return router;
}
