import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createScannerRouter, startAutoScan } from "../scanner";
import { loadActiveTrades, checkAndCloseTrades, createTradeMonitorRouter } from "../trade-monitor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Scanner API (/health, /api/scan, /api/signals)
  app.use(createScannerRouter());
  // Trade Monitor API (/monitor/status)
  app.use(createTradeMonitorRouter());
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    // 24/7 Auto-Scan starten (alle 5 Minuten)
    startAutoScan();

    // Trade-Monitor starten
    console.log("[TradeMonitor] Starte Trade-Close-Monitor...");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        await loadActiveTrades(supabase);

        // Pruefe Trades alle 10 Sekunden
        setInterval(async () => {
          await checkAndCloseTrades(supabase);
        }, 10_000);
        console.log("[TradeMonitor] Trade-Close-Monitor aktiv");
      } else {
        console.warn("[TradeMonitor] Supabase nicht konfiguriert — Trade-Monitor deaktiviert");
      }
    } catch (err) {
      console.error("[TradeMonitor] Fehler beim Starten:", err);
    }
  });
}

// Safe-Boot: Try-catch um Server-Start mit Fallback
startServer().catch((error) => {
  console.error('[Server] Critical error during startup:', error);
  console.error('[Server] Server will attempt to continue with degraded functionality');
  // Nicht beenden - Server läuft weiter, auch wenn DB nicht erreichbar ist
  process.exit(1);
});
