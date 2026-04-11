import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Scanner-Signale: Vom 24/7-Scanner erfasste Markt-Signale.
 * Können manuell als EXECUTED oder IGNORED markiert werden.
 */
export const scanSignals = mysqlTable("scan_signals", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interval: varchar("interval", { length: 10 }).notNull(),
  signal: varchar("signal", { length: 10 }).notNull(), // BUY | SELL | NEUTRAL
  strength: int("strength").notNull().default(0),
  currentPrice: text("currentPrice").notNull(),
  rsi: text("rsi").notNull(),
  ema12: text("ema12").notNull(),
  ema26: text("ema26").notNull(),
  status: mysqlEnum("status", ["PENDING", "EXECUTED", "IGNORED"]).default("PENDING").notNull(),
  note: text("note"), // Optionale Notiz des Benutzers
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
  actionAt: timestamp("actionAt"), // Wann EXECUTED/IGNORED gesetzt wurde
});

export type ScanSignal = typeof scanSignals.$inferSelect;
export type InsertScanSignal = typeof scanSignals.$inferInsert;