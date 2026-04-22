import { desc, eq, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { InsertUser, InsertScanSignal, ScanSignal, scanSignals, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// Safe-Boot: Erhöhe Connection-Timeout auf 30 Sekunden
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Safe-Boot: Konfiguriere PostgreSQL Connection mit 30s Timeout
      const connectionString = process.env.DATABASE_URL;
      const connectionUrl = new URL(connectionString);
      
      // Setze Connection-Timeout Parameter
      connectionUrl.searchParams.set('connect_timeout', '30');
      connectionUrl.searchParams.set('statement_timeout', '30000');
      
      _db = drizzle(connectionUrl.toString());
      console.log('[Database] Connected successfully with 30s timeout');
    } catch (error) {
      console.warn('[Database] Failed to connect:', error);
      console.warn('[Database] Server will continue without database - graceful degradation enabled');
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL: Use onConflict instead of onDuplicateKeyUpdate
    // Conflict on unique constraint (openId), then update
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── scan_signals Queries ────────────────────────────────────────────────────

/** Letzte Scanner-Signale laden (Standard: 50 neueste) */
export async function getRecentSignals(limit = 50): Promise<ScanSignal[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(scanSignals)
      .orderBy(desc(scanSignals.scannedAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] getRecentSignals:", error);
    return [];
  }
}

/** Signal-Status aktualisieren (EXECUTED oder IGNORED) */
export async function updateSignalStatus(
  id: number,
  status: "EXECUTED" | "IGNORED",
  note?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db
      .update(scanSignals)
      .set({ status, note: note ?? null, actionAt: new Date() })
      .where(eq(scanSignals.id, id));
    return true;
  } catch (error) {
    console.error("[Database] updateSignalStatus:", error);
    return false;
  }
}

/** Neues Scanner-Signal speichern */
export async function insertScanSignal(signal: InsertScanSignal): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(scanSignals).values(signal);
    return (result[0] as { insertId: number }).insertId ?? null;
  } catch (error) {
    console.error("[Database] insertScanSignal:", error);
    return null;
  }
}

interface PaginationResult {
  signals: ScanSignal[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Gefilterte Scanner-Signale laden mit optionalen Filtern und Pagination (Datenbank-Level) */
export async function getSignalsByFilter(
  filters: {
    symbols?: string[];
    intervals?: string[];
    signalTypes?: string[];
    statuses?: string[];
  },
  limit = 100,
  page = 1
): Promise<PaginationResult> {
  const db = await getDb();
  if (!db) return { signals: [], total: 0, page, pageSize: limit, totalPages: 0 };
  try {
    // Baue WHERE-Clauses basierend auf Filtern
    const whereConditions: Array<ReturnType<typeof eq>> = [];

    if (filters.symbols && filters.symbols.length > 0) {
      whereConditions.push(inArray(scanSignals.symbol, filters.symbols));
    }
    if (filters.intervals && filters.intervals.length > 0) {
      whereConditions.push(inArray(scanSignals.interval, filters.intervals));
    }
    if (filters.signalTypes && filters.signalTypes.length > 0) {
      whereConditions.push(inArray(scanSignals.signal, filters.signalTypes));
    }
    if (filters.statuses && filters.statuses.length > 0) {
      whereConditions.push(inArray(scanSignals.status, filters.statuses as ("EXECUTED" | "IGNORED" | "PENDING")[]));
    }

    // Kombiniere alle WHERE-Clauses mit AND
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Zähle Gesamt-Signale für Pagination
    const countResult = await db
      .select({ count: desc(scanSignals.id) })
      .from(scanSignals)
      .where(whereClause);
    
    const total = countResult.length > 0 ? countResult.length : 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Führe Datenbank-Query mit Filtern und Pagination aus
    const signals = await db
      .select()
      .from(scanSignals)
      .where(whereClause)
      .orderBy(desc(scanSignals.scannedAt))
      .limit(limit)
      .offset(offset);

    return {
      signals,
      total,
      page,
      pageSize: limit,
      totalPages,
    };
  } catch (error) {
    console.error("[Database] getSignalsByFilter:", error);
    return { signals: [], total: 0, page, pageSize: limit, totalPages: 0 };
  }
}

export { PaginationResult };

// TODO: add feature queries here as your schema grows.

// ─── Trades Queries ─────────────────────────────────────────────────────────

// Import trades table
import { trades } from "../drizzle/schema";

/** Speichere einen neuen Trade */
export async function saveTrade(trade: any): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save trade: database not available");
    return null;
  }
  try {
    const result = await db.insert(trades).values(trade);
    const insertId = (result[0] as { insertId: number }).insertId;
    if (!insertId) return null;
    
    // Lade den neu erstellten Trade
    const saved = await db.select().from(trades).where(eq(trades.id, insertId)).limit(1);
    return saved.length > 0 ? saved[0] : null;
  } catch (error) {
    console.error("[Database] saveTrade:", error);
    return null;
  }
}

/** Aktualisiere einen bestehenden Trade */
export async function updateTrade(id: number, updates: any): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update trade: database not available");
    return false;
  }
  try {
    await db.update(trades).set(updates).where(eq(trades.id, id));
    return true;
  } catch (error) {
    console.error("[Database] updateTrade:", error);
    return false;
  }
}

/** Lade alle Trades eines Benutzers */
export async function getUserTrades(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.createdAt));
  } catch (error) {
    console.error("[Database] getUserTrades:", error);
    return [];
  }
}

/** Lade aktive Trades eines Benutzers */
export async function getActiveTrades(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "OPEN")))
      .orderBy(desc(trades.createdAt));
  } catch (error) {
    console.error("[Database] getActiveTrades:", error);
    return [];
  }
}

/** Lade einen Trade nach ID */
export async function getTradeById(id: number, userId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] getTradeById:", error);
    return null;
  }
}
