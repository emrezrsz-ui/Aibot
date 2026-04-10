# Crypto Signal Dashboard — Vollständige Setup-Anleitung

> **Ziel:** Die App mit Supabase-Datenbank verbinden und über GitHub Actions 24/7 automatisch scannen lassen — ohne dass dein Computer laufen muss.

---

## Schritt 1: Supabase-Projekt erstellen

Gehe zu [supabase.com](https://supabase.com) und erstelle einen kostenlosen Account. Klicke auf **"New project"**, wähle einen Namen (z.B. `crypto-signal-dashboard`) und eine Region (am besten `Frankfurt` für niedrige Latenz). Notiere dir das **Passwort** — du brauchst es später nicht mehr, aber es ist wichtig für die initiale Einrichtung.

---

## Schritt 2: Datenbanktabellen anlegen (SQL)

Öffne in deinem Supabase-Projekt: **SQL Editor → New Query**. Kopiere den folgenden SQL-Code vollständig hinein und klicke auf **"Run"** (oder `Ctrl+Enter`):

```sql
-- Tabelle: trades (aktive & geschlossene Trades)
CREATE TABLE IF NOT EXISTS trades (
  id            TEXT PRIMARY KEY,
  symbol        TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  entry_price   NUMERIC(20, 8) NOT NULL,
  stop_loss     NUMERIC(20, 8) NOT NULL,
  take_profit   NUMERIC(20, 8) NOT NULL,
  strength      INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
  timeframe     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  close_reason  TEXT CHECK (close_reason IN ('TP', 'SL') OR close_reason IS NULL),
  close_price   NUMERIC(20, 8),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabelle: stats (Winrate pro Symbol und Timeframe)
CREATE TABLE IF NOT EXISTS stats (
  id              SERIAL PRIMARY KEY,
  symbol          TEXT NOT NULL,
  timeframe       TEXT NOT NULL,
  total_trades    INTEGER NOT NULL DEFAULT 0,
  winning_trades  INTEGER NOT NULL DEFAULT 0,
  winrate         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (symbol, timeframe)
);

-- Tabelle: settings (App-Einstellungen)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Standard-Einstellungen
INSERT INTO settings (key, value) VALUES
  ('alert_threshold', '75'),
  ('sound_enabled', 'true'),
  ('notifications_enabled', 'true'),
  ('default_timeframe', '15m'),
  ('scan_interval_seconds', '30')
ON CONFLICT (key) DO NOTHING;

-- Row Level Security aktivieren
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Alle Operationen erlauben (Single-User-App)
CREATE POLICY "Allow all on trades" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stats" ON stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime für trades und stats aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE stats;

-- Automatische Stats-Berechnung via Trigger
CREATE OR REPLACE FUNCTION recalculate_stats(p_symbol TEXT, p_timeframe TEXT)
RETURNS VOID AS $$
DECLARE v_total INTEGER; v_wins INTEGER; v_winrate NUMERIC;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE close_reason = 'TP')
  INTO v_total, v_wins FROM trades
  WHERE symbol = p_symbol AND timeframe = p_timeframe AND status = 'CLOSED';
  v_winrate := CASE WHEN v_total > 0 THEN ROUND((v_wins::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO stats (symbol, timeframe, total_trades, winning_trades, winrate)
  VALUES (p_symbol, p_timeframe, v_total, v_wins, v_winrate)
  ON CONFLICT (symbol, timeframe) DO UPDATE SET
    total_trades = EXCLUDED.total_trades, winning_trades = EXCLUDED.winning_trades,
    winrate = EXCLUDED.winrate, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_recalculate_stats() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND (OLD.status IS NULL OR OLD.status = 'ACTIVE') THEN
    PERFORM recalculate_stats(NEW.symbol, NEW.timeframe);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trade_closed ON trades;
CREATE TRIGGER on_trade_closed AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_stats();
```

Nach dem Ausführen solltest du in der linken Seitenleiste unter **Table Editor** drei neue Tabellen sehen: `trades`, `stats` und `settings`.

---

## Schritt 3: API-Keys aus Supabase kopieren

Gehe zu **Settings → API** in deinem Supabase-Projekt. Du brauchst zwei Werte:

| Key | Wo zu finden | Verwendung |
|---|---|---|
| **Project URL** | Oben auf der Seite | `VITE_SUPABASE_URL` im Frontend |
| **anon public** | Unter "Project API keys" | `VITE_SUPABASE_ANON_KEY` im Frontend |
| **service_role** | Unter "Project API keys" (versteckt) | `SUPABASE_SERVICE_ROLE_KEY` für GitHub Actions |

> **Wichtig:** Den `service_role` Key niemals im Frontend verwenden! Er hat vollen Datenbankzugriff und gehört nur in GitHub Secrets.

---

## Schritt 4: Umgebungsvariablen in Manus einrichten

Gehe in der Manus-Oberfläche zu **Settings → Secrets** und füge folgende Variablen hinzu:

```
VITE_SUPABASE_URL        = https://dein-projekt-id.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Nach dem Speichern wird die App automatisch neu gebaut und verbindet sich mit Supabase. Der gelbe "Lokaler Modus"-Banner verschwindet und wird durch ein grünes "☁️ Cloud"-Badge ersetzt.

---

## Schritt 5: Code auf GitHub pushen

### Option A — Über die Manus-Oberfläche (empfohlen)

Gehe zu **Settings → GitHub** und klicke auf "Export to GitHub". Wähle einen Repository-Namen und klicke auf "Export". Der Code wird automatisch in ein privates Repository gepusht.

### Option B — Manuell via Terminal

```bash
# Repository initialisieren
cd crypto-signal-dashboard
git init
git add .
git commit -m "Initial commit: Crypto Signal Dashboard mit Supabase"

# GitHub Repository erstellen und pushen
gh repo create crypto-signal-dashboard --private --source=. --push
```

---

## Schritt 6: GitHub Secrets für den Cron-Job einrichten

Gehe in deinem GitHub-Repository zu **Settings → Secrets and variables → Actions** und füge folgende Secrets hinzu:

| Secret Name | Wert | Beschreibung |
|---|---|---|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Deine Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service Role Key (aus Schritt 3) |

---

## Schritt 7: GitHub Actions Cron-Job aktivieren

Der Cron-Job ist bereits in `.github/workflows/crypto-scanner.yml` konfiguriert. Nach dem Push auf GitHub wird er automatisch alle **5 Minuten** ausgeführt.

Du kannst den Job auch manuell starten: **GitHub → Actions → Crypto Signal Scanner → Run workflow**.

### Was der Cron-Job macht:

Der Scanner läuft auf GitHub-Servern (kostenlos, bis zu 2.000 Minuten/Monat im Free-Tier). Er fragt die Binance API ab, berechnet RSI und EMA für alle 4 Coins, und speichert starke Signale (>75%) direkt in deiner Supabase-Datenbank. Wenn du die App dann öffnest, werden die Trades automatisch aus der Cloud geladen — egal ob du 5 Minuten oder 5 Stunden weg warst.

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    DEIN IPHONE / BROWSER                 │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         React Dashboard (Manus Hosting)          │    │
│  │  - Zeigt Signale und Trades an                   │    │
│  │  - Liest/schreibt Supabase in Echtzeit           │    │
│  │  - Service Worker: Background-Scan alle 60s      │    │
│  │  - Push-Notifications bei >75% Signalen          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Realtime Websocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud-DB)                   │
│                                                          │
│  trades    │  stats      │  settings                    │
│  ──────    │  ──────     │  ──────────                  │
│  BTCUSDT   │  BTC/15m    │  alert_threshold: 75         │
│  BUY       │  winrate:   │  sound_enabled: true         │
│  ACTIVE    │  66.7%      │  default_timeframe: 15m      │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │ INSERT neue Trades
                            │
┌─────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS (alle 5 Minuten)             │
│                                                          │
│  cron-scan.js                                            │
│  ├── Fragt Binance API ab (BTCUSDT, ETHUSDT, ...)       │
│  ├── Berechnet RSI + EMA                                 │
│  ├── Findet starke Signale (>75%)                        │
│  └── Speichert in Supabase trades-Tabelle                │
└─────────────────────────────────────────────────────────┘
```

---

## Häufige Fragen

**Kostet das etwas?**
Supabase Free Tier: 500 MB Datenbank, 50.000 Zeilen, unbegrenzte API-Anfragen. GitHub Actions Free Tier: 2.000 Minuten/Monat. Bei 5-Minuten-Intervall = ~8.640 Minuten/Monat — das überschreitet das Free-Tier. Empfehlung: 15-Minuten-Intervall (2.880 Minuten/Monat, kostenlos).

**Wie ändere ich das Scan-Intervall?**
Öffne `.github/workflows/crypto-scanner.yml` und ändere `*/5 * * * *` zu `*/15 * * * *` für 15-Minuten-Intervall.

**Was passiert wenn GitHub Actions den Job stoppt?**
Der Service Worker im Browser übernimmt als Backup und scannt alle 60 Sekunden, solange das Tab offen ist.

**Kann ich mehrere Coins hinzufügen?**
Ja — öffne `scanner-backend/cron-scan.js` und füge weitere Symbole zum `SYMBOLS`-Array hinzu (z.B. `"BNBUSDT"`, `"ADAUSDT"`).

---

*Crypto Signal Dashboard v2.1 — April 2026*
