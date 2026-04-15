/**
 * webhook.ts — MetaTrader Webhook URL Generator
 * ============================================
 * Generiert eindeutige Webhook-URLs für MetaTrader 4/5 Verbindungen.
 */

import { randomBytes } from "crypto";

export interface WebhookConfig {
  webhookUrl: string;
  webhookSecret: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Generiere eine eindeutige Webhook-URL für MetaTrader
 * Format: https://api.example.com/webhook/mt4/{userId}/{webhookToken}
 */
export function generateWebhookUrl(userId: number, baseUrl: string = process.env.WEBHOOK_BASE_URL || "https://api.example.com"): WebhookConfig {
  // Generiere einen zufälligen Token (32 Bytes = 64 Hex-Zeichen)
  const webhookToken = randomBytes(32).toString("hex");
  const webhookSecret = randomBytes(32).toString("hex");

  const webhookUrl = `${baseUrl}/webhook/mt4/${userId}/${webhookToken}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 Jahr

  return {
    webhookUrl,
    webhookSecret,
    expiresAt,
    createdAt: new Date(),
  };
}

/**
 * Validiere einen Webhook-Token
 */
export function validateWebhookToken(
  token: string,
  storedToken: string
): boolean {
  // Constant-time comparison um Timing-Attacken zu vermeiden
  if (token.length !== storedToken.length) return false;

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generiere einen MetaTrader-kompatiblen Webhook-Payload
 */
export function generateMetaTraderPayload(
  signal: "BUY" | "SELL",
  symbol: string,
  price: number,
  strength: number,
  takeProfit: number,
  stopLoss: number
) {
  return {
    action: signal,
    symbol,
    price: price.toFixed(8),
    strength: `${strength}%`,
    tp: takeProfit.toFixed(8),
    sl: stopLoss.toFixed(8),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Beispiel MetaTrader 4/5 EA-Code für Webhook-Integration
 */
export const METATRADER_EA_TEMPLATE = `
// MetaTrader 4/5 Expert Advisor - Webhook Integration
// ====================================================

#property strict

input string WebhookURL = "https://api.example.com/webhook/mt4/YOUR_USER_ID/YOUR_TOKEN";
input string WebhookSecret = "YOUR_SECRET";
input double RiskPercent = 2.0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
  Print("EA initialized. Webhook URL: ", WebhookURL);
  return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
  Print("EA deinitialized");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick() {
  // Hier könnten Sie auf Webhook-Signale reagieren
  // Beispiel: Wenn Signal empfangen, dann Order platzieren
  
  // Für Demo-Zwecke: Jeden Tag um 12:00 Uhr ein Test-Signal senden
  if(Hour() == 12 && Minute() == 0 && Seconds() == 0) {
    SendSignal("BUY", "EURUSD", Ask, 75, Ask + 0.0050, Ask - 0.0050);
  }
}

//+------------------------------------------------------------------+
//| Sende ein Signal zum Webhook                                     |
//+------------------------------------------------------------------+
void SendSignal(string action, string symbol, double price, int strength, double tp, double sl) {
  // Diese Funktion würde normalerweise einen HTTP-Request senden
  // In MetaTrader wird dies über WebRequest() oder externe DLLs gemacht
  
  Print("Signal gesendet: ", action, " ", symbol, " @ ", price, " (Stärke: ", strength, "%)");
}
`;
