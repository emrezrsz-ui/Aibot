/**
 * Crypto Signal Dashboard - Service Worker
 * Verarbeitet Push-Benachrichtigungen und ermöglicht PWA-Funktionalität
 */

const CACHE_NAME = "crypto-signal-v1";

// Installation
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installiert");
  self.skipWaiting();
});

// Aktivierung
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker aktiviert");
  event.waitUntil(clients.claim());
});

// Push-Benachrichtigung empfangen (von Server)
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "Crypto Signal", body: event.data.text() };
    }
  }

  const options = {
    body: data.body || "Neues Trading-Signal erkannt!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: "open", title: "Dashboard öffnen" },
      { action: "dismiss", title: "Schließen" },
    ],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "🚨 Crypto Signal", options)
  );
});

// Benachrichtigung anklicken
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Öffne existierendes Fenster oder neues
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Nachricht vom Haupt-Thread empfangen (für lokale Benachrichtigungen)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, icon } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
    });
  }
});
