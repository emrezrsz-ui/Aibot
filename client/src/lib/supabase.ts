/**
 * Supabase Client — Crypto Signal Dashboard
 * ==========================================
 * Verbindung zur Supabase-Datenbank.
 * Umgebungsvariablen werden aus .env gelesen:
 *   VITE_SUPABASE_URL   = https://xxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY = eyJ...
 */

import { createClient } from "@supabase/supabase-js";

// ─── Typen für die Datenbank-Tabellen ────────────────────────────────────────

export interface DbTrade {
  id: string;
  symbol: string;           // "BTCUSDT"
  type: "BUY" | "SELL";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  strength: number;         // 0–100
  timeframe: string;        // "1m" | "5m" | "15m" | "1h" | "4h"
  status: "ACTIVE" | "CLOSED";
  close_reason?: "TP" | "SL" | null;
  close_price?: number | null;
  opened_at: string;        // ISO timestamp
  closed_at?: string | null;
  created_at?: string;
}

export interface DbStat {
  id?: number;
  symbol: string;           // "BTCUSDT"
  timeframe: string;        // "15m"
  total_trades: number;
  winning_trades: number;
  winrate: number;          // 0–100
  updated_at?: string;
}

export interface DbSetting {
  key: string;              // z.B. "alert_threshold", "sound_enabled"
  value: string;            // JSON-serialisierter Wert
  updated_at?: string;
}

// ─── Supabase-Client initialisieren ──────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Prüfe ob Supabase konfiguriert ist
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-anon-key";

// Client nur erstellen wenn konfiguriert (verhindert Fehler ohne .env)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }, // Kein Login nötig — Public API
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

if (!isSupabaseConfigured) {
  console.info(
    "[Supabase] Nicht konfiguriert — App läuft im lokalen Modus.\n" +
    "Füge VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env ein."
  );
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Alle aktiven Trades aus der Datenbank laden */
export async function loadActiveTrades(): Promise<DbTrade[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("status", "ACTIVE")
    .order("opened_at", { ascending: false });
  if (error) { console.error("[Supabase] loadActiveTrades:", error.message); return []; }
  return data || [];
}

/** Trade-History für ein Symbol laden (letzte 20) */
export async function loadTradeHistory(symbol: string, timeframe?: string): Promise<DbTrade[]> {
  if (!supabase) return [];
  let query = supabase
    .from("trades")
    .select("*")
    .eq("symbol", symbol)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false })
    .limit(20);
  if (timeframe) query = query.eq("timeframe", timeframe);
  const { data, error } = await query;
  if (error) { console.error("[Supabase] loadTradeHistory:", error.message); return []; }
  return data || [];
}

/** Neuen Trade in die Datenbank einfügen */
export async function insertTrade(trade: Omit<DbTrade, "created_at">): Promise<DbTrade | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trades")
    .insert(trade)
    .select()
    .single();
  if (error) { console.error("[Supabase] insertTrade:", error.message); return null; }
  return data;
}

/** Trade aktualisieren (z.B. beim Schließen) */
export async function updateTrade(
  id: string,
  updates: Partial<DbTrade>
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("trades")
    .update(updates)
    .eq("id", id);
  if (error) { console.error("[Supabase] updateTrade:", error.message); return false; }
  return true;
}

/** Stats für ein Symbol/Timeframe aktualisieren (Upsert) */
export async function upsertStats(stat: DbStat): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("stats")
    .upsert(
      { ...stat, updated_at: new Date().toISOString() },
      { onConflict: "symbol,timeframe" }
    );
  if (error) { console.error("[Supabase] upsertStats:", error.message); return false; }
  return true;
}

/** Stats für alle Symbole laden */
export async function loadStats(): Promise<DbStat[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("stats").select("*");
  if (error) { console.error("[Supabase] loadStats:", error.message); return []; }
  return data || [];
}

/** Einstellung lesen */
export async function getSetting(key: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error) return null;
  return data?.value ?? null;
}

/** Einstellung speichern (Upsert) */
export async function setSetting(key: string, value: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) { console.error("[Supabase] setSetting:", error.message); return false; }
  return true;
}
