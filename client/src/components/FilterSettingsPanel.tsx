/**
 * FilterSettingsPanel.tsx
 * =======================
 * Professionelle Trading-Filter mit Toggle-Switches
 * - MTF-Trend-Filter (4h EMA 200)
 * - Volumen-Bestätigungs-Filter (SMA 20)
 */

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";

export function FilterSettingsPanel() {
  const { settings, updateSetting } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMTFToggle = async (enabled: boolean) => {
    await updateSetting("mtfTrendFilterEnabled", enabled);
  };

  const handleVolumeToggle = async (enabled: boolean) => {
    await updateSetting("volumeConfirmationEnabled", enabled);
  };

  return (
    <div className="w-full">
      {/* Header Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-900/40 to-magenta-900/40 border border-cyan-400/30 rounded-lg hover:border-cyan-400/60 transition-all"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-sm font-bold text-cyan-400">
            FILTER-EINSTELLUNGEN
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-cyan-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-cyan-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <Card className="mt-2 p-4 bg-gray-900/80 border-cyan-400/30 space-y-4">
          {/* MTF-Trend-Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold text-cyan-400">
                  MTF-Trend-Filter (4h)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  BUY-Signale nur wenn Preis über EMA 200 (4h). SELL nur unter EMA 200.
                </p>
              </div>
              <Switch
                checked={settings.mtfTrendFilterEnabled}
                onCheckedChange={handleMTFToggle}
              />
            </div>
            {settings.mtfTrendFilterEnabled && (
              <div className="text-xs text-green-400 bg-green-900/20 border border-green-400/30 rounded px-3 py-2">
                ✓ Multi-Timeframe-Trend-Filter AKTIV
              </div>
            )}
          </div>

          {/* Volumen-Bestätigungs-Filter */}
          <div className="space-y-2 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold text-cyan-400">
                  Volumen-Bestätigung (SMA 20)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Signale nur wenn aktuelles Volumen über SMA 20. Filtert Fakeouts.
                </p>
              </div>
              <Switch
                checked={settings.volumeConfirmationEnabled}
                onCheckedChange={handleVolumeToggle}
              />
            </div>
            {settings.volumeConfirmationEnabled && (
              <div className="text-xs text-green-400 bg-green-900/20 border border-green-400/30 rounded px-3 py-2">
                ✓ Volumen-Bestätigungs-Filter AKTIV
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="border-t border-gray-700 pt-4 text-xs text-gray-500 bg-gray-900/50 border border-gray-700/50 rounded px-3 py-2">
            <p className="font-mono font-bold text-cyan-400 mb-1">💡 Hinweis:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Filter können unabhängig voneinander aktiviert werden</li>
              <li>Deaktivierte Filter beeinflussen die Signal-Berechnung nicht</li>
              <li>Einstellungen werden lokal und in Supabase gespeichert</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
