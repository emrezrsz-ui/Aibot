# Railway Deployment Guide — Crypto Signal Dashboard

Dieses Dokument beschreibt die Schritt-für-Schritt-Konfiguration des Crypto Signal Dashboards auf Railway mit 24/7 Scanner-Betrieb.

---

## 📋 Voraussetzungen

- ✅ GitHub-Repository mit dem Crypto Signal Dashboard
- ✅ Railway-Konto (https://railway.app)
- ✅ Supabase-Projekt mit Datenbank
- ✅ Supabase Service Role Key

---

## 🚀 Schritt 1: Railway-Projekt erstellen

### 1.1 Neues Projekt starten
1. Gehe zu [railway.app](https://railway.app)
2. Klicke auf **"New Project"**
3. Wähle **"Deploy from GitHub"**
4. Verbinde dein GitHub-Konto (falls noch nicht geschehen)
5. Wähle das `crypto-signal-dashboard` Repository

### 1.2 Build- und Start-Befehle
Railway sollte automatisch folgende Befehle erkennen:

```bash
# Build
npm run build

# Start
npm start
```

Falls nicht, konfiguriere sie manuell:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 22.x (automatisch erkannt)

---

## 🔐 Schritt 2: Umgebungsvariablen konfigurieren

### 2.1 Supabase-Credentials beschaffen

#### Supabase URL:
1. Gehe zu [supabase.com](https://supabase.com)
2. Öffne dein Projekt
3. Klicke auf **Settings** → **API**
4. Kopiere die **Project URL** (z.B. `https://xxxxx.supabase.co`)

#### Service Role Key:
1. In denselben **Settings** → **API**
2. Kopiere den **Service Role Key** (beginnt mit `eyJ...`)

⚠️ **WICHTIG:** Der Service Role Key ist vertraulich! Teile ihn nicht öffentlich.

### 2.2 Variables in Railway setzen

1. Öffne dein Railway-Projekt
2. Klicke auf den **Service** (z.B. "crypto-signal-dashboard")
3. Gehe zu **Variables**
4. Klicke auf **"Add Variable"**
5. Füge folgende Variablen ein:

| Variable | Wert | Beschreibung |
|----------|------|-------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Deine Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service Role Key aus Supabase |
| `NODE_ENV` | `production` | Produktionsumgebung |

**Speichern:** Klicke auf **"Save"**

---

## 🔄 Schritt 3: Deployment starten

### 3.1 Automatisches Deployment
Railway stellt automatisch bereit, wenn du zu GitHub pushst:

```bash
git add .
git commit -m "Deploy: Professional trading filters"
git push origin main
```

Railway erkennt den Push und startet das Deployment automatisch.

### 3.2 Deployment-Status prüfen

1. Öffne dein Railway-Projekt
2. Klicke auf den **Service**
3. Gehe zu **Deployments**
4. Beobachte den Build- und Start-Prozess

**Grüner Status** = Erfolgreich deployed ✅

---

## 📊 Schritt 4: Scanner-Betrieb verifizieren

### 4.1 Logs prüfen

1. Im Railway-Projekt: Klicke auf **Logs**
2. Suche nach folgenden Meldungen:

```
[Scanner/WS] Lade historische Kerzendaten via REST...
[Scanner/WS] WebSocket verbunden! 8 Kline-Streams aktiv.
```

Diese Meldungen bedeuten: Scanner läuft! ✅

### 4.2 Health-Endpoint testen

Öffne in deinem Browser:
```
https://[dein-railway-domain]/health
```

Du solltest folgende JSON-Antwort sehen:
```json
{
  "status": "running",
  "websocket": {
    "connected": true,
    "reconnectCount": 0
  },
  "signals": {
    "totalSignals": 42,
    "lastSignal": "2026-04-15T10:30:00Z"
  }
}
```

---

## 🗄️ Schritt 5: Datenbank-Schema initialisieren

### 5.1 Supabase-Tabellen erstellen

1. Gehe zu deinem Supabase-Projekt
2. Öffne den **SQL Editor**
3. Führe folgende Migrations aus:

#### Migration 1: scan_signals Tabelle
```sql
CREATE TABLE IF NOT EXISTS scan_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('BUY', 'SELL', 'NEUTRAL')),
  strength INTEGER NOT NULL,
  currentPrice DECIMAL(20, 8) NOT NULL,
  rsi DECIMAL(5, 2),
  ema12 DECIMAL(20, 8),
  ema26 DECIMAL(20, 8),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'IGNORED')),
  note TEXT,
  scannedAt TIMESTAMP DEFAULT NOW(),
  actionAt TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scan_signals_symbol_interval ON scan_signals(symbol, interval);
CREATE INDEX idx_scan_signals_status ON scan_signals(status);
CREATE INDEX idx_scan_signals_scannedAt ON scan_signals(scannedAt DESC);
```

#### Migration 2: trades Tabelle (falls nicht vorhanden)
```sql
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  entry_price DECIMAL(20, 8) NOT NULL,
  close_price DECIMAL(20, 8),
  close_reason TEXT CHECK (close_reason IN ('TP', 'SL', 'MANUAL', NULL)),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  sl_pct DECIMAL(5, 2),
  tp_pct DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE INDEX idx_trades_symbol_status ON trades(symbol, status);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
```

---

## 🔍 Schritt 6: Monitoring & Troubleshooting

### 6.1 Scanner-Status überwachen

**Logs regelmäßig prüfen:**
```bash
# Im Railway-Dashboard: Logs → Filter nach "Scanner"
```

**Häufige Meldungen:**
- ✅ `WebSocket verbunden` = Alles OK
- ⚠️ `Reconnect` = Temporärer Verbindungsabbruch (normal)
- ❌ `Supabase nicht konfiguriert` = Env-Vars fehlen

### 6.2 Häufige Fehler beheben

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| `SUPABASE_URL is not defined` | Env-Var nicht gesetzt | Überprüfe Variables in Railway |
| `Connection refused` | Supabase nicht erreichbar | Prüfe Supabase-URL und Netzwerk |
| `WebSocket disconnected` | Binance API temporär down | Scanner reconnectet automatisch |

### 6.3 Performance optimieren

**Railway-Ressourcen anpassen:**
1. Im Projekt: Klicke auf den Service
2. Gehe zu **Settings** → **Resources**
3. Erhöhe RAM/CPU bei Bedarf (Standard: 512MB RAM reicht)

---

## 📈 Schritt 7: Daten analysieren

### 7.1 Scanner-Signale in Supabase prüfen

1. Gehe zu Supabase → **Table Editor**
2. Öffne `scan_signals`
3. Du solltest neue Signale sehen (alle 15 Minuten ca. 4 neue Signale)

### 7.2 Performance-Metriken berechnen

```sql
-- Win-Rate berechnen
SELECT 
  COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) as wins,
  COUNT(CASE WHEN close_reason = 'SL' THEN 1 END) as losses,
  ROUND(
    100.0 * COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) / 
    COUNT(CASE WHEN close_reason IN ('TP', 'SL') THEN 1 END),
    2
  ) as win_rate_pct
FROM trades
WHERE status = 'CLOSED' AND close_reason IN ('TP', 'SL');
```

---

## 🛠️ Schritt 8: Erweiterte Konfiguration

### 8.1 Custom Domain (optional)

1. Im Railway-Projekt: **Settings** → **Domains**
2. Klicke auf **"Add Domain"**
3. Verbinde deine eigene Domain (z.B. `scanner.deine-domain.com`)

### 8.2 Alerts konfigurieren (optional)

1. Im Railway-Projekt: **Settings** → **Alerts**
2. Aktiviere Benachrichtigungen bei:
   - Build-Fehlern
   - Deployment-Problemen
   - Ressourcen-Überlastung

---

## ✅ Checkliste: Deployment erfolgreich?

- [ ] Railway-Projekt erstellt
- [ ] GitHub-Repository verbunden
- [ ] Env-Vars gesetzt (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Deployment erfolgreich (grüner Status)
- [ ] Scanner läuft (WebSocket connected in Logs)
- [ ] Health-Endpoint antwortet
- [ ] Datenbank-Tabellen erstellt
- [ ] Erste Signale in Supabase sichtbar
- [ ] Monitoring aktiv

---

## 📞 Support & Debugging

### Logs live verfolgen
```bash
# Im Railway-Dashboard: Logs → Live-Ansicht
```

### Häufige Fragen

**F: Wie lange dauert das Deployment?**
A: 2-5 Minuten (abhängig von Build-Zeit)

**F: Kann ich den Scanner pausieren?**
A: Ja, im Railway-Dashboard: Service → **Pause**

**F: Wie viel kostet Railway?**
A: ~$5-10/Monat für diese Konfiguration (mit Free-Tier Gutschrift)

**F: Kann ich mehrere Instanzen laufen lassen?**
A: Ja, aber nur eine sollte den Scanner ausführen (um Duplikate zu vermeiden)

---

## 🎯 Nächste Schritte

1. **Monitoring:** Beobachte die Scanner-Signale für 1-2 Wochen
2. **Optimierung:** Passe Filter basierend auf echten Daten an
3. **Skalierung:** Erweitere auf mehr Coins/Timeframes bei Bedarf

---

**Viel Erfolg beim Deployment! 🚀**

Bei Fragen oder Problemen: Überprüfe die Logs im Railway-Dashboard oder konsultiere die [Railway-Dokumentation](https://docs.railway.app).
