/**
 * useSettings Hook
 * ================
 * Lädt und speichert App-Einstellungen.
 * Nutzt Supabase wenn konfiguriert, sonst localStorage.
 */

import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting, isSupabaseConfigured } from "@/lib/supabase";

export interface AppSettings {
  alertThreshold: number;   // 0–100, Standard: 75
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  defaultTimeframe: string;
  scanIntervalSeconds: number;
  mtfTrendFilterEnabled: boolean;  // Multi-Timeframe-Filter (4h EMA 200)
  volumeConfirmationEnabled: boolean;  // Volumen-Bestätigungs-Filter (SMA 20)
}

const DEFAULT_SETTINGS: AppSettings = {
  alertThreshold: 75,
  soundEnabled: true,
  notificationsEnabled: true,
  defaultTimeframe: "15m",
  scanIntervalSeconds: 30,
  mtfTrendFilterEnabled: false,
  volumeConfirmationEnabled: false,
};

const LOCAL_SETTINGS_KEY = "crypto_signal_settings";

function loadLocalSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings: AppSettings) {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[Settings] localStorage-Speichern fehlgeschlagen:", e);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadLocalSettings);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  // Beim Start: Einstellungen aus Supabase laden
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    async function loadFromSupabase() {
      try {
        const [threshold, sound, notifications, timeframe, interval, mtfFilter, volumeFilter] = await Promise.all([
          getSetting("alert_threshold"),
          getSetting("sound_enabled"),
          getSetting("notifications_enabled"),
          getSetting("default_timeframe"),
          getSetting("scan_interval_seconds"),
          getSetting("mtf_trend_filter_enabled"),
          getSetting("volume_confirmation_enabled"),
        ]);

        setSettings(prev => ({
          ...prev,
          alertThreshold: threshold ? parseInt(threshold) : prev.alertThreshold,
          soundEnabled: sound !== null ? sound === "true" : prev.soundEnabled,
          notificationsEnabled: notifications !== null ? notifications === "true" : prev.notificationsEnabled,
          defaultTimeframe: timeframe || prev.defaultTimeframe,
          scanIntervalSeconds: interval ? parseInt(interval) : prev.scanIntervalSeconds,
          mtfTrendFilterEnabled: mtfFilter !== null ? mtfFilter === "true" : prev.mtfTrendFilterEnabled,
          volumeConfirmationEnabled: volumeFilter !== null ? volumeFilter === "true" : prev.volumeConfirmationEnabled,
        }));
      } catch (err) {
        console.error("[Settings] Laden aus Supabase fehlgeschlagen:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadFromSupabase();
  }, []);

  // Einstellung aktualisieren
  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings(prev => {
        const updated = { ...prev, [key]: value };
        saveLocalSettings(updated);
        return updated;
      });

      // In Supabase speichern wenn konfiguriert
      if (isSupabaseConfigured) {
        const supabaseKey = key
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .replace(/^_/, "");
        await setSetting(supabaseKey, String(value));
      }
    },
    []
  );

  return { settings, updateSetting, isLoading };
}
