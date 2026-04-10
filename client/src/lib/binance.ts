/**
 * Binance API Integration
 * Fetcht Live-Preise und Kerzendaten
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

const BINANCE_API_BASE = "https://api.binance.com/api/v3";

export interface BinanceTickerData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

export interface BinanceKlineData {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

/**
 * Fetcht aktuelle Ticker-Daten für ein Symbol
 */
export async function fetchTicker(symbol: string): Promise<BinanceTickerData> {
  try {
    const response = await fetch(
      `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetcht Kerzendaten (OHLCV) für ein Symbol
 * interval: 1m, 5m, 15m, 1h, 4h, etc.
 * limit: Anzahl der Kerzen (max 1000)
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const response = await fetch(
      `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetcht aktuelle Preise für mehrere Symbole
 */
export async function fetchMultipleTickers(
  symbols: string[]
): Promise<BinanceTickerData[]> {
  try {
    const symbolsParam = symbols.join(",");
    const response = await fetch(
      `${BINANCE_API_BASE}/ticker/24hr?symbols=["${symbols.join('","')}"]`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching multiple tickers:", error);
    throw error;
  }
}

/**
 * Konvertiert Binance-Preis-String zu Zahl
 */
export function parsePrice(priceStr: string): number {
  return parseFloat(priceStr);
}

/**
 * Formatiert Preis für die Anzeige
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formatiert Prozentsatz für die Anzeige
 */
export function formatPercent(percent: string | number): string {
  const num = typeof percent === "string" ? parseFloat(percent) : percent;
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Bestimmt die Farbe basierend auf Wertänderung
 */
export function getPriceChangeColor(
  change: string | number
): "text-green-400" | "text-red-500" | "text-gray-400" {
  const num = typeof change === "string" ? parseFloat(change) : change;
  if (num > 0) return "text-green-400";
  if (num < 0) return "text-red-500";
  return "text-gray-400";
}
