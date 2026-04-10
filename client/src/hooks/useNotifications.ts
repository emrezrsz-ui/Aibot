/**
 * useNotifications Hook
 * Verwaltet Web-Push Benachrichtigungen, Service Worker und Sound-Alerts
 * Unterstützt iOS PWA (Safari auf Home-Bildschirm)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

interface SignalNotification {
  symbol: string;
  signal: "BUY" | "SELL";
  timeframe: string;
  strength: number;
  price: number;
}

// Generiere einen kurzen Chime-Sound via Web Audio API
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Chime: zwei aufeinanderfolgende Töne
    const frequencies = [880, 1100]; // A5 und C#6
    let time = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, time + i * 0.15);

      gainNode.gain.setValueAtTime(0, time + i * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.4, time + i * 0.15 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + i * 0.15 + 0.4);

      oscillator.start(time + i * 0.15);
      oscillator.stop(time + i * 0.15 + 0.4);
    });

    // Kontext nach 2 Sekunden schließen
    setTimeout(() => ctx.close(), 2000);
  } catch (err) {
    console.warn("[Notifications] Sound konnte nicht abgespielt werden:", err);
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

      // Erstelle eindeutigen Key um Duplikate zu verhindern
      const notifKey = `${symbol}-${signal}-${timeframe}-${Math.floor(Date.now() / 60000)}`;
      if (notifiedSignals.current.has(notifKey)) return;
      notifiedSignals.current.add(notifKey);

      // Bereinige alten Cache (max 50 Einträge)
      if (notifiedSignals.current.size > 50) {
        const entries = Array.from(notifiedSignals.current);
        notifiedSignals.current = new Set(entries.slice(-25));
      }

      const emoji = signal === "BUY" ? "🟢" : "🔴";
      const title = `🚨 Starkes Signal: ${symbol.replace("USDT", "/USDT")}`;
      const body = `${emoji} ${signal} auf dem ${timeframe} Chart mit ${strength}% Stärke. Preis: $${price.toFixed(2)}`;

      // Sound abspielen
      playChimeSound();

      // Benachrichtigung senden
      if (permission === "granted") {
        if (swRegistration) {
          // Via Service Worker (funktioniert auch wenn App im Hintergrund)
          swRegistration.active?.postMessage({
            type: "SHOW_NOTIFICATION",
            title,
            body,
            icon: "/icon-192.png",
          });
        } else {
          // Direkte Browser-Benachrichtigung (Fallback)
          try {
            new Notification(title, {
              body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
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
