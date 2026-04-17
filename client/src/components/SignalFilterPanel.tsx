/**
 * SignalFilterPanel — Filter-Komponente für Signale
 * ==================================================
 * Ermöglicht Filterung nach Kryptowährung, Zeitrahmen, Signal-Typ und Status.
 */

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SignalFilters {
  symbols: string[];
  intervals: string[];
  signalTypes: string[];
  statuses: string[];
}

interface SignalFilterPanelProps {
  onFiltersChange: (filters: SignalFilters) => void;
  totalSignals: number;
  filteredCount: number;
}

const AVAILABLE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const AVAILABLE_INTERVALS = ["1m", "5m", "15m", "1h", "4h"];
const AVAILABLE_SIGNAL_TYPES = ["BUY", "SELL", "NEUTRAL"];
const AVAILABLE_STATUSES = ["PENDING", "EXECUTED", "IGNORED"];

export function SignalFilterPanel({
  onFiltersChange,
  totalSignals,
  filteredCount,
}: SignalFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SignalFilters>({
    symbols: [],
    intervals: [],
    signalTypes: [],
    statuses: [],
  });

  const handleSymbolToggle = (symbol: string) => {
    const newSymbols = filters.symbols.includes(symbol)
      ? filters.symbols.filter((s) => s !== symbol)
      : [...filters.symbols, symbol];
    const newFilters = { ...filters, symbols: newSymbols };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleIntervalToggle = (interval: string) => {
    const newIntervals = filters.intervals.includes(interval)
      ? filters.intervals.filter((i) => i !== interval)
      : [...filters.intervals, interval];
    const newFilters = { ...filters, intervals: newIntervals };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSignalTypeToggle = (type: string) => {
    const newTypes = filters.signalTypes.includes(type)
      ? filters.signalTypes.filter((t) => t !== type)
      : [...filters.signalTypes, type];
    const newFilters = { ...filters, signalTypes: newTypes };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    const newFilters = { ...filters, statuses: newStatuses };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const resetFilters = () => {
    const emptyFilters: SignalFilters = {
      symbols: [],
      intervals: [],
      signalTypes: [],
      statuses: [],
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters =
    filters.symbols.length > 0 ||
    filters.intervals.length > 0 ||
    filters.signalTypes.length > 0 ||
    filters.statuses.length > 0;

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 gap-2"
        >
          <Filter className="w-4 h-4" />
          Filter {hasActiveFilters && `(${Object.values(filters).flat().length})`}
        </Button>
        <div className="text-sm text-gray-400">
          Zeige <span className="text-cyan-400 font-bold">{filteredCount}</span> von{" "}
          <span className="text-gray-300">{totalSignals}</span> Signalen
        </div>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="bg-gray-800/50 border-cyan-400/30 mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-cyan-400">Filter-Optionen</CardTitle>
              <Button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 gap-1"
              >
                <X className="w-3 h-3" />
                Zurücksetzen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Kryptowährungen */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3">Kryptowährungen</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AVAILABLE_SYMBOLS.map((symbol) => (
                  <label
                    key={symbol}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.symbols.includes(symbol)}
                      onChange={() => handleSymbolToggle(symbol)}
                      className="w-4 h-4 rounded border-cyan-400/50 bg-gray-700 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">{symbol.replace("USDT", "")}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Zeitrahmen */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3">Zeitrahmen</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {AVAILABLE_INTERVALS.map((interval) => (
                  <label
                    key={interval}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.intervals.includes(interval)}
                      onChange={() => handleIntervalToggle(interval)}
                      className="w-4 h-4 rounded border-cyan-400/50 bg-gray-700 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">{interval}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Signal-Typ */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3">Signal-Typ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_SIGNAL_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.signalTypes.includes(type)}
                      onChange={() => handleSignalTypeToggle(type)}
                      className="w-4 h-4 rounded border-cyan-400/50 bg-gray-700 cursor-pointer"
                    />
                    <span
                      className={`text-sm font-bold ${
                        type === "BUY"
                          ? "text-green-400"
                          : type === "SELL"
                            ? "text-red-400"
                            : "text-gray-400"
                      }`}
                    >
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-3">Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => handleStatusToggle(status)}
                      className="w-4 h-4 rounded border-cyan-400/50 bg-gray-700 cursor-pointer"
                    />
                    <span
                      className={`text-sm font-bold ${
                        status === "EXECUTED"
                          ? "text-green-400"
                          : status === "IGNORED"
                            ? "text-gray-400"
                            : "text-yellow-400"
                      }`}
                    >
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Aktive Filter:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.symbols.map((s) => (
                    <span
                      key={`sym-${s}`}
                      className="px-2 py-1 bg-cyan-900/40 border border-cyan-400/50 rounded text-xs text-cyan-400"
                    >
                      {s.replace("USDT", "")}
                    </span>
                  ))}
                  {filters.intervals.map((i) => (
                    <span
                      key={`int-${i}`}
                      className="px-2 py-1 bg-blue-900/40 border border-blue-400/50 rounded text-xs text-blue-400"
                    >
                      {i}
                    </span>
                  ))}
                  {filters.signalTypes.map((t) => (
                    <span
                      key={`type-${t}`}
                      className={`px-2 py-1 rounded text-xs border ${
                        t === "BUY"
                          ? "bg-green-900/40 border-green-400/50 text-green-400"
                          : t === "SELL"
                            ? "bg-red-900/40 border-red-400/50 text-red-400"
                            : "bg-gray-900/40 border-gray-400/50 text-gray-400"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                  {filters.statuses.map((st) => (
                    <span
                      key={`status-${st}`}
                      className={`px-2 py-1 rounded text-xs border ${
                        st === "EXECUTED"
                          ? "bg-green-900/40 border-green-400/50 text-green-400"
                          : st === "IGNORED"
                            ? "bg-gray-900/40 border-gray-400/50 text-gray-400"
                            : "bg-yellow-900/40 border-yellow-400/50 text-yellow-400"
                      }`}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
