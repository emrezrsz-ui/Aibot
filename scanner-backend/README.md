# Crypto Signal Scanner — Backend

Eigenständiger 24/7 Node.js-Server, der unabhängig vom Browser die Binance API scannt und Signale cached.

## Konfiguration

Erstelle eine `.env` Datei im `scanner-backend/` Verzeichnis:

```
PORT=3001
SELF_URL=https://deine-url-hier.com
```

## Starten

```bash
cd scanner-backend
npm install
npm start
```

## API Endpunkte

| Endpunkt | Beschreibung |
|---|---|
| `GET /health` | Server-Status und Uptime |
| `GET /api/signals?interval=15m` | Alle Signale für ein Intervall |
| `GET /api/signals/BTCUSDT?interval=1h` | Signal für ein Symbol |
| `GET /api/signals/strong` | Nur Signale mit Stärke >75% |
| `GET /api/signals/all` | Alle gecachten Signale |
