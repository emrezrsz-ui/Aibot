/**
 * Signals Page — Scanner-Signale Verwaltung
 * ==========================================
 * Dedizierte Seite für die manuelle Verwaltung von Scanner-Signalen.
 * Zeigt alle erfassten Signale mit Status-Verwaltung.
 */

import { ScannerSignals } from "@/components/ScannerSignals";

export default function Signals() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-mono">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(0, 217, 255, 0.1) 25%, rgba(0, 217, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 217, 255, 0.1) 75%, rgba(0, 217, 255, 0.1) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0, 217, 255, 0.1) 25%, rgba(0, 217, 255, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 217, 255, 0.1) 75%, rgba(0, 217, 255, 0.1) 76%, transparent 77%, transparent)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-400/20 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-cyan-400 bg-clip-text text-transparent">
              ◆ SCANNER-SIGNALE ◆
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Manuelle Verwaltung aller erfassten Markt-Signale. Markiere Signale als ausgeführt oder ignoriert.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <ScannerSignals />
        </main>
      </div>
    </div>
  );
}
