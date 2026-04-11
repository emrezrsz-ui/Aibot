-- ============================================================
-- MIGRATION 004: trades-Tabelle komplett neu anlegen
-- Führe dieses Skript im Supabase SQL Editor aus
-- ACHTUNG: Löscht alle vorhandenen Trades!
-- ============================================================

-- Alte Tabelle löschen (falls vorhanden)
DROP TABLE IF EXISTS trades CASCADE;

-- Neue trades-Tabelle mit allen benötigten Spalten
CREATE TABLE trades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol        TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  entry_price   NUMERIC(20, 8) NOT NULL DEFAULT 0,
  stop_loss     NUMERIC(20, 8) NOT NULL DEFAULT 0,
  take_profit   NUMERIC(20, 8) NOT NULL DEFAULT 0,
  strength      NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  timeframe     TEXT NOT NULL DEFAULT '15m',
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  close_reason  TEXT CHECK (close_reason IN ('TP', 'SL')),
  close_price   NUMERIC(20, 8),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indizes für schnelle Abfragen
CREATE INDEX idx_trades_symbol     ON trades(symbol);
CREATE INDEX idx_trades_status     ON trades(status);
CREATE INDEX idx_trades_timeframe  ON trades(timeframe);
CREATE INDEX idx_trades_opened_at  ON trades(opened_at DESC);
CREATE INDEX idx_trades_sym_tf     ON trades(symbol, timeframe);

-- Row Level Security aktivieren
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy: alle Operationen erlaubt (für Single-User-App)
CREATE POLICY "Allow all on trades"
  ON trades FOR ALL
  USING (true)
  WITH CHECK (true);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- stats-Tabelle (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS stats (
  id              SERIAL PRIMARY KEY,
  symbol          TEXT NOT NULL,
  timeframe       TEXT NOT NULL,
  total_trades    INT NOT NULL DEFAULT 0,
  winning_trades  INT NOT NULL DEFAULT 0,
  losing_trades   INT NOT NULL DEFAULT 0,
  winrate         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, timeframe)
);

ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on stats" ON stats FOR ALL USING (true) WITH CHECK (true);

-- settings-Tabelle (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('notifications_enabled', 'true'),
  ('signal_threshold', '70'),
  ('alert_threshold', '80'),
  ('default_timeframe', '15m'),
  ('scan_interval_seconds', '30')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

SELECT 'Migration 004 erfolgreich ausgeführt!' AS status;
