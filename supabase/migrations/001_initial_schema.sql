-- ============================================================
-- Crypto Signal Dashboard — Supabase Datenbankschema
-- ============================================================
-- Führe dieses SQL im Supabase SQL-Editor aus:
-- Dashboard → SQL Editor → New Query → Einfügen → Run
-- ============================================================

-- ─── Tabelle: trades ─────────────────────────────────────────
-- Speichert alle aktiven und geschlossenen Trades
CREATE TABLE IF NOT EXISTS trades (
  id            TEXT PRIMARY KEY,          -- z.B. "BTCUSDT-1712345678901"
  symbol        TEXT NOT NULL,             -- "BTCUSDT", "ETHUSDT", etc.
  type          TEXT NOT NULL              -- "BUY" oder "SELL"
                CHECK (type IN ('BUY', 'SELL')),
  entry_price   NUMERIC(20, 8) NOT NULL,   -- Einstiegspreis
  stop_loss     NUMERIC(20, 8) NOT NULL,   -- Stop-Loss-Preis
  take_profit   NUMERIC(20, 8) NOT NULL,   -- Take-Profit-Preis
  strength      INTEGER NOT NULL           -- Signalstärke 0–100
                CHECK (strength BETWEEN 0 AND 100),
  timeframe     TEXT NOT NULL,             -- "1m", "5m", "15m", "1h", "4h"
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'CLOSED')),
  close_reason  TEXT                       -- "TP" oder "SL" (NULL wenn noch aktiv)
                CHECK (close_reason IN ('TP', 'SL') OR close_reason IS NULL),
  close_price   NUMERIC(20, 8),            -- Schlusspreis (NULL wenn noch aktiv)
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,              -- NULL wenn noch aktiv
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Abfragen nach Symbol und Status
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades (symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades (status);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_timeframe ON trades (symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades (opened_at DESC);

-- ─── Tabelle: stats ──────────────────────────────────────────
-- Winrate und Statistiken pro Symbol und Timeframe
CREATE TABLE IF NOT EXISTS stats (
  id              SERIAL PRIMARY KEY,
  symbol          TEXT NOT NULL,           -- "BTCUSDT"
  timeframe       TEXT NOT NULL,           -- "15m"
  total_trades    INTEGER NOT NULL DEFAULT 0,
  winning_trades  INTEGER NOT NULL DEFAULT 0,    -- Trades mit close_reason = 'TP' (WIN)
  losing_trades   INTEGER NOT NULL DEFAULT 0,    -- Trades mit close_reason = 'SL' (LOSS)
  winrate         NUMERIC(5, 2) NOT NULL DEFAULT 0,  -- 0.00–100.00
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (symbol, timeframe)               -- Nur ein Eintrag pro Symbol+Timeframe
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_stats_symbol ON stats (symbol);

-- ─── Tabelle: settings ───────────────────────────────────────
-- App-Einstellungen (Key-Value-Store)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,            -- z.B. "alert_threshold", "sound_enabled"
  value       TEXT NOT NULL,              -- JSON-serialisierter Wert
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Standard-Einstellungen einfügen ─────────────────────────
INSERT INTO settings (key, value) VALUES
  ('alert_threshold', '75'),               -- Signalstärke ab der Alerts ausgelöst werden
  ('sound_enabled', 'true'),               -- Sound-Alerts ein/aus
  ('notifications_enabled', 'true'),       -- Push-Notifications ein/aus
  ('default_timeframe', '15m'),            -- Standard-Zeitintervall
  ('scan_interval_seconds', '30')          -- Scan-Intervall in Sekunden
ON CONFLICT (key) DO NOTHING;

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Aktiviere RLS für alle Tabellen (Sicherheit)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Alle Operationen erlauben (für Single-User-App ohne Auth)
-- WICHTIG: Ändere dies wenn du Multi-User-Support brauchst!
CREATE POLICY "Allow all operations on trades"
  ON trades FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on stats"
  ON stats FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on settings"
  ON settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── Realtime aktivieren ─────────────────────────────────────
-- Aktiviert Echtzeit-Updates für die trades-Tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE stats;

-- ─── Hilfsfunktion: Stats neu berechnen ──────────────────────
-- Wird aufgerufen wenn ein Trade geschlossen wird
CREATE OR REPLACE FUNCTION recalculate_stats(p_symbol TEXT, p_timeframe TEXT)
RETURNS VOID AS $$
DECLARE
  v_total   INTEGER;
  v_wins    INTEGER;
  v_losses  INTEGER;
  v_winrate NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE close_reason = 'TP'),
    COUNT(*) FILTER (WHERE close_reason = 'SL')
  INTO v_total, v_wins, v_losses
  FROM trades
  WHERE symbol = p_symbol
    AND timeframe = p_timeframe
    AND status = 'CLOSED';

  IF v_total > 0 THEN
    v_winrate := ROUND((v_wins::NUMERIC / v_total) * 100, 2);
  ELSE
    v_winrate := 0;
  END IF;

  INSERT INTO stats (symbol, timeframe, total_trades, winning_trades, losing_trades, winrate)
  VALUES (p_symbol, p_timeframe, v_total, v_wins, v_losses, v_winrate)
  ON CONFLICT (symbol, timeframe)
  DO UPDATE SET
    total_trades   = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    losing_trades  = EXCLUDED.losing_trades,
    winrate        = EXCLUDED.winrate,
    updated_at     = NOW();
END;
$$ LANGUAGE plpgsql;

-- ─── Trigger: Stats automatisch aktualisieren ────────────────
-- Wird ausgelöst wenn ein Trade geschlossen wird
CREATE OR REPLACE FUNCTION trigger_recalculate_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND (OLD.status IS NULL OR OLD.status = 'ACTIVE') THEN
    PERFORM recalculate_stats(NEW.symbol, NEW.timeframe);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trade_closed ON trades;
CREATE TRIGGER on_trade_closed
  AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_stats();

-- ─── Fertig! ─────────────────────────────────────────────────
-- Überprüfe die Tabellen:
-- SELECT * FROM trades;
-- SELECT * FROM stats;
-- SELECT * FROM settings;
