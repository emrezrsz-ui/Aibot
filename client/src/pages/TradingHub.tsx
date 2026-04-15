/**
 * TradingHub.tsx — Trading Hub Seite
 * ==================================
 * Zentrale Verwaltungsseite für Bot-Status, Verbindungen und Live-Aktivitäten.
 */

import { useState, useEffect } from "react";
import { LayoutDashboard, Zap, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MasterSwitch from "@/components/MasterSwitch";
import TradingModeToggle from "@/components/TradingModeToggle";
import ConnectionManagerCard from "@/components/ConnectionManagerCard";
import RiskSettingsForm from "@/components/RiskSettingsForm";
import ActivityLogTerminal from "@/components/ActivityLogTerminal";

export default function TradingHub() {
  const [botStatus, setBotStatus] = useState<"ON" | "OFF">("OFF");
  const [demoMode, setDemoMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"CONNECTED" | "DISCONNECTED" | "ERROR">("DISCONNECTED");
  const [accountBalance, setAccountBalance] = useState(10000);

  useEffect(() => {
    // Simuliere Verbindungsstatus
    const timer = setTimeout(() => {
      setConnectionStatus("CONNECTED");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-mono">
      {/* Header */}
      <div className="border-b border-cyan-400/20 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-magenta-400 bg-clip-text text-transparent">
                TRADING HUB
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {connectionStatus === "CONNECTED" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm">Verbunden</span>
                  </>
                ) : connectionStatus === "ERROR" ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">Fehler</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-yellow-400 text-sm">Verbindung wird hergestellt...</span>
                  </>
                )}
              </div>
              <MasterSwitch botStatus={botStatus} onStatusChange={setBotStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Real Money Warning */}
        {!demoMode && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-bold">⚠️ ACHTUNG: ECHTGELD-HANDEL AKTIV</p>
              <p className="text-red-400/80 text-sm mt-1">
                Du handelst mit echtem Geld. Stelle sicher, dass deine Risk-Management-Einstellungen korrekt sind.
              </p>
            </div>
          </div>
        )}

        {/* Top Row: Master Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Trading Mode */}
          <Card className="bg-gray-800/50 border-cyan-400/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Zap className="w-5 h-5" />
                Trading-Modus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TradingModeToggle demoMode={demoMode} onModeChange={setDemoMode} />
              <div className="mt-4 p-3 bg-gray-900/50 rounded border border-cyan-400/20">
                <p className="text-sm text-gray-300">
                  {demoMode ? (
                    <>
                      <span className="text-green-400 font-bold">Demo-Modus aktiv</span>
                      <br />
                      <span className="text-gray-400">Fiktives Kapital: $10,000.00</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-400 font-bold">Echtgeld-Modus aktiv</span>
                      <br />
                      <span className="text-gray-400">Echte Trades werden ausgeführt</span>
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-gray-800/50 border-cyan-400/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <LayoutDashboard className="w-5 h-5" />
                Account-Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                  <span className="text-gray-400">Kontostand:</span>
                  <span className="text-green-400 font-bold">${accountBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                  <span className="text-gray-400">Verfügbar:</span>
                  <span className="text-cyan-400">${(accountBalance * 0.95).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                  <span className="text-gray-400">Aktive Trades:</span>
                  <span className="text-yellow-400">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Manager */}
        <div className="mb-8">
          <ConnectionManagerCard />
        </div>

        {/* Risk Settings */}
        <div className="mb-8">
          <RiskSettingsForm />
        </div>

        {/* Live Activity Log */}
        <div>
          <ActivityLogTerminal />
        </div>
      </div>
    </div>
  );
}
