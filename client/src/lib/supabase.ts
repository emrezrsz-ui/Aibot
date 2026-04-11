/**
 * Supabase Client — Crypto Signal Dashboard
 * ==========================================
 * Verbindung zur Supabase-Datenbank.
 * Umgebungsvariablen:
 *   VITE_SUPABASE_URL      = https://xxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY = eyJ...
 *
 * Schema-Validierung: Beim ersten Zugriff wird geprüft ob alle
 * benötigten Spalten vorhanden sind. Wenn nicht → lokaler Modus.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface DbTrade {
  id: string;
  symbol?: string;
  type?: "BUY" | "SELL";
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  strength?: number;
  timeframe?: string;
  status?: "ACTIVE" | "CLOSED";
  close_reason?: "TP" | "SL" | null;
  close_price?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface DbStat {
  id?: number;
  symbol: string;
  timeframe: string;
  total_trades: number;
  winning_trades: number;
  winrate: number;
  updated_at?: string;
}

export interface DbSetting {
  key: string;
  value: string;
  updated_at?: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-anon-key";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

if (!isSupabaseConfigured) {
  console.info("[Supabase] Nicht konfiguriert — App läuft im lokalen Modus.");
}

// ─── Schema-Validierung ───────────────────────────────────────────────────────
// Prüft einmalig ob die Tabelle alle nötigen Spalten hat.
// Wenn nicht → schreibt ins Log und deaktiviert Inserts.

const REQUIRED_COLUMNS = ["id", "symbol", "type", "entry_price", "stop_loss", "take_profit", "timeframe", "status"];
let schemaValid: boolean | null = null; // null = noch nicht geprüft
let availableColumns: Set<string> = new Set();

async function validateSchema(): Promise<boolean> {
  if (schemaValid !== null) return schemaValid;
  if (!supabase) { schemaValid = false; return false; }

  try {
    // Teste einen Insert mit einem Dummy-Datensatz und rollback via RPC
    // Alternativ: Versuche einen SELECT mit allen Spalten
    const { error } = await supabase
      .from("trades")
      .select("id,symbol,type,entry_price,stop_loss,take_profit,strength,timeframe,status")
      .limit(0);

    if (error) {
      // Schema unvollständig — finde heraus welche Spalten vorhanden sind
      console.warn("[Supabase] Schema unvollständig:", error.message);
      console.warn("[Supabase] Bitte führe Migration 004 im Supabase SQL Editor aus:");
      console.warn("[Supabase] supabase/migrations/004_recreate_trades_table.sql");

      // Versuche mit Basis-Spalten
      const { error: e2 } = await supabase
        .from("trades")
        .select("id,symbol,type,status")
        .limit(0);

      if (e2) {
        // Nur id vorhanden
        availableColumns = new Set(["id", "created_at"]);
        schemaValid = false;
      } else {
        availableColumns = new Set(["id", "symbol", "type", "status", "created_at"]);
        schemaValid = false; // Immer noch nicht vollständig
      }
      return false;
    }

    // Alle Spalten vorhanden
    availableColumns = new Set([...REQUIRED_COLUMNS, "strength", "close_reason", "close_price", "opened_at", "closed_at", "created_at"]);
    schemaValid = true;
    console.info("[Supabase] Schema validiert — alle Spalten vorhanden ✓");
    return true;
  } catch {
    schemaValid = false;
    return false;
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Alle aktiven Trades aus der Datenbank laden */
export async function loadActiveTrades(): Promise<DbTrade[]> {
  if (!supabase) return [];

  // Schema validieren
  await validateSchema();

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] loadActiveTrades:", error.message);
    return [];
  }
  return (data as unknown as DbTrade[]) || [];
}

/** Trade-History für ein Symbol laden */
export async function loadTradeHistory(symbol: string, timeframe?: string): Promise<DbTrade[]> {
  if (!supabase) return [];

  await validateSchema();

  if (!schemaValid && availableColumns.size <= 2) {
    // Schema zu unvollständig für sinnvolle Queries
    return [];
  }

  let query = supabase
    .from("trades")
    .select("*")
    .eq("status", "CLOSED")
    .eq("symbol", symbol)
    .order("created_at", { ascending: false })
    .limit(20);

  if (timeframe) {
    query = query.eq("timeframe", timeframe);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Supabase] loadTradeHistory:", error.message);
    return [];
  }
  return (data as unknown as DbTrade[]) || [];
}

/** Neuen Trade in die Datenbank einfügen */
export async function insertTrade(trade: Omit<DbTrade, "created_at">): Promise<DbTrade | null> {
  if (!supabase) return null;

  // Schema validieren
  const valid = await validateSchema();

  if (!valid) {
    // Schema unvollständig — nicht versuchen zu inserieren
    console.warn("[Supabase] insertTrade übersprungen — Schema unvollständig. Bitte Migration 004 ausführen.");
    return null;
  }

  // Vollständiger Insert
  const insertData: Record<string, unknown> = {
    id: trade.id,
    symbol: trade.symbol ?? "",
    type: trade.type ?? "BUY",
    entry_price: trade.entry_price ?? 0,
    stop_loss: trade.stop_loss ?? 0,
    take_profit: trade.take_profit ?? 0,
    strength: trade.strength ?? 0,
    timeframe: trade.timeframe ?? "15m",
    status: trade.status ?? "ACTIVE",
  };

  if (trade.close_reason != null) insertData.close_reason = trade.close_reason;
  if (trade.close_price != null) insertData.close_price = trade.close_price;
  if (trade.opened_at != null) insertData.opened_at = trade.opened_at;
  if (trade.closed_at != null) insertData.closed_at = trade.closed_at;

  const { data, error } = await supabase
    .from("trades")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] insertTrade:", error.message);
    // Schema-Validierung zurücksetzen damit beim nächsten Versuch neu geprüft wird
    schemaValid = null;
    return null;
  }

  return data as DbTrade;
}

/** Trade aktualisieren (z.B. beim Schließen) */
export async function updateTrade(
  id: string,
  updates: Partial<DbTrade>
): Promise<DbTrade | null> {
  if (!supabase) return null;

  const valid = await validateSchema();
  if (!valid) return null;

  const { data, error } = await supabase
    .from("trades")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] updateTrade:", error.message);
    return null;
  }
  return data as DbTrade;
}

/** Stats aktualisieren */
export async function upsertStat(stat: DbStat): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("stats")
    .upsert(stat, { onConflict: "symbol,timeframe" });

  if (error) {
    console.error("[Supabase] upsertStat:", error.message);
  }
}

/** Setting laden */
export async function getSetting(key: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) return null;
  return (data as DbSetting)?.value ?? null;
}

/** Setting speichern */
export async function setSetting(key: string, value: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[Supabase] setSetting:", error.message);
  }
}
