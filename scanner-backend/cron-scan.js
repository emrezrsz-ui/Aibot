/**
 * cron-scan.js — GitHub Actions Cron-Job Scanner
 * ================================================
 * Wird von GitHub Actions alle 5 Minuten ausgeführt.
 * Scannt die Binance API und speichert Signale in Supabase.
 *
 * Benötigte GitHub Secrets:
 *   SUPABASE_URL              = https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = eyJ... (Service Role Key, NICHT Anon Key!)
 *
 * Lokaler Test:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node cron-scan.js
 */

import { createClient } from "@supabase/supabase-js";

// ─── Konfiguration ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BINANCE_API = "https://api.binance.us/api/v3";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const INTERVALS = (process.env.SCAN_INTERVAL || "15m").split(",");
const ALERT_THRESHOLD = 75;

// ─── Supabase-Client ──────────────────────────────────────────────────────────
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  console.log("✅ Supabase verbunden:", SUPABASE_URL);
} else {
  console.warn("⚠️  Supabase nicht konfiguriert — nur Konsolen-Ausgabe");
}

// ─── RSI Berechnung ───────────────────────────────────────────────────────────
function calculateRSI(prices, period = 14) {
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
async function fetchKlines(symbol, interval, limit = 100) {
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Binance API ${res.status}: ${symbol}/${interval}`);
  const data = await res.json();
  return data.map(k => parseFloat(k[4])); // Schlusskurse
}

// ─── Signal in Supabase speichern ─────────────────────────────────────────────
async function saveSignalToSupabase(signalData) {
  if (!supabase) return;

  // Speichere als "scan_result" in einer separaten Tabelle (optional)
  // Hier: Nur starke Signale als potenzielle Trades speichern
  if (signalData.signal === "NEUTRAL" || signalData.strength < ALERT_THRESHOLD) return;

  const tradeId = `${signalData.symbol}-${Date.now()}`;

  // Prüfe ob bereits ein aktiver Trade für dieses Symbol existiert
  const { data: existingTrades } = await supabase
    .from("trades")
    .select("id")
    .eq("symbol", signalData.symbol)
    .eq("status", "ACTIVE")
    .limit(1);

  if (existingTrades && existingTrades.length > 0) {
    console.log(`  ⏭️  ${signalData.symbol}: Aktiver Trade vorhanden — überspringe`);
    return;
  }

  // Berechne SL und TP
  const price = signalData.currentPrice;
  const slPercent = 0.02; // 2% Stop-Loss
  const tpPercent = 0.04; // 4% Take-Profit (2:1 RRR)

  const stopLoss = signalData.signal === "BUY"
    ? price * (1 - slPercent)
    : price * (1 + slPercent);
  const takeProfit = signalData.signal === "BUY"
    ? price * (1 + tpPercent)
    : price * (1 - tpPercent);

  const { error } = await supabase.from("trades").insert({
    id: tradeId,
    symbol: signalData.symbol,
    type: signalData.signal,
    entry_price: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    strength: signalData.strength,
    timeframe: signalData.interval,
    status: "ACTIVE",
    opened_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`  ❌ Supabase-Fehler für ${signalData.symbol}:`, error.message);
  } else {
    console.log(`  💾 Trade gespeichert: ${signalData.symbol} ${signalData.signal} @ $${price.toFixed(2)}`);
  }
}

// ─── Haupt-Scan-Funktion ──────────────────────────────────────────────────────
async function runCronScan() {
  const startTime = Date.now();
  console.log(`\n🔍 Cron-Scan gestartet: ${new Date().toISOString()}`);
  console.log(`   Symbole: ${SYMBOLS.join(", ")}`);
  console.log(`   Intervalle: ${INTERVALS.join(", ")}`);

  const results = [];
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

        const result = {
          symbol, interval, signal, strength, currentPrice,
          rsi: Math.round(rsi * 10) / 10,
          timestamp: new Date().toISOString(),
        };

        results.push(result);

        const emoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "⚪";
        const strong = strength >= ALERT_THRESHOLD ? " ⚡ STARK!" : "";
        console.log(
          `  ${emoji} ${symbol.padEnd(10)} ${interval.padEnd(4)} | ` +
          `${signal.padEnd(7)} ${strength}%${strong} | ` +
          `RSI: ${result.rsi.toFixed(1)} | $${currentPrice.toFixed(2)}`
        );

        if (signal !== "NEUTRAL" && strength >= ALERT_THRESHOLD) {
          strongSignals++;
          await saveSignalToSupabase(result);
        }

        // Kurze Pause zwischen Requests
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`  ❌ Fehler bei ${symbol}/${interval}:`, err.message);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Scan abgeschlossen in ${duration}s`);
  console.log(`   ${results.length} Signale gescannt, ${strongSignals} starke Signale (≥${ALERT_THRESHOLD}%)`);

  // Exit-Code 0 = Erfolg
  process.exit(0);
}

// ─── Starten ──────────────────────────────────────────────────────────────────
runCronScan().catch(err => {
  console.error("❌ Kritischer Fehler:", err);
  process.exit(1);
});
