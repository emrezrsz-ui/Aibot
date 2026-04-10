/**
 * Crypto Signal Dashboard — Service Worker v2.1
 * ===============================================
 * Aufgaben:
 * 1. Push-Benachrichtigungen empfangen und anzeigen
 * 2. Background Scanning: Binance API alle 60s abfragen (auch wenn App im Hintergrund)
 * 3. Signal-Cache im Service Worker für schnellen Zugriff
 * 4. Offline-Fallback für gecachte Daten
 */

const SW_VERSION = "v2.1";
const CACHE_NAME = `crypto-signal-${SW_VERSION}`;
const BINANCE_API = "https://api.binance.us/api/v3";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const SCAN_INTERVAL_MS = 60_000;

const backgroundSignalCache = new Map();
let backgroundScanTimer = null;
let lastBackgroundScan = null;

// ─── Installation ─────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log(`[SW ${SW_VERSION}] Installiert`);
  self.skipWaiting();
});

// ─── Aktivierung ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log(`[SW ${SW_VERSION}] Aktiviert`);
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith("crypto-signal-") && k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      ),
    ])
  );
  startBackgroundScanning();
});

// ─── RSI Berechnung ───────────────────────────────────────────────────────────
function calculateRSI(prices, period) {
  period = period || 14;
  if (prices.length < period + 1) return 50;
  var gains = 0, losses = 0;
  for (var i = 1; i <= period; i++) {
    var diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  var avgGain = gains / period;
  var avgLoss = losses / period;
  for (var j = period + 1; j < prices.length; j++) {
    var d = prices[j] - prices[j - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ─── EMA Berechnung ───────────────────────────────────────────────────────────
function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  var k = 2 / (period + 1);
  var ema = prices.slice(0, period).reduce(function(a, b) { return a + b; }, 0) / period;
  for (var i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── Signal generieren ────────────────────────────────────────────────────────
function generateSignal(rsi, ema12, ema26, currentPrice) {
  var signal = "NEUTRAL", strength = 50;
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
  return { signal: signal, strength: Math.min(100, Math.round(strength)) };
}

// ─── Background Scan: Ein Symbol scannen ─────────────────────────────────────
async function scanSymbolBackground(symbol, interval) {
  interval = interval || "15m";
  try {
    var url = BINANCE_API + "/klines?symbol=" + symbol + "&interval=" + interval + "&limit=60";
    var res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    var data = await res.json();
    var closes = data.map(function(k) { return parseFloat(k[4]); });
    if (closes.length < 30) return null;
    var currentPrice = closes[closes.length - 1];
    var rsi = calculateRSI(closes);
    var ema12 = calculateEMA(closes, 12);
    var ema26 = calculateEMA(closes, 26);
    var sig = generateSignal(rsi, ema12, ema26, currentPrice);
    return {
      symbol: symbol, interval: interval,
      signal: sig.signal, strength: sig.strength,
      currentPrice: currentPrice,
      rsi: Math.round(rsi * 10) / 10,
      ema12: Math.round(ema12 * 100) / 100,
      ema26: Math.round(ema26 * 100) / 100,
      timestamp: Date.now()
    };
  } catch (e) {
    return null;
  }
}

// ─── Background Scanning Loop ─────────────────────────────────────────────────
async function runBackgroundScan() {
  var interval = "15m";
  var strongSignals = [];

  for (var i = 0; i < SYMBOLS.length; i++) {
    var result = await scanSymbolBackground(SYMBOLS[i], interval);
    if (!result) continue;
    backgroundSignalCache.set(SYMBOLS[i] + "-" + interval, result);
    if (result.signal !== "NEUTRAL" && result.strength >= 75) {
      strongSignals.push(result);
    }
  }

  lastBackgroundScan = Date.now();

  var allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });

  if (allClients.length > 0) {
    // App ist offen — sende Daten direkt ans Frontend
    allClients.forEach(function(client) {
      client.postMessage({
        type: "BACKGROUND_SCAN_RESULT",
        signals: Array.from(backgroundSignalCache.values()),
        strongSignals: strongSignals,
        timestamp: lastBackgroundScan
      });
    });
  } else {
    // App ist NICHT offen — zeige Push-Benachrichtigung
    for (var j = 0; j < strongSignals.length; j++) {
      var sig = strongSignals[j];
      var emoji = sig.signal === "BUY" ? "🟢" : "🔴";
      var displaySymbol = sig.symbol.replace("USDT", "/USDT");
      await self.registration.showNotification("⚡ Starkes Signal: " + displaySymbol, {
        body: emoji + " " + sig.signal + " auf dem " + sig.interval + " Chart mit " + sig.strength + "% Stärke.",
        icon: "/app-icon-192x192.png",
        badge: "/app-icon-192x192.png",
        vibrate: [200, 100, 200],
        tag: "signal-" + sig.symbol,
        requireInteraction: false,
        data: { symbol: sig.symbol, signal: sig.signal, url: "/" }
      });
    }
  }
}

// ─── Background Scanning starten ─────────────────────────────────────────────
function startBackgroundScanning() {
  if (backgroundScanTimer) clearInterval(backgroundScanTimer);
  setTimeout(runBackgroundScan, 5000);
  backgroundScanTimer = setInterval(runBackgroundScan, SCAN_INTERVAL_MS);
  console.log("[SW] Background Scanning gestartet (alle " + (SCAN_INTERVAL_MS / 1000) + "s)");
}

// ─── Push-Event (von Server) ──────────────────────────────────────────────────
self.addEventListener("push", function(event) {
  var data = {};
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data = { title: "Crypto Signal", body: event.data.text() }; }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "🚨 Crypto Signal", {
      body: data.body || "Neues Trading-Signal erkannt!",
      icon: "/app-icon-192x192.png",
      badge: "/app-icon-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: data
    })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if ("focus" in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});

// ─── Nachrichten vom Haupt-Thread ─────────────────────────────────────────────
self.addEventListener("message", function(event) {
  var type = event.data && event.data.type;

  if (type === "SHOW_NOTIFICATION") {
    var d = event.data;
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: d.icon || "/app-icon-192x192.png",
      badge: "/app-icon-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
  }

  if (type === "GET_CACHED_SIGNALS") {
    if (event.source) {
      event.source.postMessage({
        type: "CACHED_SIGNALS",
        signals: Array.from(backgroundSignalCache.values()),
        lastScan: lastBackgroundScan
      });
    }
  }

  if (type === "FORCE_SCAN") {
    runBackgroundScan();
  }
});

// ─── Fetch Handler (Offline-Fallback für Binance API) ────────────────────────
self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("binance.us")) {
    event.respondWith(
      fetch(event.request)
        .then(function(res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return res;
        })
        .catch(function() { return caches.match(event.request); })
    );
  }
});
