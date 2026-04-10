/**
 * Market Data Card Component
 * Zeigt Live-Marktdaten für einzelne Kryptowährungen an
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useEffect, useState } from "react";
import { fetchTicker, formatPrice, formatPercent, getPriceChangeColor } from "@/lib/binance";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface MarketDataCardProps {
  symbol: string;
  refreshInterval?: number;
}

interface MarketData {
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export function MarketDataCard({
  symbol,
  refreshInterval = 5000,
}: MarketDataCardProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const ticker = await fetchTicker(symbol);
      const newPrice = parseFloat(ticker.lastPrice);

      setData({
        lastPrice: newPrice,
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
      });

      setPrevPrice(newPrice);
      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fehler beim Abrufen der Daten";
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, refreshInterval);
    return () => clearInterval(timer);
  }, [symbol, refreshInterval]);

  if (loading && !data) {
    return (
      <div className="p-6 bg-gray-900/50 border border-gray-700/30 rounded-lg flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm font-mono">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const changeColor = getPriceChangeColor(data.priceChangePercent);
  const isPositive = data.priceChangePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-green-400" : "text-red-500";

  return (
    <div
      className={`
        p-6 rounded-lg border
        bg-gradient-to-br from-gray-900/50 to-gray-900/20
        border-gray-700/30 hover:border-cyan-400/30
        transition-all duration-300
        shadow-lg shadow-gray-900/50
        group
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-lg text-cyan-400">
          {symbol}
        </h3>
        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
      </div>

      {/* Price */}
      <div className="mb-4">
        <p className={`text-3xl font-bold font-mono ${changeColor}`}>
          ${formatPrice(data.lastPrice, 4)}
        </p>
        <p className={`text-lg font-mono mt-1 ${changeColor}`}>
          {formatPercent(data.priceChangePercent)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-gray-800/30 rounded border border-gray-700/20">
          <p className="text-gray-500 text-xs font-mono mb-1">24H HIGH</p>
          <p className="text-green-400 font-mono font-semibold">
            ${formatPrice(data.highPrice, 4)}
          </p>
        </div>
        <div className="p-3 bg-gray-800/30 rounded border border-gray-700/20">
          <p className="text-gray-500 text-xs font-mono mb-1">24H LOW</p>
          <p className="text-red-500 font-mono font-semibold">
            ${formatPrice(data.lowPrice, 4)}
          </p>
        </div>
        <div className="col-span-2 p-3 bg-gray-800/30 rounded border border-gray-700/20">
          <p className="text-gray-500 text-xs font-mono mb-1">24H VOLUME</p>
          <p className="text-magenta-400 font-mono font-semibold">
            {(data.volume / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-10
          transition-opacity duration-300
          bg-cyan-400 rounded-lg
          pointer-events-none
        `}
      />
    </div>
  );
}
