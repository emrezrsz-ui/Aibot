/**
 * RiskSettingsForm.tsx — Risk Management Settings
 */

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RiskSettingsForm() {
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [maxTradeSize, setMaxTradeSize] = useState(1000);

  const handleSave = () => {
    console.log("Risk settings saved:", { slippageTolerance, maxTradeSize });
  };

  return (
    <Card className="bg-gray-800/50 border-cyan-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <AlertTriangle className="w-5 h-5" />
          Risk Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slippage Tolerance */}
          <div>
            <label className="text-sm font-bold text-cyan-300 mb-2 block">
              Slippage Tolerance (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={slippageTolerance}
                onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="w-16 px-3 py-2 bg-gray-900/50 border border-cyan-400/20 rounded text-center">
                <span className="text-cyan-400 font-bold">{slippageTolerance.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Maximale Preisabweichung vom Signal-Preis erlaubt.
            </p>
          </div>

          {/* Max Trade Size */}
          <div>
            <label className="text-sm font-bold text-cyan-300 mb-2 block">
              Max Trade Size (USDT)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={maxTradeSize}
                onChange={(e) => setMaxTradeSize(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="w-24 px-3 py-2 bg-gray-900/50 border border-cyan-400/20 rounded text-center">
                <span className="text-cyan-400 font-bold">${maxTradeSize}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Maximale Größe pro Trade in USDT.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-cyan-400/20 rounded">
          <p className="text-sm text-gray-300 mb-3">
            <span className="text-cyan-400 font-bold">Aktuelle Einstellungen:</span>
          </p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Slippage-Toleranz: <span className="text-cyan-400">{slippageTolerance.toFixed(1)}%</span></li>
            <li>• Max Trade-Größe: <span className="text-cyan-400">${maxTradeSize}</span></li>
            <li>• Preis-Check: <span className="text-cyan-400">Aktueller_Preis ≤ Signal_Preis × (1 + {slippageTolerance.toFixed(1)}%)</span></li>
          </ul>
        </div>

        <Button
          onClick={handleSave}
          className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
        >
          Einstellungen speichern
        </Button>
      </CardContent>
    </Card>
  );
}
