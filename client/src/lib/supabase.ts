/**
 * Supabase Client — Crypto Signal Dashboard
 * ==========================================
 * Verbindung zur Supabase-Datenbank.
 * Umgebungsvariablen werden aus .env gelesen:
 *   VITE_SUPABASE_URL   = https://xxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY = eyJ...
 *
 * Robuste Implementierung: Erkennt automatisch welche Spalten
 * vorhanden sind und arbeitet mit dem vorhandenen Schema.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Typen für die Datenbank-Tabellen ────────────────────────────────────────

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
  // Flexibles Schema — weitere Spalten möglich
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

// ─── Supabase-Client initialisieren ──────────────────────────────────────────

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

// ─── Schema-Cache: Bekannte Spalten der trades-Tabelle ───────────────────────
// Wird beim ersten erfolgreichen Query automatisch befüllt

let knownTradeColumns: Set<string> | null = null;

async function getKnownColumns(): Promise<Set<string>> {
  if (knownTradeColumns) return knownTradeColumns;
  if (!supabase) return new Set();

  try {
    // Hole eine leere Antwort um die Spalten aus dem Schema zu ermitteln
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .limit(1);

    if (!error && data !== null) {
      if (data.length > 0) {
        knownTradeColumns = new Set(Object.keys(data[0]));
      } else {
        // Tabelle leer — versuche via Insert-Fehler zu erkennen
        // Nutze einen bekannten Basis-Satz
        knownTradeColumns = new Set(["id", "created_at"]);
      }
    }
  } catch {
    knownTradeColumns = new Set(["id", "created_at"]);
  }

  return knownTradeColumns ?? new Set(["id", "created_at"]);
}

/** Filtert ein Objekt auf nur bekannte Spalten */
function filterToKnownColumns(
  data: Record<string, unknown>,
  known: Set<string>
): Record<string, unknown> {
  if (known.size <= 2) return data; // Wenn wir die Spalten nicht kennen, alles versuchen
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (known.has(key) && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Alle aktiven Trades aus der Datenbank laden */
export async function loadActiveTrades(): Promise<DbTrade[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] loadActiveTrades:", error.message);
    return [];
  }

  // Schema-Cache befüllen
  if (data && data.length > 0 && !knownTradeColumns) {
    knownTradeColumns = new Set(Object.keys(data[0]));
    console.log("[Supabase] Bekannte Spalten:", Array.from(knownTradeColumns).join(", "));
  }

  return data || [];
}

/** Trade-History für ein Symbol laden (letzte 20) */
export async function loadTradeHistory(symbol: string, timeframe?: string): Promise<DbTrade[]> {
  if (!supabase) return [];

  let query = supabase
    .from("trades")
    .select("*")
    .eq("status", "CLOSED")
    .order("created_at", { ascending: false })
    .limit(20);

  // Nur filtern wenn die Spalte bekannt ist
  const cols = knownTradeColumns;
  if (!cols || cols.has("symbol")) {
    query = query.eq("symbol", symbol);
  }
  if (timeframe && (!cols || cols.has("timeframe"))) {
    query = query.eq("timeframe", timeframe);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Supabase] loadTradeHistory:", error.message);
    return [];
  }
  return data || [];
}

/** Neuen Trade in die Datenbank einfügen */
export async function insertTrade(trade: Omit<DbTrade, "created_at">): Promise<DbTrade | null> {
  if (!supabase) return null;

  // Vollständiger Insert mit allen Pflichtfeldern
  const fullInsert: Record<string, unknown> = {
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

  // Optionale Felder nur wenn vorhanden
  if (trade.close_reason != null) fullInsert.close_reason = trade.close_reason;
  if (trade.close_price != null) fullInsert.close_price = trade.close_price;
  if (trade.opened_at != null) fullInsert.opened_at = trade.opened_at;
  if (trade.closed_at != null) fullInsert.closed_at = trade.closed_at;

  const { data, error } = await supabase
    .from("trades")
    .insert(fullInsert)
    .select()
    .single();

  if (error) {
    // Wenn Spalte fehlt: schrittweise Felder entfernen bis Insert klappt
    if (error.message.includes("schema cache") || error.message.includes("column")) {
      console.warn("[Supabase] Spalte fehlt, versuche Minimal-Insert:", error.message);

      // Stufe 2: ohne strength und optionale Felder
      const insert2 = {
        id: trade.id,
        symbol: trade.symbol ?? "",
        type: trade.type ?? "BUY",
        entry_price: trade.entry_price ?? 0,
        stop_loss: trade.stop_loss ?? 0,
        take_profit: trade.take_profit ?? 0,
        timeframe: trade.timeframe ?? "15m",
        status: trade.status ?? "ACTIVE",
      };
      const { data: d2, error: e2 } = await supabase.from("trades").insert(insert2).select().single();
      if (!e2) return d2;

      // Stufe 3: nur absolut notwendige Felder
      const insert3 = {
        id: trade.id,
        symbol: trade.symbol ?? "",
        type: trade.type ?? "BUY",
        status: trade.status ?? "ACTIVE",
      };
      const { data: d3, error: e3 } = await supabase.from("trades").insert(insert3).select().single();
      if (!e3) return d3;

      console.error("[Supabase] insertTrade (alle Stufen fehlgeschlagen):", e3.message);
      return null;
    }
    console.error("[Supabase] insertTrade:", error.message);
    return null;
  }

  return data;
}

/** Trade aktualisieren (z.B. beim Schließen) */
export async function updateTrade(
  id: string,
  updates: Partial<DbTrade>
): Promise<boolean> {
  if (!supabase) return false;

  const known = await getKnownColumns();

  // Undefined-Werte entfernen
  const allUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) allUpdates[key] = value;
  }

  const safeUpdates = filterToKnownColumns(allUpdates, known);

  if (Object.keys(safeUpdates).length === 0) return true;

  const { error } = await supabase
    .from("trades")
    .update(safeUpdates)
    .eq("id", id);

  if (error) {
    console.warn("[Supabase] updateTrade:", error.message);
    // Fallback: nur status aktualisieren
    const { error: fallbackError } = await supabase
      .from("trades")
      .update({ status: updates.status ?? "CLOSED" })
      .eq("id", id);
    if (fallbackError) {
      console.error("[Supabase] updateTrade (fallback):", fallbackError.message);
      return false;
    }
  }
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
