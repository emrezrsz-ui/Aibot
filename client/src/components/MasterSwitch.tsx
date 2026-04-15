/**
 * MasterSwitch.tsx — Bot ON/OFF Master Switch
 */

import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MasterSwitchProps {
  botStatus: "ON" | "OFF";
  onStatusChange: (status: "ON" | "OFF") => void;
}

export default function MasterSwitch({ botStatus, onStatusChange }: MasterSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onStatusChange(botStatus === "ON" ? "OFF" : "ON")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
          botStatus === "ON"
            ? "bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/50"
            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
        }`}
      >
        <Power className="w-4 h-4" />
        Bot {botStatus}
      </Button>
    </div>
  );
}
