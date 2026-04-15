import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  // Phase 2: RSI-Divergenz-Erkennung
  hasDivergence: boolean("hasDivergence").default(false).notNull(),
  divergenceType: varchar("divergenceType", { length: 20 }), // "bullish" | "bearish" | null
  divergenceStrength: int("divergenceStrength").default(0).notNull(),
  // Phase 2: Multi-Timeframe Confluence
  confluenceCount: int("confluenceCount").default(1).notNull(), // 1–3 Timeframes
  confluenceTimeframes: varchar("confluenceTimeframes", { length: 50 }), // "5m,15m,1h"
  confluenceBonus: int("confluenceBonus").default(0).notNull(), // +15 oder +25
  status: mysqlEnum("status", ["PENDING", "EXECUTED", "IGNORED"]).default("PENDING").notNull(),
  note: text("note"), // Optionale Notiz des Benutzers
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
  actionAt: timestamp("actionAt"), // Wann EXECUTED/IGNORED gesetzt wurde
});

export type ScanSignal = typeof scanSignals.$inferSelect;
export type InsertScanSignal = typeof scanSignals.$inferInsert;

/**
 * Filter-Konfiguration: Benutzer-spezifische Filter-Einstellungen.
 * Speichert die Aktivierungsstatus der professionellen Trading-Filter.
 */
export const filterConfigs = mysqlTable("filter_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mtfTrendFilterEnabled: boolean("mtfTrendFilterEnabled").default(false).notNull(),
  volumeConfirmationEnabled: boolean("volumeConfirmationEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilterConfig = typeof filterConfigs.$inferSelect;
export type InsertFilterConfig = typeof filterConfigs.$inferInsert;


/**
 * Phase 3: User Connections — Gespeicherte Exchange-Verbindungen (Binance, MetaTrader, etc.)
 * API-Keys werden verschlüsselt gespeichert.
 */
export const userConnections = mysqlTable("user_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  exchange: varchar("exchange", { length: 50 }).notNull(), // "binance", "metatrader4", "metatrader5"
  apiKey: text("apiKey").notNull(), // Verschlüsselt
  apiSecret: text("apiSecret").notNull(), // Verschlüsselt
  webhookUrl: text("webhookUrl"), // Für MetaTrader Webhooks
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "ERROR"]).default("INACTIVE").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  errorMessage: text("errorMessage"), // Fehler-Details wenn status = ERROR
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserConnection = typeof userConnections.$inferSelect;
export type InsertUserConnection = typeof userConnections.$inferInsert;

/**
 * Phase 3: Trading Config — Bot-Einstellungen pro Benutzer
 * Speichert Bot-Status, Trading-Modi und Risk-Management-Parameter.
 */
export const tradingConfigs = mysqlTable("trading_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  botStatus: mysqlEnum("botStatus", ["ON", "OFF"]).default("OFF").notNull(),
  demoMode: boolean("demoMode").default(true).notNull(), // true = Demo, false = Real Money
  slippageTolerance: decimal("slippageTolerance", { precision: 5, scale: 2 }).default("0.5").notNull(), // %
  maxTradeSize: decimal("maxTradeSize", { precision: 15, scale: 2 }).default("1000").notNull(), // USDT
  demoBalance: decimal("demoBalance", { precision: 15, scale: 2 }).default("10000").notNull(), // Fiktives Kapital
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingConfig = typeof tradingConfigs.$inferSelect;
export type InsertTradingConfig = typeof tradingConfigs.$inferInsert;
