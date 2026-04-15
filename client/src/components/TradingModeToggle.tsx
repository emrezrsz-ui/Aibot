/**
 * TradingModeToggle.tsx — Demo/Real Money Mode Toggle
 */

import { Button } from "@/components/ui/button";

interface TradingModeToggleProps {
  demoMode: boolean;
  onModeChange: (demoMode: boolean) => void;
}

export default function TradingModeToggle({ demoMode, onModeChange }: TradingModeToggleProps) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => onModeChange(true)}
        className={`px-4 py-2 rounded-lg font-bold transition-all ${
          demoMode
            ? "bg-cyan-500 hover:bg-cyan-600 text-black"
            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
        }`}
      >
        Demo Mode
      </Button>
      <Button
        onClick={() => onModeChange(false)}
        className={`px-4 py-2 rounded-lg font-bold transition-all ${
          !demoMode
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
        }`}
      >
        Real Money
      </Button>
    </div>
  );
}
