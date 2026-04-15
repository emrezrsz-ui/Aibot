/**
 * ConnectionManagerCard.tsx — Binance API & MetaTrader Webhook Manager
 */

import { useState } from "react";
import { Settings, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConnectionManagerCard() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://api.example.com/webhook/mt4/123/abc123xyz");
  const [connectionStatus, setConnectionStatus] = useState<"IDLE" | "TESTING" | "SUCCESS" | "ERROR">("IDLE");

  const handleTestConnection = async () => {
    setConnectionStatus("TESTING");
    // Simuliere Test
    setTimeout(() => {
      setConnectionStatus("SUCCESS");
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="bg-gray-800/50 border-cyan-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <Settings className="w-5 h-5" />
          Connection Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Binance API Keys */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-3">Binance API Keys</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Dein Binance API Key"
                  className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-cyan-400/20 rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Dein Binance API Secret"
                  className="w-full mt-1 px-3 py-2 bg-gray-900/50 border border-cyan-400/20 rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              <Button
                onClick={handleTestConnection}
                disabled={!apiKey || !apiSecret || connectionStatus === "TESTING"}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold disabled:opacity-50"
              >
                {connectionStatus === "TESTING" ? "Wird getestet..." : "Verbindung testen"}
              </Button>

              {connectionStatus === "SUCCESS" && (
                <div className="p-2 bg-green-900/30 border border-green-500/50 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">✅ Verbindung erfolgreich</span>
                </div>
              )}
              {connectionStatus === "ERROR" && (
                <div className="p-2 bg-red-900/30 border border-red-500/50 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">❌ Verbindungsfehler</span>
                </div>
              )}
            </div>
          </div>

          {/* MetaTrader Webhook */}
          <div className="border-t border-cyan-400/20 pt-6">
            <h3 className="text-sm font-bold text-cyan-300 mb-3">MetaTrader 4/5 Webhook</h3>
            <div className="p-3 bg-gray-900/50 border border-cyan-400/20 rounded">
              <p className="text-xs text-gray-400 mb-2">Webhook-URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-cyan-400 break-all">{webhookUrl}</code>
                <Button
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Kopiere diese URL in dein MetaTrader EA-Script für automatische Signale.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
