/**
 * TradePerformance — Dual Performance Dashboard
 * =============================================
 * Zeigt zwei separate Statistiken:
 * 1. Bot Performance: Basierend auf automatischen TP/SL-Closes
 * 2. Deine Performance: Basierend auf manuellen EXECUTED/IGNORED-Markierungen
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Target, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PerformanceStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
}

interface TradePerformanceProps {
  performanceData?: PerformanceStats | null;
  isLoading?: boolean;
}

export function TradePerformance({ performanceData, isLoading = false }: TradePerformanceProps) {
  const [botStats, setBotStats] = useState<PerformanceStats | null>(null);
  const [userStats, setUserStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(isLoading);

  useEffect(() => {
    if (performanceData) {
      // Hier würde die Logik sein um Bot- und User-Stats zu trennen
      // Für jetzt zeigen wir nur die Basis-Struktur
      setBotStats(performanceData);
    }
  }, [performanceData]);

  const renderStatCard = (label: string, value: string | number, subtext?: string, color: "green" | "red" | "blue" = "blue") => {
    const colorClass = {
      green: "text-green-400 border-green-400/30 bg-green-900/10",
      red: "text-red-400 border-red-400/30 bg-red-900/10",
      blue: "text-cyan-400 border-cyan-400/30 bg-cyan-900/10",
    }[color];

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <p className="text-xs font-mono text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold font-mono">{value}</p>
        {subtext && <p className="text-xs font-mono text-gray-500 mt-1">{subtext}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!botStats) {
    return (
      <div className="text-center py-8 text-gray-500 font-mono text-sm">
        Keine Performance-Daten verfügbar
      </div>
    );
  }

  const winColor = botStats.win_rate >= 50 ? "green" : botStats.win_rate >= 40 ? "blue" : "red";
  const profitColor = botStats.total_profit >= 0 ? "green" : "red";

  return (
    <div className="space-y-6">
      {/* Bot Performance */}
      <div className="p-4 bg-gray-900/50 border border-cyan-400/20 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-cyan-400 font-mono">BOT PERFORMANCE</h3>
            <span className="text-xs font-mono text-gray-500">(Automatische TP/SL Closes)</span>
          </div>
          <Button
            onClick={() => setLoading(true)}
            disabled={loading}
            className="h-6 px-2 text-xs bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-400/30"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {renderStatCard("Gesamt Trades", botStats.total_trades, `${botStats.wins}W ${botStats.losses}L`, "blue")}
          {renderStatCard("Win Rate", `${botStats.win_rate.toFixed(1)}%`, botStats.win_rate >= 50 ? "✓ Profitabel" : "⚠ Unter 50%", winColor)}
          {renderStatCard("Profit Factor", botStats.profit_factor.toFixed(2) + "x", botStats.profit_factor >= 1.5 ? "✓ Stark" : botStats.profit_factor >= 1 ? "○ OK" : "✗ Schwach")}
          {renderStatCard("Netto P&L", `$${(botStats.total_profit - botStats.total_loss).toFixed(4)}`, "", profitColor)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {renderStatCard("Ø Gewinn", `$${botStats.avg_win.toFixed(6)}`, "Pro Gewinntrade", "green")}
          {renderStatCard("Ø Verlust", `$${botStats.avg_loss.toFixed(6)}`, "Pro Verlusttrade", "red")}
          {renderStatCard("Gesamt Gewinn", `$${botStats.total_profit.toFixed(4)}`, "", "green")}
          {renderStatCard("Gesamt Verlust", `$${botStats.total_loss.toFixed(4)}`, "", "red")}
        </div>
      </div>

      {/* User Performance (Placeholder) */}
      <div className="p-4 bg-gray-900/50 border border-magenta-400/20 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-magenta-400" />
          <h3 className="text-lg font-bold text-magenta-400 font-mono">DEINE PERFORMANCE</h3>
          <span className="text-xs font-mono text-gray-500">(Manuelle EXECUTED/IGNORED Markierungen)</span>
        </div>

        <div className="text-center py-8 text-gray-500 font-mono text-sm border border-gray-700/30 rounded">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          Deine persönliche Performance wird angezeigt, sobald du Trades als EXECUTED/IGNORED markierst
        </div>
      </div>

      {/* Insights */}
      <div className="p-4 bg-gray-900/50 border border-yellow-400/20 rounded-lg">
        <h3 className="text-sm font-bold text-yellow-400 font-mono mb-3">💡 INSIGHTS</h3>
        <div className="space-y-2 text-xs font-mono text-gray-400">
          {botStats.win_rate >= 50 ? (
            <p className="text-green-400">✓ Win-Rate über 50% — Bot zeigt positive Erwartungswert</p>
          ) : (
            <p className="text-red-400">⚠ Win-Rate unter 50% — Überprüfe Signal-Parameter</p>
          )}
          {botStats.profit_factor >= 1.5 ? (
            <p className="text-green-400">✓ Profit Factor stark — Gewinne sind größer als Verluste</p>
          ) : botStats.profit_factor >= 1 ? (
            <p className="text-yellow-400">○ Profit Factor OK — Könnte optimiert werden</p>
          ) : (
            <p className="text-red-400">✗ Profit Factor schwach — Verluste überwiegen Gewinne</p>
          )}
          {botStats.total_trades < 30 ? (
            <p className="text-yellow-400">⚠ Noch {30 - botStats.total_trades} Trades bis zur statistischen Signifikanz</p>
          ) : (
            <p className="text-green-400">✓ Genug Daten für zuverlässige Analyse</p>
          )}
        </div>
      </div>
    </div>
  );
}
