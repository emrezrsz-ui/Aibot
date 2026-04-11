-- ============================================================
-- Migration 002: Fehlende Spalten zur trades-Tabelle hinzufügen
-- ============================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com → dein Projekt → SQL Editor → New Query
-- ============================================================

-- Füge opened_at hinzu (Zeitstempel wann der Trade geöffnet wurde)
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NOW();

-- Füge closed_at hinzu (Zeitstempel wann der Trade geschlossen wurde)
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Füge close_price hinzu (Preis beim Schließen des Trades)
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS close_price NUMERIC(20, 8);

-- Füge close_reason hinzu (falls noch nicht vorhanden)
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS close_reason TEXT CHECK (close_reason IN ('TP', 'SL'));

-- Bestehende Zeilen: opened_at mit created_at befüllen
UPDATE trades
  SET opened_at = created_at
  WHERE opened_at IS NULL AND created_at IS NOT NULL;

-- Index für schnellere Abfragen nach opened_at
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_timeframe ON trades(symbol, timeframe);

-- Bestätigung
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trades'
ORDER BY ordinal_position;
