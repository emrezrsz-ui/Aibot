/**
 * useNotifications Hook
 * Verwaltet Web-Push Benachrichtigungen, Service Worker und Sound-Alerts
 * Unterstützt iOS PWA (Safari auf Home-Bildschirm ab iOS 16.4)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

export interface SignalNotification {
  symbol: string;
  signal: "BUY" | "SELL";
  timeframe: string;
  strength: number;
  price: number;
}

/**
 * Dezenter Soft-Chime Sound via Web Audio API
 * Klingt wie ein sanftes "Ding" — nicht aufdringlich, angenehm im Hintergrund
 * Töne: E5 (659 Hz) → G#5 (830 Hz), Lautstärke: 0.18 (sehr dezent)
 */
function playSoftChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Zwei sanfte Töne mit weichem Timbre (Tiefpassfilter)
    const notes = [
      { freq: 659, delay: 0.0,  vol: 0.18 }, // E5 — erster Ton
      { freq: 830, delay: 0.13, vol: 0.13 }, // G#5 — zweiter Ton (leiser)
    ];

    notes.forEach(({ freq, delay, vol }) => {
      const osc    = ctx.createOscillator();
      const gain   = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Tiefpassfilter: entfernt harte Obertöne → weiches Glocken-Timbre
      filter.type = "lowpass";
      filter.frequency.value = 2000;
      filter.Q.value = 0.7;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      // Sanfter Attack (20ms) + langer Decay (700ms) → "Ding"-Charakter
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);         // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.70); // Decay

      osc.start(t);
      osc.stop(t + 0.70);
    });

    setTimeout(() => { try { ctx.close(); } catch (_) { /* ignore */ } }, 2000);
  } catch (err) {
    console.debug("[Sound] Soft-Chime nicht verfügbar:", err);
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const notifiedSignals = useRef<Set<string>>(new Set());

  // Prüfe Browser-Unterstützung und initialisiere
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  // Registriere Service Worker
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registriert:", registration.scope);
        setSwRegistration(registration);
      })
      .catch((err) => {
        console.warn("[SW] Registrierung fehlgeschlagen:", err);
      });
  }, [isSupported]);

  // Fordere Benachrichtigungs-Erlaubnis an
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result === "granted";
    } catch (err) {
      console.warn("[Notifications] Permission-Anfrage fehlgeschlagen:", err);
      return false;
    }
  }, [isSupported]);

  // Sende eine Benachrichtigung
  const sendNotification = useCallback(
    (notification: SignalNotification) => {
      const { symbol, signal, timeframe, strength, price } = notification;

      // Eindeutiger Key — max 1 Alert pro Signal alle 2 Minuten
      const notifKey = `${symbol}-${signal}-${timeframe}-${Math.floor(Date.now() / 120000)}`;
      if (notifiedSignals.current.has(notifKey)) return;
      notifiedSignals.current.add(notifKey);

      // Bereinige alten Cache (max 50 Einträge)
      if (notifiedSignals.current.size > 50) {
        const entries = Array.from(notifiedSignals.current);
        notifiedSignals.current = new Set(entries.slice(-25));
      }

      const emoji = signal === "BUY" ? "🟢" : "🔴";
      const displaySymbol = symbol.replace("USDT", "/USDT");
      const title = `⚡ Starkes Signal: ${displaySymbol}`;
      const body = `${emoji} ${signal} auf dem ${timeframe} Chart mit ${strength}% Stärke. Preis: $${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Dezenter Soft-Chime abspielen
      playSoftChime();

      // Benachrichtigung senden
      if (permission === "granted") {
        if (swRegistration) {
          // Via Service Worker (funktioniert auch wenn App im Hintergrund)
          swRegistration.active?.postMessage({
            type: "SHOW_NOTIFICATION",
            title,
            body,
            icon: "/app-icon-192x192.png",
          });
        } else {
          // Direkte Browser-Benachrichtigung (Fallback)
          try {
            new Notification(title, {
              body,
              icon: "/app-icon-192x192.png",
              badge: "/app-icon-192x192.png",
            });
          } catch (err) {
            console.warn("[Notifications] Direkte Benachrichtigung fehlgeschlagen:", err);
          }
        }
      }
    },
    [permission, swRegistration]
  );

  // Prüfe ob ein Signal stark genug ist (>75%)
  const checkAndNotify = useCallback(
    (notification: SignalNotification) => {
      if (notification.strength >= 75) {
        sendNotification(notification);
      }
    },
    [sendNotification]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    checkAndNotify,
  };
}
