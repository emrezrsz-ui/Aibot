/**
 * Crypto Signal Scanner — 24/7 Backend Server
 * =============================================
 * Eigenständiger Node.js/Express-Server der unabhängig vom Browser läuft.
 * Scannt alle 30 Sekunden die Binance API und cached die Signale.
 * Das Frontend kann die Signale jederzeit via REST API abrufen.
 *
 * Deployment: Replit, Railway, Render, Fly.io, oder eigener VPS
 */

import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS: Erlaube Anfragen vom Frontend ─────────────────────────────────────
app.use(cors({
  origin: "*", // In Produktion: auf deine Domain einschränken
  methods: ["GET"],
}));
app.use(express.json());

// ─── Konfiguration ────────────────────────────────────────────────────────────
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const INTERVALS = ["1m", "5m", "15m", "1h", "4h"];
const BINANCE_API = "https://api.binance.us/api/v3";
const SCAN_INTERVAL_MS = 30_000; // Alle 30 Sekunden scannen
const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // Alle 14 Minuten (verhindert Sleep auf Replit/Render)

// ─── Signal-Cache (im Speicher) ───────────────────────────────────────────────
const signalCache = new Map(); // key: "BTCUSDT-15m" → SignalData
const lastScanTime = { value: null };
let scanCount = 0;

// ─── RSI Berechnung ───────────────────────────────────────────────────────────
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ─── EMA Berechnung ───────────────────────────────────────────────────────────
function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── Signal generieren ────────────────────────────────────────────────────────
function generateSignal(rsi, ema12, ema26, currentPrice) {
  let signal = "NEUTRAL";
  let strength = 50;

  if (rsi < 35 || ema12 > ema26) {
    signal = "BUY";
    strength = 55;
    if (rsi < 35) strength += Math.min(25, (35 - rsi) * 1.5);
    if (ema12 > ema26) strength += 10;
    if (currentPrice > ema12) strength += 5;
  } else if (rsi > 65 || ema12 < ema26) {
    signal = "SELL";
    strength = 55;
    if (rsi > 65) strength += Math.min(25, (rsi - 65) * 1.5);
    if (ema12 < ema26) strength += 10;
    if (currentPrice < ema12) strength += 5;
  }

  return { signal, strength: Math.min(100, Math.round(strength)) };
}

// ─── Binance API Fetch ────────────────────────────────────────────────────────
async function fetchKlines(symbol, interval, limit = 100) {
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Binance API Fehler: ${res.status}`);
  const data = await res.json();
  return data.map(k => parseFloat(k[4])); // Schlusskurse
}

// ─── Einzelnes Symbol scannen ─────────────────────────────────────────────────
async function scanSymbol(symbol, interval) {
  try {
    const closes = await fetchKlines(symbol, interval, 100);
    if (closes.length < 30) return null;

    const currentPrice = closes[closes.length - 1];
    const rsi = calculateRSI(closes);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const { signal, strength } = generateSignal(rsi, ema12, ema26, currentPrice);

    return {
      symbol,
      interval,
      signal,
      strength,
      currentPrice,
      rsi: Math.round(rsi * 10) / 10,
      ema12: Math.round(ema12 * 100) / 100,
      ema26: Math.round(ema26 * 100) / 100,
      timestamp: Date.now(),
      isStrong: strength >= 75,
    };
  } catch (err) {
    console.error(`[Scanner] Fehler bei ${symbol}/${interval}:`, err.message);
    return null;
  }
}

// ─── Alle Symbole und Intervalle scannen ─────────────────────────────────────
async function runScan() {
  const startTime = Date.now();
  scanCount++;
  console.log(`\n[Scanner] Scan #${scanCount} gestartet — ${new Date().toLocaleTimeString("de-DE")}`);

  const tasks = [];
  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      tasks.push(scanSymbol(symbol, interval));
    }
  }

  // Parallel scannen (max 5 gleichzeitig um Rate-Limits zu vermeiden)
  const results = [];
  for (let i = 0; i < tasks.length; i += 5) {
    const batch = tasks.slice(i, i + 5);
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
    if (i + 5 < tasks.length) {
      await new Promise(r => setTimeout(r, 300)); // 300ms Pause zwischen Batches
    }
  }

  let updated = 0;
  let strongSignals = 0;

  results.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value) {
      const data = result.value;
      const key = `${data.symbol}-${data.interval}`;
      signalCache.set(key, data);
      updated++;
      if (data.isStrong) strongSignals++;
    }
  });

  lastScanTime.value = Date.now();
  const duration = Date.now() - startTime;
  console.log(`[Scanner] Scan #${scanCount} abgeschlossen — ${updated} Signale aktualisiert, ${strongSignals} starke Signale (${duration}ms)`);
}

