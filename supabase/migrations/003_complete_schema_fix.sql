-- ============================================================
-- Migration 003: Vollständige Schema-Reparatur für trades-Tabelle
-- ============================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com → dein Projekt → SQL Editor → New Query
-- Klicke auf "Run" (Strg+Enter)
-- ============================================================

-- Alle fehlenden Spalten auf einmal hinzufügen (IF NOT EXISTS = sicher)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS symbol       TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS type         TEXT CHECK (type IN ('BUY', 'SELL'));
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_price  NUMERIC(20, 8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS stop_loss    NUMERIC(20, 8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS take_profit  NUMERIC(20, 8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS strength     NUMERIC(5, 2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS timeframe    TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED'));
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_reason TEXT CHECK (close_reason IN ('TP', 'SL'));
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_price  NUMERIC(20, 8);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS opened_at    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at    TIMESTAMPTZ;

-- Bestehende Zeilen: opened_at mit created_at befüllen
UPDATE trades
  SET opened_at = created_at
  WHERE opened_at IS NULL AND created_at IS NOT NULL;

-- Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_trades_symbol      ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status      ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at   ON trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_tf   ON trades(symbol, timeframe);

-- Bestätigung: Zeige alle Spalten der trades-Tabelle
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trades'
ORDER BY ordinal_position;
