/**
 * risk-manager.ts — Risk Management & Slippage-Kontrolle
 * ======================================================
 * Validiert Trades gegen Slippage-Toleranz und maximale Trade-Größe.
 */

export interface SlippageCheckResult {
  isValid: boolean;
  currentPrice: number;
  maxPrice: number;
  slippagePercent: number;
  reason?: string;
}

export interface TradeSizeCheckResult {
  isValid: boolean;
  tradeSize: number;
  maxSize: number;
  reason?: string;
}

/**
 * Prüfe, ob der aktuelle Preis innerhalb der Slippage-Toleranz liegt
 * Formel: Aktueller_Preis <= Signal_Preis * (1 + Slippage%)
 */
export function checkSlippage(
  signalPrice: number,
  currentPrice: number,
  slippageTolerancePercent: number
): SlippageCheckResult {
  const maxPrice = signalPrice * (1 + slippageTolerancePercent / 100);
  const actualSlippage = ((currentPrice - signalPrice) / signalPrice) * 100;

  const isValid = currentPrice <= maxPrice;

  return {
    isValid,
    currentPrice,
    maxPrice,
    slippagePercent: actualSlippage,
    reason: isValid
      ? `✅ Slippage OK: ${actualSlippage.toFixed(2)}% <= ${slippageTolerancePercent}%`
      : `❌ Slippage zu hoch: ${actualSlippage.toFixed(2)}% > ${slippageTolerancePercent}%`,
  };
}

/**
 * Prüfe, ob die Trade-Größe innerhalb der Limits liegt
 */
export function validateTradeSize(
  tradeSize: number,
  maxTradeSize: number
): TradeSizeCheckResult {
  const isValid = tradeSize <= maxTradeSize;

  return {
    isValid,
    tradeSize,
    maxSize: maxTradeSize,
    reason: isValid
      ? `✅ Trade-Größe OK: ${tradeSize.toFixed(2)} USDT <= ${maxTradeSize.toFixed(2)} USDT`
      : `❌ Trade-Größe zu groß: ${tradeSize.toFixed(2)} USDT > ${maxTradeSize.toFixed(2)} USDT`,
  };
}

/**
 * Berechne die optimale Order-Größe basierend auf Kontostand und Risiko
 */
export function calculateOrderSize(
  accountBalance: number,
  riskPercentage: number = 2,
  currentPrice: number = 1
): number {
  // Risk = Account Balance * Risk Percentage
  const riskAmount = (accountBalance * riskPercentage) / 100;

  // Order Size = Risk Amount / Current Price
  const orderSize = riskAmount / currentPrice;

  return Math.floor(orderSize * 100000) / 100000; // 5 Dezimalstellen
}

/**
 * Validiere einen kompletten Trade vor Ausführung
 */
export function validateTrade(
  signalPrice: number,
  currentPrice: number,
  tradeSize: number,
  slippageTolerancePercent: number,
  maxTradeSize: number
): {
  isValid: boolean;
  slippageCheck: SlippageCheckResult;
  sizeCheck: TradeSizeCheckResult;
  errors: string[];
} {
  const slippageCheck = checkSlippage(signalPrice, currentPrice, slippageTolerancePercent);
  const sizeCheck = validateTradeSize(tradeSize, maxTradeSize);

  const errors: string[] = [];
  if (!slippageCheck.isValid) errors.push(slippageCheck.reason || "Slippage check failed");
  if (!sizeCheck.isValid) errors.push(sizeCheck.reason || "Size check failed");

  return {
    isValid: slippageCheck.isValid && sizeCheck.isValid,
    slippageCheck,
    sizeCheck,
    errors,
  };
}

/**
 * Berechne Take-Profit und Stop-Loss basierend auf Signal-Stärke
 */
export function calculateTPSL(
  entryPrice: number,
  signalType: "BUY" | "SELL",
  signalStrength: number,
  riskRewardRatio: number = 2
): {
  takeProfit: number;
  stopLoss: number;
  riskAmount: number;
  rewardAmount: number;
} {
  // Basis-Abstand: 1% für 50% Signal, 3% für 100% Signal
  const baseDistance = (signalStrength / 50 - 1) * 0.02 + 0.01;

  if (signalType === "BUY") {
    const stopLoss = entryPrice * (1 - baseDistance);
    const riskAmount = entryPrice - stopLoss;
    const rewardAmount = riskAmount * riskRewardRatio;
    const takeProfit = entryPrice + rewardAmount;

    return {
      takeProfit: Math.round(takeProfit * 100000) / 100000,
      stopLoss: Math.round(stopLoss * 100000) / 100000,
      riskAmount: Math.round(riskAmount * 100000) / 100000,
      rewardAmount: Math.round(rewardAmount * 100000) / 100000,
    };
  } else {
    // SELL
    const stopLoss = entryPrice * (1 + baseDistance);
    const riskAmount = stopLoss - entryPrice;
    const rewardAmount = riskAmount * riskRewardRatio;
    const takeProfit = entryPrice - rewardAmount;

    return {
      takeProfit: Math.round(takeProfit * 100000) / 100000,
      stopLoss: Math.round(stopLoss * 100000) / 100000,
      riskAmount: Math.round(riskAmount * 100000) / 100000,
      rewardAmount: Math.round(rewardAmount * 100000) / 100000,
    };
  }
}
