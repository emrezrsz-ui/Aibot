/**
 * ScannerSignals — Manuelle Signal-Verwaltung mit Pagination
 * ===========================================================
 * Zeigt die letzten Scanner-Signale aus der DB mit Pagination.
 * Jedes Signal kann als "Ausgeführt" oder "Ignoriert" markiert werden.
 * OPTIMIERT: Filterung + Pagination auf Datenbank-Level
 */

import { useState } from "react";
import * as React from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/PaginationControls";

// ─── Typen ────────────────────────────────────────────────────────────────────

type SignalStatus = "PENDING" | "EXECUTED" | "IGNORED";

interface ScanSignal {
  id: number;
  symbol: string;
  interval: string;
  signal: string;
  strength: number;
  currentPrice: string;
  rsi: string;
  ema12: string;
  ema26: string;
  status: SignalStatus;
  note: string | null;
  scannedAt: Date;
  actionAt: Date | null;
  closeReason?: "TP" | "SL" | null;
  closePrice?: number | null;
  hasDivergence?: boolean;
  divergenceType?: "bullish" | "bearish" | null;
  divergenceStrength?: number;
  confluenceCount?: number;
  confluenceTimeframes?: string;
  confluenceBonus?: number;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatSymbol(symbol: string): string {
  return symbol.replace("USDT", "");
}

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n >= 1000) return `$${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

// ─── Status-Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, closeReason }: { status: SignalStatus; closeReason?: "TP" | "SL" | null }) {
  if (closeReason === "TP") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-900/40 border border-emerald-400/50 text-emerald-400">
        <Target className="w-3 h-3" />
        AUTO-CLOSED (TP)
      </span>
    );
  }
  if (closeReason === "SL") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-orange-900/40 border border-orange-400/50 text-orange-400">
        <AlertCircle className="w-3 h-3" />
        AUTO-CLOSED (SL)
      </span>
    );
  }
  if (status === "EXECUTED") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-900/40 border border-green-400/50 text-green-400">
        <CheckCircle className="w-3 h-3" />
        AUSGEFÜHRT
      </span>
    );
  }
  if (status === "IGNORED") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-800/60 border border-gray-500/40 text-gray-400">
        <XCircle className="w-3 h-3" />
        IGNORIERT
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-yellow-900/30 border border-yellow-400/40 text-yellow-400">
      <Clock className="w-3 h-3" />
      AUSSTEHEND
    </span>
  );
}

// ─── Signal-Zeile ─────────────────────────────────────────────────────────────

function SignalRow({ signal, onUpdate }: { signal: ScanSignal; onUpdate: () => void }) {
  const [noteInput, setNoteInput] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pendingAction, setPendingAction] = useState<"EXECUTED" | "IGNORED" | null>(null);

  const updateMutation = trpc.signals.updateStatus.useMutation({
    onSuccess: () => {
      setPendingAction(null);
      setShowNote(false);
      setNoteInput("");
      onUpdate();
    },
    onError: (err) => {
      console.error("Update fehlgeschlagen:", err.message);
      setPendingAction(null);
    },
  });

  const handleAction = (status: "EXECUTED" | "IGNORED") => {
    setPendingAction(status);
    updateMutation.mutate({ id: signal.id, status, note: noteInput || undefined });
  };

  const isBuy = signal.signal === "BUY";
  const isActioned = signal.status !== "PENDING";

  return (
    <div
      className={`border rounded-lg p-3 transition-all duration-200 ${
        isActioned
          ? "border-gray-700/40 bg-gray-900/20 opacity-60"
          : isBuy
          ? "border-green-400/30 bg-green-900/10 hover:bg-green-900/20"
          : "border-red-400/30 bg-red-900/10 hover:bg-red-900/20"
      }`}
    >
      {/* Header-Zeile */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isBuy ? (
            <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <span className={`font-mono font-bold text-sm ${isBuy ? "text-green-400" : "text-red-400"}`}>
            {formatSymbol(signal.symbol)}
          </span>
          <span className="text-gray-500 text-xs font-mono">{signal.interval}</span>
          <span
            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
              isBuy ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
            }`}
          >
            {signal.signal}
          </span>
          {signal.hasDivergence && (
            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
              signal.divergenceType === "bullish"
                ? "bg-green-900/40 text-green-300 border border-green-400/50"
                : "bg-red-900/40 text-red-300 border border-red-400/50"
            }`}>
              💎 {signal.divergenceType?.toUpperCase()}
            </span>
          )}
          {signal.confluenceCount && signal.confluenceCount >= 2 && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-400/50">
              🔗 {signal.confluenceCount}TF
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  signal.strength >= 80
                    ? "bg-green-400"
                    : signal.strength >= 65
                    ? "bg-yellow-400"
                    : "bg-gray-400"
                }`}
                style={{ width: `${signal.strength}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400">{signal.strength}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={signal.status} closeReason={signal.closeReason} />
          <span className="text-gray-600 text-xs font-mono">{formatTime(signal.scannedAt)}</span>
        </div>
      </div>

      {/* Preis-Info */}
      <div className="mt-1.5 flex items-center gap-4 text-xs font-mono text-gray-400">
        <span>Preis: <span className="text-gray-300">{formatPrice(signal.currentPrice)}</span></span>
        <span>RSI: <span className="text-gray-300">{parseFloat(signal.rsi).toFixed(1)}</span></span>
        <span>EMA12: <span className="text-gray-300">{parseFloat(signal.ema12).toFixed(4)}</span></span>
      </div>

      {signal.note && (
        <div className="mt-1.5 text-xs font-mono text-gray-400 italic">
          Notiz: {signal.note}
        </div>
      )}

      {!isActioned && (
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAction("EXECUTED")}
              disabled={updateMutation.isPending}
              className="h-7 px-3 text-xs font-mono font-bold bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              {pendingAction === "EXECUTED" ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Ausgeführt
            </Button>
            <Button
              onClick={() => handleAction("IGNORED")}
              disabled={updateMutation.isPending}
              className="h-7 px-3 text-xs font-mono font-bold bg-gray-700 hover:bg-gray-600 text-gray-300 gap-1"
            >
              {pendingAction === "IGNORED" ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              Ignorieren
            </Button>
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-xs font-mono text-gray-500 hover:text-gray-300 flex items-center gap-0.5 transition-colors"
            >
              Notiz
              {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showNote && (
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Optionale Notiz (z.B. 'Einstieg bei $X')"
              maxLength={500}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

interface ScannerSignalsProps {
  filters?: {
    symbols: string[];
    intervals: string[];
    signalTypes: string[];
    statuses: string[];
  };
  onSignalsUpdate?: (total: number, filtered: number) => void;
}

export function ScannerSignals({ filters, onSignalsUpdate }: ScannerSignalsProps = {}) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "EXECUTED" | "IGNORED">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Baue Filter-Objekt für Datenbank-Query
  const dbFilters = React.useMemo(() => {
    const filterObj: any = {};
    
    if (filters?.symbols.length) filterObj.symbols = filters.symbols;
    if (filters?.intervals.length) filterObj.intervals = filters.intervals;
    if (filters?.signalTypes.length) filterObj.signalTypes = filters.signalTypes;
    
    if (filter !== "ALL") {
      filterObj.statuses = [filter];
    } else if (filters?.statuses.length) {
      filterObj.statuses = filters.statuses;
    }
    
    return Object.keys(filterObj).length > 0 ? filterObj : undefined;
  }, [filters, filter]);

  // Nutze signals.filtered Query mit Pagination
  const { data: result, isLoading, refetch } = trpc.signals.filtered.useQuery(
    dbFilters ? { ...dbFilters, limit: pageSize, page } : { limit: pageSize, page },
    { refetchInterval: 30_000 }
  );

  const signals = result?.signals ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  // Benachrichtige Parent über Anzahl der Signale
  React.useEffect(() => {
    if (onSignalsUpdate) {
      onSignalsUpdate(total, signals.length);
    }
  }, [total, signals.length, onSignalsUpdate]);

  const pendingCount = signals.filter((s) => s.status === "PENDING").length;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Zurück zur ersten Seite bei Seitengröße-Änderung
  };

  return (
    <div className="p-4 bg-gray-900/50 border border-cyan-400/20 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-cyan-400 font-mono">▸ SCANNER-SIGNALE</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-yellow-900/40 border border-yellow-400/40 text-yellow-400">
              {pendingCount} ausstehend
            </span>
          )}
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-7 px-3 text-xs font-mono bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-400/30 gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Filter-Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {(["ALL", "PENDING", "EXECUTED", "IGNORED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1); // Zurück zur ersten Seite bei Filter-Änderung
            }}
            className={`px-3 py-1 rounded text-xs font-mono font-bold flex-shrink-0 transition-colors ${
              filter === f
                ? "bg-cyan-500 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600/40"
            }`}
          >
            {f === "ALL" ? "Alle" : f === "PENDING" ? "Ausstehend" : f === "EXECUTED" ? "Ausgeführt" : "Ignoriert"}
            {f !== "ALL" && (
              <span className="ml-1 opacity-70">
                ({signals.filter((s) => s.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Signale */}
      {isLoading && signals.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : signals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 font-mono text-sm">
          {filter === "ALL"
            ? "Noch keine Signale — Scanner wartet auf Kerzen-Close via WebSocket"
            : `Keine ${filter === "PENDING" ? "ausstehenden" : filter === "EXECUTED" ? "ausgeführten" : "ignorierten"} Signale`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {signals.map((signal) => (
            <SignalRow
              key={signal.id}
              signal={signal as ScanSignal}
              onUpdate={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {total > 0 && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
