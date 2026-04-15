/**
 * safety-filters.ts — Sicherheits-Filter für automatische Order-Ausführung
 */

export interface FilterCheckResult {
  passed: boolean;
  reason: string;
  filterName: string;
}

export interface AllFiltersResult {
  allPassed: boolean;
  filters: FilterCheckResult[];
  timestamp: number;
}

/**
 * Liquiditäts-Filter: Keine Orders für Paare mit < 50M USD 24h-Volumen
 */
export function checkLiquidity(volume24h: number): FilterCheckResult {
  const MIN_VOLUME = 50_000_000; // 50M USD

  return {
    passed: volume24h >= MIN_VOLUME,
    reason: `Liquidität: ${(volume24h / 1_000_000).toFixed(1)}M USD ${volume24h >= MIN_VOLUME ? "✓" : "✗ (min 50M)"}`,
    filterName: "Liquidität",
  };
}

/**
 * Zeit-Filter: Keine neuen Orders 30 Min vor Stunden-Close
 */
export function checkTimeFilter(): FilterCheckResult {
  const now = new Date();
  const minuteOfHour = now.getMinutes();

  // Prüfe: Sind wir in den letzten 30 Minuten der Stunde?
  const inRestrictedWindow = minuteOfHour >= 30;

  return {
    passed: !inRestrictedWindow,
    reason: `Zeit-Filter: ${minuteOfHour}:${now.getSeconds().toString().padStart(2, "0")} ${inRestrictedWindow ? "✗ (30 Min vor Hour-Close)" : "✓"}`,
    filterName: "Zeit-Filter",
  };
}

/**
 * Chop-Filter: Zwischen 22:00 und 06:00 UTC muss Signal-Stärke >= 85% sein
 */
export function checkChopFilter(signalStrength: number): FilterCheckResult {
  const now = new Date();
  const utcHour = now.getUTCHours();

  // Chop-Zeit: 22:00 - 06:00 UTC
  const isChopTime = utcHour >= 22 || utcHour < 6;

  if (!isChopTime) {
    // Außerhalb Chop-Zeit: immer OK
    return {
      passed: true,
      reason: `Chop-Filter: ${utcHour.toString().padStart(2, "0")}:00 UTC ✓ (außerhalb Chop-Zeit)`,
      filterName: "Chop-Filter",
    };
  }

  // In Chop-Zeit: Signal-Stärke muss >= 85% sein
  const MIN_STRENGTH_CHOP = 85;
  const passed = signalStrength >= MIN_STRENGTH_CHOP;

  return {
    passed,
    reason: `Chop-Filter: ${utcHour.toString().padStart(2, "0")}:00 UTC - Signal ${signalStrength}% ${passed ? "✓" : `✗ (min 85%)`}`,
    filterName: "Chop-Filter",
  };
}

/**
 * Kombiniere alle Filter
 */
export function executeAllFilters(
  volume24h: number,
  signalStrength: number
): AllFiltersResult {
  const filters = [
    checkLiquidity(volume24h),
    checkTimeFilter(),
    checkChopFilter(signalStrength),
  ];

  const allPassed = filters.every((f) => f.passed);

  return {
    allPassed,
    filters,
    timestamp: Date.now(),
  };
}

/**
 * Formatiere Filter-Ergebnisse für Activity-Log
 */
export function formatFilterResults(result: AllFiltersResult): string {
  const status = result.allPassed ? "✅ ALLE FILTER OK" : "❌ FILTER BLOCKIERT";
  const details = result.filters.map((f) => `  ${f.reason}`).join("\n");

  return `${status}\n${details}`;
}
