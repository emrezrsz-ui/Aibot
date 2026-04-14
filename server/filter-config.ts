/**
 * filter-config.ts — Filter-Konfiguration Management
 * ===================================================
 * Verwaltet die aktiven Filter-Einstellungen für den Scanner.
 * Filter können vom Frontend über API aktiviert/deaktiviert werden.
 */

export interface FilterConfig {
  mtfTrendFilterEnabled: boolean;
  volumeConfirmationEnabled: boolean;
}

// Globale Filter-Konfiguration (Standard: alle Filter deaktiviert)
let activeFilters: FilterConfig = {
  mtfTrendFilterEnabled: false,
  volumeConfirmationEnabled: false,
};

/**
 * Gibt die aktuelle Filter-Konfiguration zurück
 */
export function getActiveFilters(): FilterConfig {
  return { ...activeFilters };
}

/**
 * Aktualisiert die Filter-Konfiguration
 */
export function updateFilters(config: Partial<FilterConfig>): FilterConfig {
  activeFilters = { ...activeFilters, ...config };
  console.log("[FilterConfig] Filter aktualisiert:", activeFilters);
  return { ...activeFilters };
}

/**
 * Setzt alle Filter auf Standard zurück
 */
export function resetFilters(): FilterConfig {
  activeFilters = {
    mtfTrendFilterEnabled: false,
    volumeConfirmationEnabled: false,
  };
  console.log("[FilterConfig] Filter zurückgesetzt");
  return { ...activeFilters };
}
