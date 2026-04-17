/**
 * PaginationControls — Pagination UI für große Datenmengen
 * =========================================================
 * Zeigt Navigations-Buttons und Seiten-Informationen.
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: PaginationControlsProps) {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const pageSizeOptions = [25, 50, 100, 200];

  return (
    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-700/40">
      {/* Info-Zeile */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-mono text-gray-400">
          Zeige <span className="text-cyan-400 font-bold">{startItem}</span> bis{" "}
          <span className="text-cyan-400 font-bold">{endItem}</span> von{" "}
          <span className="text-cyan-400 font-bold">{total}</span> Signalen
        </div>
        <div className="text-xs font-mono text-gray-400">
          Seite <span className="text-cyan-400 font-bold">{page}</span> von{" "}
          <span className="text-cyan-400 font-bold">{totalPages}</span>
        </div>
      </div>

      {/* Kontroll-Zeile */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Navigation Buttons */}
        <div className="flex gap-1">
          <Button
            onClick={() => onPageChange(1)}
            disabled={page === 1 || isLoading}
            className="h-7 px-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 border border-gray-600/40 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
            title="Zur ersten Seite"
          >
            <ChevronsLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Erste</span>
          </Button>
          <Button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            className="h-7 px-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 border border-gray-600/40 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
            title="Vorherige Seite"
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Zurück</span>
          </Button>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
            className="h-7 px-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 border border-gray-600/40 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
            title="Nächste Seite"
          >
            <span className="hidden sm:inline">Weiter</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages || isLoading}
            className="h-7 px-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 border border-gray-600/40 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
            title="Zur letzten Seite"
          >
            <span className="hidden sm:inline">Letzte</span>
            <ChevronsRight className="w-3 h-3" />
          </Button>
        </div>

        {/* Seitengröße-Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-gray-400">Signale pro Seite:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            className="h-7 px-2 text-xs font-mono bg-gray-800 border border-gray-600/40 text-gray-300 rounded hover:bg-gray-700 focus:outline-none focus:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading-Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-xs font-mono text-cyan-400">Lade Seite...</span>
        </div>
      )}
    </div>
  );
}
