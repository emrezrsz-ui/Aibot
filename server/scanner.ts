/**
 * scanner.ts — 24/7 Crypto Scanner für Railway
 * =============================================
 * Läuft als Teil des Express-Servers.
 * Scannt Binance alle 5 Minuten und speichert starke Signale in Supabase.
 *
 * Benötigte Env-Vars (Railway Variables):
 *   SUPABASE_URL              = https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = eyJ... (Service Role Key)
 */

import { Router } from "express";

// ─── Konfiguration ────────────────────────────────────────────────────────────
const BINANCE_API = "https://api.binance.us/api/v3";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const INTERVALS = ["15m", "1h"];
const ALERT_THRESHOLD = 75;
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten

// ─── Supabase (dynamisch geladen um Build-Fehler zu vermeiden) ────────────────
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

// ─── RSI Berechnung ───────────────────────────────────────────────────────────
function calculateRSI(prices: number[], period = 14): number {
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

// ─── EMA Berechnung ───────────────────────────────────────────────────────────
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── Signal generieren ────────────────────────────────────────────────────────
function generateSignal(rsi: number, ema12: number, ema26: number, currentPrice: number) {
  let signal = "NEUTRAL", strength = 50;
  if (rsi < 35 || ema12 > ema26) {
    signal = "BUY"; strength = 55;
    if (rsi < 35) strength += Math.min(25, (35 - rsi) * 1.5);
    if (ema12 > ema26) strength += 10;
    if (currentPrice > ema12) strength += 5;
  } else if (rsi > 65 || ema12 < ema26) {
    signal = "SELL"; strength = 55;
    if (rsi > 65) strength += Math.min(25, (rsi - 65) * 1.5);
    if (ema12 < ema26) strength += 10;
    if (currentPrice < ema12) strength += 5;
  }
  return { signal, strength: Math.min(100, Math.round(strength)) };
}

// ─── Binance API abfragen ─────────────────────────────────────────────────────
async function fetchKlines(symbol: string, interval: string, limit = 100): Promise<number[]> {
  // Versuche zuerst US-Endpoint, dann globalen Endpoint
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
  throw new Error(`Binance API nicht erreichbar für ${symbol}/${interval}`);
}

// ─── Scan-Ergebnis Typ ────────────────────────────────────────────────────────
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

// ─── Letzter Scan-Status (für /health) ───────────────────────────────────────
let lastScanTime: Date | null = null;
let lastScanResults: ScanResult[] = [];
let lastScanError: string | null = null;
let scanCount = 0;

// ─── Haupt-Scan-Funktion ──────────────────────────────────────────────────────
export async function runScan(): Promise<ScanResult[]> {
  const startTime = Date.now();
  console.log(`\n🔍 [Scanner] Scan gestartet: ${new Date().toISOString()}`);

  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.warn("[Scanner] Supabase nicht konfiguriert — kein Speichern möglich");
  }

  const results: ScanResult[] = [];
  let strongSignals = 0;

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      try {
        const closes = await fetchKlines(symbol, interval, 100);
        if (closes.length < 30) continue;

        const currentPrice = closes[closes.length - 1];
        const rsi = calculateRSI(closes);
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);
        const { signal, strength } = generateSignal(rsi, ema12, ema26, currentPrice);

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

        // Starke Signale in Supabase speichern
        if (supabase && signal !== "NEUTRAL" && strength >= ALERT_THRESHOLD) {
          strongSignals++;
          try {
            // Prüfe ob bereits aktiver Trade vorhanden
            const { data: existing } = await supabase
              .from("trades")
              .select("id")
              .eq("symbol", symbol)
              .eq("status", "ACTIVE")
              .limit(1);

            if (!existing || existing.length === 0) {
              const price = currentPrice;
              const slPct = 0.02;
              const tpPct = 0.04;
              const stopLoss = signal === "BUY" ? price * (1 - slPct) : price * (1 + slPct);
              const takeProfit = signal === "BUY" ? price * (1 + tpPct) : price * (1 - tpPct);

              const { error } = await supabase.from("trades").insert({
                id: crypto.randomUUID(),
                symbol,
                type: signal,
                entry_price: price,
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
                console.log(`  💾 Trade gespeichert: ${symbol} ${signal} @ $${price.toFixed(4)}`);
              }
            } else {
              console.log(`  ⏭️  ${symbol}: Aktiver Trade vorhanden — überspringe`);
            }
          } catch (err) {
            console.error(`  ❌ Supabase-Exception:`, err);
          }
        }

        // Kurze Pause zwischen Requests
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Fehler bei ${symbol}/${interval}:`, msg);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ [Scanner] Scan abgeschlossen in ${duration}s — ${results.length} Signale, ${strongSignals} stark`);

  lastScanTime = new Date();
  lastScanResults = results;
  lastScanError = null;
  scanCount++;

  return results;
}

// ─── Automatischer Cron-Scan ──────────────────────────────────────────────────
let scanTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoScan() {
  if (scanTimer) return; // Bereits gestartet

  console.log(`[Scanner] Auto-Scan gestartet (alle ${SCAN_INTERVAL_MS / 60000} Minuten)`);

  // Ersten Scan nach 30 Sekunden (Server-Startup abwarten)
  setTimeout(() => {
    runScan().catch(err => {
      lastScanError = err instanceof Error ? err.message : String(err);
      console.error("[Scanner] Erster Scan fehlgeschlagen:", lastScanError);
    });
  }, 30_000);

  // Dann alle 5 Minuten
  scanTimer = setInterval(() => {
    runScan().catch(err => {
      lastScanError = err instanceof Error ? err.message : String(err);
      console.error("[Scanner] Scan fehlgeschlagen:", lastScanError);
    });
  }, SCAN_INTERVAL_MS);
}

// ─── Express Router ───────────────────────────────────────────────────────────
export function createScannerRouter(): Router {
  const router = Router();

  // Health-Check
  router.get("/health", (_req, res) => {
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    );
    res.json({
      status: "ok",
      service: "Crypto Signal Scanner",
      uptime: Math.round(process.uptime()),
      lastScan: lastScanTime?.toISOString() ?? null,
      scanCount,
      lastError: lastScanError,
      supabaseConfigured,
      symbols: SYMBOLS,
      intervals: INTERVALS,
    });
  });

  // Manueller Scan-Trigger
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
      lastScan: lastScanTime?.toISOString() ?? null,
      results: lastScanResults,
      strongSignals: lastScanResults.filter(r => r.strength >= ALERT_THRESHOLD && r.signal !== "NEUTRAL"),
    });
  });

  // Starke Signale
  router.get("/api/signals/strong", (_req, res) => {
    const strong = lastScanResults.filter(r => r.strength >= ALERT_THRESHOLD && r.signal !== "NEUTRAL");
    res.json({ success: true, count: strong.length, signals: strong });
  });

  return router;
}
