/**
 * Custom Hook für AI Command Center
 * Verwaltet Command-Input, Analyse und History
 * Design Philosophy: Futuristisches Neon-Trading-Terminal
 */

import { useState } from "react";
import { parseCommand, analyzeMarket, CommandAnalysisResult } from "@/lib/commandParser";

export interface CommandHistory {
  command: string;
  result: CommandAnalysisResult;
  timestamp: number;
}

export function useCommandCenter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CommandAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandHistory[]>([]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) {
      setError("Bitte geben Sie einen Befehl ein (z.B. XRP5, BTC15m)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse den Befehl
      const parsed = parseCommand(command);

      if (parsed.error) {
        setError(parsed.error);
        setLoading(false);
        return;
      }

      // Führe Analyse durch
      const analysisResult = await analyzeMarket(parsed.ticker, parsed.timeframe, parsed.displayTimeframe);

      if (!analysisResult.success && analysisResult.error) {
        setError(analysisResult.error);
        setResult(null);
      } else {
        setResult(analysisResult);
        setHistory([
          {
            command,
            result: analysisResult,
            timestamp: Date.now(),
          },
          ...history.slice(0, 9), // Behalte nur die letzten 10 Befehle
        ]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(input);
    setInput("");
  };

  return {
    input,
    setInput,
    result,
    loading,
    error,
    history,
    executeCommand,
    handleSubmit,
  };
}
