/**
 * signal-handler.ts — Signal-Handler mit Order-Execution Integration
 */

import { placeMarketOrder, OrderExecutionResult } from "./order-executor";
import { executeAllFilters } from "./safety-filters";
import { logFilterCheck, logOrderStatus, logError, logInfo } from "./activity-logger";

export interface SignalHandlerConfig {
  botEnabled: boolean;
  demoMode: boolean;
  apiKey: string;
  apiSecret: string;
  slippageTolerance: number;
  maxTradeSize: number;
}

export interface SignalHandlerResult {
  success: boolean;
  orderId?: string;
  message: string;
  logs: string[];
}

/**
 * Handle ein Signal und führe Order aus (wenn alle Filter passen)
 */
export async function handleSignal(
  symbol: string,
  signal: "BUY" | "SELL",
  strength: number,
  currentPrice: number,
  volume24h: number,
  atr: number,
  config: SignalHandlerConfig
): Promise<SignalHandlerResult> {
  const logs: string[] = [];

  try {
    // 1. Bot-Status Check
    if (!config.botEnabled) {
      const msg = `Bot ist AUS - Signal wird ignoriert`;
      logInfo(msg, symbol);
      logs.push(`❌ ${msg}`);
      return { success: false, message: msg, logs };
    }
    logs.push(`✅ Bot ist AN`);

    // 2. Signal-Stärke Check (mindestens 60% für automatische Orders)
    if (strength < 60) {
      const msg = `Signal-Stärke zu schwach: ${strength}% < 60%`;
      logFilterCheck(symbol, "Signal-Stärke", false, msg);
      logs.push(`❌ ${msg}`);
      return { success: false, message: msg, logs };
    }
    logs.push(`✅ Signal-Stärke OK: ${strength}%`);

    // 3. Sicherheits-Filter (Liquidität, Zeit, Chop)
    const filterResult = executeAllFilters(volume24h, strength);
    if (!filterResult.allPassed) {
      const reasons = filterResult.filters
        .filter((f) => !f.passed)
        .map((f) => f.reason)
        .join(", ");
      logFilterCheck(symbol, "Sicherheits-Filter", false, reasons);
      logs.push(`❌ Filter blockiert: ${reasons}`);
      return { success: false, message: `Filter blockiert: ${reasons}`, logs };
    }

    filterResult.filters.forEach((f) => {
      logs.push(`✅ ${f.reason}`);
    });

    // 4. Order-Ausführung
    const orderResult = await placeMarketOrder(
      config.apiKey,
      config.apiSecret,
      symbol,
      signal,
      1, // Amount (vereinfacht - in Realität basierend auf Position-Sizing)
      currentPrice,
      currentPrice,
      config.slippageTolerance,
      config.maxTradeSize,
      config.demoMode
    );

    if (!orderResult.success) {
      const msg = `Order fehlgeschlagen: ${orderResult.error}`;
      logOrderStatus(symbol, "FAILED", { error: orderResult.error });
      logs.push(`❌ ${msg}`);
      return { success: false, message: msg, logs };
    }

    // 5. Erfolgreiche Order
    const successMsg = `${signal} Order ausgelöst: ${symbol} @ ${currentPrice} USDT`;
    logOrderStatus(symbol, "EXECUTED", {
      orderId: orderResult.orderId,
      side: signal,
      price: currentPrice,
      demoMode: config.demoMode,
    });
    logs.push(`✅ ${successMsg}`);

    return {
      success: true,
      orderId: orderResult.orderId,
      message: successMsg,
      logs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
    logError(symbol, errorMsg);
    logs.push(`❌ Fehler: ${errorMsg}`);
    return { success: false, message: errorMsg, logs };
  }
}

/**
 * Formatiere Signal-Handler Logs für Terminal-Anzeige
 */
export function formatSignalHandlerLogs(result: SignalHandlerResult): string {
  const status = result.success ? "✅ ORDER AUSGELÖST" : "❌ ORDER BLOCKIERT";
  const details = result.logs.join("\n");
  return `${status}\n${details}`;
}