// ─── Keep-Alive: Verhindert Sleep auf Replit/Render ──────────────────────────
function startKeepAlive() {
  const selfUrl = process.env.SELF_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      await fetch(`${selfUrl}/health`, { signal: AbortSignal.timeout(5000) });
      console.log(`[Keep-Alive] Ping an ${selfUrl}/health — OK`);
    } catch (err) {
      console.warn("[Keep-Alive] Ping fehlgeschlagen:", err.message);
    }
  }, KEEP_ALIVE_INTERVAL_MS);
}

// ─── API Endpunkte ────────────────────────────────────────────────────────────

// Health Check (auch für Keep-Alive genutzt)
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    uptime: Math.round(process.uptime()),
    scanCount,
    cachedSignals: signalCache.size,
    lastScan: lastScanTime.value
      ? new Date(lastScanTime.value).toISOString()
      : null,
  });
});

// Alle Signale für ein Intervall abrufen
app.get("/api/signals", (req, res) => {
  const { interval = "15m" } = req.query;
  const signals = [];

  for (const symbol of SYMBOLS) {
    const key = `${symbol}-${interval}`;
    const data = signalCache.get(key);
    if (data) signals.push(data);
  }

  res.json({
    interval,
    signals,
    lastScan: lastScanTime.value,
    scanCount,
  });
});

// Einzelnes Symbol abrufen
app.get("/api/signals/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { interval = "15m" } = req.query;
  const key = `${symbol}-${interval}`;
  const data = signalCache.get(key);

  if (!data) {
    return res.status(404).json({ error: "Signal nicht gefunden", symbol, interval });
  }

  res.json(data);
});

// Alle starken Signale (>75%) abrufen
app.get("/api/signals/strong", (req, res) => {
  const strong = [];
  for (const [, data] of signalCache) {
    if (data.isStrong) strong.push(data);
  }
  strong.sort((a, b) => b.strength - a.strength);
  res.json({ count: strong.length, signals: strong });
});

// Alle gecachten Signale (alle Intervalle)
app.get("/api/signals/all", (req, res) => {
  const all = [];
  for (const [, data] of signalCache) {
    all.push(data);
  }
  res.json({ count: all.length, signals: all, lastScan: lastScanTime.value });
});

// Root
app.get("/", (req, res) => {
  res.json({
    name: "Crypto Signal Scanner",
    version: "1.0.0",
    status: "running",
    endpoints: [
      "GET /health",
      "GET /api/signals?interval=15m",
      "GET /api/signals/:symbol?interval=15m",
      "GET /api/signals/strong",
      "GET /api/signals/all",
    ],
  });
});

// ─── Server starten ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Crypto Signal Scanner läuft auf Port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/signals`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`⏱  Scan-Intervall: alle ${SCAN_INTERVAL_MS / 1000} Sekunden\n`);

  // Ersten Scan sofort starten
  runScan();

  // Danach alle 30 Sekunden
  setInterval(runScan, SCAN_INTERVAL_MS);

  // Keep-Alive starten (verhindert Sleep auf Replit/Render/Railway)
  startKeepAlive();
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("\n[Scanner] SIGTERM empfangen — Server wird beendet...");
  process.exit(0);
});
