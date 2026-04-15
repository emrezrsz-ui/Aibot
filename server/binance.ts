/**
 * binance.ts — Binance API Integration mit CCXT
 * =============================================
 * Verwaltet Binance-Verbindungen und Trades über die CCXT-Library.
 */

import ccxt from "ccxt";
import { decryptApiKey } from "./encryption";

export interface BinanceConnection {
  apiKey: string;
  apiSecret: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export interface BalanceInfo {
  symbol: string;
  free: number;
  used: number;
  total: number;
}

/**
 * Erstelle eine CCXT Binance-Instanz mit API-Keys
 */
export function createBinanceClient(
  encryptedApiKey: string,
  encryptedApiSecret: string
): any {
  try {
    const apiKey = decryptApiKey(encryptedApiKey);
    const apiSecret = decryptApiKey(encryptedApiSecret);

    const binance = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: "spot",
      },
    });

    return binance;
  } catch (error) {
    console.error("[Binance] Fehler beim Erstellen des Clients:", error);
    throw new Error("Failed to create Binance client");
  }
}

/**
 * Teste die Binance-Verbindung
 */
export async function testBinanceConnection(
  encryptedApiKey: string,
  encryptedApiSecret: string
): Promise<{ success: boolean; message: string }> {
  try {
    const binance = createBinanceClient(encryptedApiKey, encryptedApiSecret);
    const balance = await binance.fetch_balance();

    if (balance && balance.total) {
      const totalUSDT = balance.USDT?.total || 0;
      return {
        success: true,
        message: `✅ Verbindung erfolgreich. Balance: ${totalUSDT.toFixed(2)} USDT`,
      };
    }

    return {
      success: false,
      message: "❌ Keine Balance-Daten erhalten",
    };
  } catch (error: any) {
    console.error("[Binance] Verbindungsfehler:", error.message);
    return {
      success: false,
      message: `❌ Verbindungsfehler: ${error.message}`,
    };
  }
}

/**
 * Hole den aktuellen Kontostand
 */
export async function getBalance(
  encryptedApiKey: string,
  encryptedApiSecret: string,
  symbol: string = "USDT"
): Promise<BalanceInfo | null> {
  try {
    const binance = createBinanceClient(encryptedApiKey, encryptedApiSecret);
    const balance = await binance.fetch_balance();

    const symbolBalance = balance[symbol];
    if (!symbolBalance) return null;

    return {
      symbol,
      free: symbolBalance.free || 0,
      used: symbolBalance.used || 0,
      total: symbolBalance.total || 0,
    };
  } catch (error) {
    console.error(`[Binance] Fehler beim Abrufen des ${symbol}-Bestands:`, error);
    return null;
  }
}

/**
 * Platziere einen Market Order auf Binance
 */
export async function placeMarketOrder(
  encryptedApiKey: string,
  encryptedApiSecret: string,
  symbol: string,
  side: "buy" | "sell",
  amount: number
): Promise<OrderResult> {
  try {
    const binance = createBinanceClient(encryptedApiKey, encryptedApiSecret);

    const order = await binance.create_market_order(symbol, side, amount);

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error: any) {
    console.error(`[Binance] Fehler beim Platzieren von ${side} Order:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Platziere einen Limit Order auf Binance
 */
export async function placeLimitOrder(
  encryptedApiKey: string,
  encryptedApiSecret: string,
  symbol: string,
  side: "buy" | "sell",
  amount: number,
  price: number
): Promise<OrderResult> {
  try {
    const binance = createBinanceClient(encryptedApiKey, encryptedApiSecret);

    const order = await binance.create_limit_order(symbol, side, amount, price);

    return {
      success: true,
      orderId: order.id,
    };
  } catch (error: any) {
    console.error(`[Binance] Fehler beim Platzieren von Limit Order:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Hole aktuelle Preis-Informationen
 */
export async function getCurrentPrice(
  encryptedApiKey: string,
  encryptedApiSecret: string,
  symbol: string
): Promise<number | null> {
  try {
    const binance = createBinanceClient(encryptedApiKey, encryptedApiSecret);
    const ticker = await binance.fetch_ticker(symbol);
    return ticker.last || null;
  } catch (error) {
    console.error(`[Binance] Fehler beim Abrufen des ${symbol}-Preises:`, error);
    return null;
  }
}
