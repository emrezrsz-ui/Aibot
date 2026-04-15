/**
 * order-executor.ts — Automatische Order-Ausführung mit CCXT
 */

import * as ccxt from "ccxt";
import { encryptApiKey, decryptApiKey } from "./encryption";
import { checkSlippage, validateTradeSize, calculateTPSL } from "./risk-manager";

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  error?: string;
  timestamp: number;
}

export interface OrderValidation {
  isValid: boolean;
  reason?: string;
  slippageOk: boolean;
  sizeOk: boolean;
  balanceOk: boolean;
}

/**
 * Validiere eine Order vor der Ausführung
 */
export async function validateOrderExecution(
  exchange: any,
  symbol: string,
  side: "BUY" | "SELL",
  amount: number,
  currentPrice: number,
  signalPrice: number,
  slippageTolerance: number,
  maxTradeSize: number
): Promise<OrderValidation> {
  try {
    // 1. Slippage-Check
    const slippageCheck = checkSlippage(signalPrice, currentPrice, slippageTolerance);
    if (!slippageCheck.isValid) {
      return {
        isValid: false,
        reason: `Slippage zu hoch: ${slippageCheck.slippagePercent.toFixed(2)}% > ${slippageTolerance}%`,
        slippageOk: false,
        sizeOk: true,
        balanceOk: true,
      };
    }

    // 2. Trade-Size-Check
    const sizeCheck = validateTradeSize(amount * currentPrice, maxTradeSize);
    if (!sizeCheck.isValid) {
      return {
        isValid: false,
        reason: `Trade-Size zu groß: ${(amount * currentPrice).toFixed(2)} USDT > ${maxTradeSize} USDT`,
        slippageOk: true,
        sizeOk: false,
        balanceOk: true,
      };
    }

    // 3. Balance-Check
    const balance = await exchange.fetchBalance();
    const baseAsset = symbol.split("/")[1]; // z.B. "USDT" aus "BTC/USDT"
    const availableBalance = balance[baseAsset]?.free || 0;

    if (side === "BUY" && availableBalance < amount * currentPrice) {
      return {
        isValid: false,
        reason: `Unzureichende Balance: ${availableBalance.toFixed(2)} ${baseAsset} < ${(amount * currentPrice).toFixed(2)} ${baseAsset}`,
        slippageOk: true,
        sizeOk: true,
        balanceOk: false,
      };
    }

    return {
      isValid: true,
      slippageOk: true,
      sizeOk: true,
      balanceOk: true,
    };
  } catch (error) {
    return {
      isValid: false,
      reason: `Validierungsfehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      slippageOk: false,
      sizeOk: false,
      balanceOk: false,
    };
  }
}

/**
 * Platziere eine Market-Order auf Binance
 */
export async function placeMarketOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "BUY" | "SELL",
  amount: number,
  currentPrice: number,
  signalPrice: number,
  slippageTolerance: number,
  maxTradeSize: number,
  demoMode: boolean = true
): Promise<OrderExecutionResult> {
  const timestamp = Date.now();

  try {
    // Demo-Modus: Nur simulieren
    if (demoMode) {
      return {
        success: true,
        orderId: `DEMO-${Date.now()}`,
        symbol,
        side,
        amount,
        price: currentPrice,
        timestamp,
      };
    }

    // Real-Modus: CCXT Order
    const exchange = new ccxt.binance({
      apiKey: apiKey,
      secret: apiSecret,
      enableRateLimit: true,
    });

    // Validierung
    const validation = await validateOrderExecution(
      exchange,
      symbol,
      side,
      amount,
      currentPrice,
      signalPrice,
      slippageTolerance,
      maxTradeSize
    );

    if (!validation.isValid) {
      return {
        success: false,
        symbol,
        side,
        amount,
        price: currentPrice,
        error: validation.reason,
        timestamp,
      };
    }

    // Order platzieren
    const order = await exchange.createMarketOrder(symbol, side, amount);

    return {
      success: true,
      orderId: order.id,
      symbol,
      side,
      amount: order.amount,
      price: order.average || currentPrice,
      timestamp,
    };
  } catch (error) {
    return {
      success: false,
      symbol,
      side,
      amount,
      price: currentPrice,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
      timestamp,
    };
  }
}

/**
 * Berechne TP/SL basierend auf Signal-Stärke
 */
export function calculateDynamicTPSL(
  entryPrice: number,
  signalType: "BUY" | "SELL",
  signalStrength: number,
  atr: number
): {
  takeProfit: number;
  stopLoss: number;
  riskReward: number;
} {
  // ATR-basierte TP/SL
  const slMultiplier = 1.5; // SL = Entry +/- (1.5 * ATR)
  const tpMultiplier = 3; // TP = Entry +/- (3 * ATR)

  if (signalType === "BUY") {
    const stopLoss = entryPrice - slMultiplier * atr;
    const takeProfit = entryPrice + tpMultiplier * atr;
    return {
      takeProfit,
      stopLoss,
      riskReward: (takeProfit - entryPrice) / (entryPrice - stopLoss),
    };
  } else {
    const stopLoss = entryPrice + slMultiplier * atr;
    const takeProfit = entryPrice - tpMultiplier * atr;
    return {
      takeProfit,
      stopLoss,
      riskReward: (entryPrice - takeProfit) / (stopLoss - entryPrice),
    };
  }
}
