# Crypto Signal Dashboard — Deployment-Anleitung

> **Ziel:** Das Dashboard dauerhaft online hosten, damit der Scanner 24/7 läuft — auch wenn dein Computer ausgeschaltet ist.

---

## Übersicht: Was wird wo gehostet?

Das Projekt besteht aus zwei Teilen, die unabhängig voneinander deployed werden können:

| Teil | Was es ist | Empfohlener Host |
|---|---|---|
| **Frontend** (React-App) | Das Dashboard, das du im Browser siehst | **Manus** (bereits integriert) oder Vercel/Netlify |
| **Backend** (`scanner-backend/`) | Der 24/7-Scanner, der Signale berechnet | **Railway**, **Render** oder **Replit** |

> **Wichtig:** Das Frontend funktioniert auch ohne das Backend — es holt Daten dann direkt aus dem Browser via Binance API. Das Backend ist nur nötig, wenn du echte 24/7-Benachrichtigungen auch bei geschlossenem Browser willst.

---

## Option A — Nur das Frontend deployen (einfachste Lösung)

Das Frontend ist bereits über Manus deploybar. Der Service Worker übernimmt das Background Scanning direkt im Browser.

**Schritte:**

1. Klicke in der Manus-Oberfläche oben rechts auf **"Publish"**
2. Die App ist sofort unter deiner Manus-URL erreichbar (z.B. `dein-name.manus.space`)
3. Auf dem iPhone: Safari öffnen → Teilen-Symbol → **"Zum Home-Bildschirm"** → App wird wie eine native App installiert
4. Benachrichtigungen funktionieren auf iOS ab Version 16.4, wenn die App vom Home-Bildschirm geöffnet wird

**Einschränkung:** Wenn der Browser komplett geschlossen ist (kein Tab offen, kein Home-Bildschirm), können keine Scans laufen.

---

## Option B — Backend auf Railway deployen (empfohlen für 24/7)

Railway ist ein einfacher Cloud-Dienst mit kostenlosem Kontingent. Der Scanner läuft dort permanent.

### Schritt 1: GitHub-Repository erstellen

```bash
# Im Manus-Terminal (oder lokal nach Code-Download):
cd crypto-signal-dashboard/scanner-backend
git init
git add .
git commit -m "Initial commit: Crypto Signal Scanner"
```

Alternativ: In der Manus-Oberfläche → **Settings → GitHub** → "Export to GitHub" wählen.

### Schritt 2: Railway-Account erstellen

1. Gehe zu [railway.app](https://railway.app) und registriere dich (kostenlos mit GitHub-Login)
2. Klicke auf **"New Project"**
3. Wähle **"Deploy from GitHub repo"**
4. Wähle dein Repository aus

### Schritt 3: Konfiguration in Railway

Gehe in Railway zu **Variables** und füge folgende Umgebungsvariablen hinzu:

| Variable | Wert | Beschreibung |
|---|---|---|
| `PORT` | `3001` | Port des Servers |
| `SELF_URL` | `https://dein-projekt.railway.app` | Deine Railway-URL (für Keep-Alive) |

Railway erkennt die `package.json` automatisch und startet mit `npm start`.

### Schritt 4: Frontend mit Backend verbinden (optional)

Wenn du möchtest, dass das Frontend die Signale vom Backend bezieht statt direkt von Binance, füge in der Manus-Oberfläche unter **Settings → Secrets** folgende Variable hinzu:

```
VITE_SCANNER_API_URL=https://dein-projekt.railway.app
```

---

## Option C — Backend auf Render deployen (kostenlos, kein Kreditkarte nötig)

Render bietet einen dauerhaft kostenlosen Web-Service-Tier.

### Schritte:

1. Gehe zu [render.com](https://render.com) und registriere dich
2. Klicke auf **"New → Web Service"**
3. Verbinde dein GitHub-Repository
4. Konfiguriere den Service:
   - **Root Directory:** `scanner-backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Füge unter **Environment Variables** hinzu:
   - `PORT` = `10000` (Render verwendet Port 10000)
   - `SELF_URL` = deine Render-URL

> **Hinweis zu Render Free Tier:** Kostenlose Services schlafen nach 15 Minuten Inaktivität ein. Der eingebaute Keep-Alive-Ping verhindert das automatisch — er sendet alle 14 Minuten einen Ping an sich selbst.

---

## Option D — Backend auf Replit deployen

Replit ist besonders einfach für Einsteiger, da kein Git-Wissen nötig ist.

### Schritte:

1. Gehe zu [replit.com](https://replit.com) und erstelle einen Account
2. Klicke auf **"+ Create Repl"**
3. Wähle **"Node.js"** als Template
4. Lösche die vorhandenen Dateien und kopiere den Inhalt von `scanner-backend/` hinein:
   - `server.js` → in den Root-Ordner
   - `package.json` → in den Root-Ordner
5. Klicke auf **"Run"**
6. Replit zeigt oben eine URL an (z.B. `https://crypto-signal-scanner.dein-name.repl.co`)
7. Trage diese URL als `SELF_URL` in den Secrets ein (Replit → Secrets-Tab → `SELF_URL`)

> **Replit Always On:** Für dauerhaften Betrieb ohne Schlafmodus benötigst du Replit Core (kostenpflichtig). Alternativ: Nutze [UptimeRobot](https://uptimerobot.com) (kostenlos) um alle 5 Minuten einen Ping an deine Replit-URL zu senden.

---

## Keep-Alive mit UptimeRobot (kostenlos, für alle Optionen)

UptimeRobot pingt deinen Server alle 5 Minuten und verhindert so den Schlafmodus:

1. Registriere dich kostenlos auf [uptimerobot.com](https://uptimerobot.com)
2. Klicke auf **"Add New Monitor"**
3. Wähle **"HTTP(s)"** als Monitor-Typ
4. Trage deine Server-URL ein: `https://dein-server.com/health`
5. Intervall: **5 Minuten**
6. Speichern — fertig

---

## Schnell-Referenz: API-Endpunkte des Backends

Sobald das Backend läuft, kannst du diese URLs im Browser aufrufen:

| Endpunkt | Beschreibung |
|---|---|
| `/health` | Server-Status, Uptime, Anzahl Scans |
| `/api/signals?interval=15m` | Alle 4 Coins für ein Zeitintervall |
| `/api/signals/BTCUSDT?interval=1h` | Signal für ein einzelnes Coin |
| `/api/signals/strong` | Nur Signale mit Stärke >75% |
| `/api/signals/all` | Alle gecachten Signale (alle Intervalle) |

---

## Zusammenfassung

Für die meisten Nutzer reicht **Option A** (nur Frontend via Manus publizieren) vollständig aus. Der Service Worker übernimmt das Background Scanning im Browser und sendet Benachrichtigungen auch wenn das Tab nicht aktiv ist. Für echte 24/7-Überwachung ohne offenen Browser empfiehlt sich **Option B** (Railway) als zuverlässigste und einfachste Lösung.

---

*Erstellt für Crypto Signal Dashboard v2.1 — April 2026*
