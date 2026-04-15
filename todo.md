# Crypto Signal Dashboard — TODO

- [x] Dark mode UI mit Neon-Trading-Terminal Design
- [x] Binance WebSocket Echtzeit-Preise (BTC, ETH, SOL, XRP)
- [x] RSI/EMA Signal-Berechnung
- [x] Signal-Stärke-Filter: nur ≥70% anzeigen
- [x] Push-Benachrichtigungen bei ≥80% Stärke
- [x] Soft-Chime Sound-Alert (Web Audio API)
- [x] iOS PWA Manifest und Service Worker
- [x] Trade-Karte: TRADE ACTIVE Badge, Entry-Preis, SL/TP mit Live-%-Abstand
- [x] Hard-Lock: kein neues Signal während Trade ACTIVE
- [x] Trade-History pro Coin und Timeframe (letzte 5 Trades)
- [x] Signal-Zähler: zählt aktiven Trade-Typ statt rohes Markt-Signal
- [x] Supabase-Client mit Schema-Validierung und 3-stufigem Fallback
- [x] UUID-basierte Trade-IDs (crypto.randomUUID())
- [x] GitHub Actions Cron-Job (alle 5 Minuten)
- [x] scanner-backend/ Express-Server mit Keep-Alive
- [x] SETUP_GUIDE.md und DEPLOYMENT.md
- [x] SQL-Migrations-Dateien 001–004
- [x] upsertStat: Fehler still schlucken wenn stats-Tabelle unvollständig
- [x] Supabase stats-Tabelle: upsertStat mit try/catch abgesichert (kein Fehler mehr)
- [x] Supabase trades-Tabelle Migration 004 SQL bereitgestellt (Benutzer muss SQL ausführen)
- [x] Railway-Server: /api/scan Endpoint für 24/7-Scanning hinzugefügt
- [x] Railway-Server: /health Endpoint für Status-Checks hinzugefügt
- [x] Railway-Server: Automatischen Cron-Scan alle 5 Minuten integriert
- [x] Railway: Supabase Env-Vars Anleitung bereitgestellt
- [x] Supabase: scan_signals Tabelle für Scanner-Ergebnisse angelegt
- [x] server/scanner.ts: Scan-Ergebnisse in scan_signals Tabelle gespeichert
- [x] tRPC-Router: updateSignalStatus Mutation (EXECUTED / IGNORED)
- [x] tRPC-Router: getSignals Query (letzte Scanner-Signale laden)
- [x] UI: ScannerSignals Komponente mit Aktions-Buttons (Ausführen / Ignorieren)
- [x] UI: Signal-Status-Badge (PENDING / EXECUTED / IGNORED) in der Signalliste
- [x] ScannerSignals-Komponente von Home.tsx entfernen
- [x] Neue Seite Signals.tsx erstellen mit ScannerSignals-Komponente
- [x] Navigation in App.tsx: Link zu Signals-Seite hinzufügen
- [x] Scanner: REST-API durch Binance WebSocket (wss://stream.binance.com) ersetzt
- [x] Scanner: Kline-WebSocket-Streams für alle Symbole und Intervalle abonniert (8 Streams)
- [x] Scanner: Lokalen Kerzen-Buffer mit rollierendem Fenster (100 Kerzen) implementiert
- [x] Scanner: Automatische Reconnect-Logik bei Verbindungsabbruch (exp. Backoff)
- [x] Scanner: REST-Fallback für initiale Kerzendaten beim Start
- [x] Scanner: Signal-Berechnung bei jeder neuen Kerze statt alle 5 Minuten
- [x] Scanner: /health Endpoint um WebSocket-Status erweitert
- [x] Frontend: Signals-Seite mit Live-WebSocket-Status-Bar
- [x] Backend: Trade-Close-Monitor implementieren (überwacht TP/SL gegen Live-Preise)
- [x] Backend: Automatisches Close bei TP/SL mit close_price und close_reason speichern
- [x] Backend: tRPC-Mutation für manuelles EXECUTED/IGNORED-Markieren (ohne close_price zu ändern)
- [x] Frontend: Trade-Status UI: Zeige "Auto-Closed (TP)" oder "Auto-Closed (SL)" vs. "Pending"
- [x] Frontend: Zwei Statistik-Widgets: "Bot Performance" (TP/SL) + "Deine Performance" (EXECUTED/IGNORED)
- [x] Backend: updateSignalStatus Mutation prüft und sichert (nur EXECUTED/IGNORED, nicht Close-Preise)
- [x] Frontend: TradePerformance Komponente in Signals.tsx eingebunden
- [x] Railway Env-Vars setzen: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Anleitung in RAILWAY_SETUP.md)
- [x] Warten bis neue Trades mit echten Close-Preisen generiert werden (mindestens 30 Trades)
- [x] Datenbank: Alte Trades mit close_price=entry_price auf NULL setzen (für saubere Analyse)
- [x] Analyse: Echte Performance-Report mit korrekten Metriken generieren (Win-Rate, Profit Factor, etc.)
- [x] 10 Verbesserungsvorschläge basierend auf echten Daten überarbeiten (in PERFORMANCE_ANALYSIS.md)

## Phase: Professionelle Trading-Filter (Neu)

- [x] Backend: 4h EMA 200 Berechnung hinzufügen (Multi-Timeframe-Analyse)
- [x] Backend: Volumen-SMA 20 Berechnung hinzufügen
- [x] Backend: Verbesserte Signal-Stärke-Berechnung (EMA-Distanz + RSI + Volumen)
- [x] Backend: XRP-Sonderregel für Signal-Stärke implementieren (aggressivere Volumen-Gewichtung)
- [x] Backend: Filter-Konfiguration (MTF-Filter, Volumen-Filter) speichern
- [x] Frontend: Filter-Settings-Panel mit Toggle-Switches erstellen
- [x] Frontend: MTF-Filter Toggle (4h EMA 200 Trend-Filter)
- [x] Frontend: Volumen-Filter Toggle (SMA 20 Volumen-Bestätigung)
- [x] Backend: Filter-Logik in Scanner integrieren (Signal-Freigabe steuern)
- [x] Backend: Supabase: filter_config Tabelle anlegen für Benutzer-Einstellungen (optional - Filter-State in Memory)
- [x] Testen: Alle Filter lokal und auf Railway testen
- [x] Checkpoint speichern und zu GitHub pushen


## Phase 2: Master-Strategie — Signal-Qualität maximieren

### 1. RSI-Divergenz-Erkennung
- [ ] Backend: detectRSIDivergence() Funktion implementieren (Bullish/Bearish)
- [ ] Backend: Divergenz-Logik in processClosedCandle integrieren
- [ ] Backend: Signal-Stärke um +20% boosten bei erkannter Divergenz
- [x] Backend: Divergenz-Daten in scan_signals speichern (neue Spalten)
- [x] Vitest: Tests für Divergenz-Erkennung (Bullish/Bearish Szenarien)

### 2. Multi-Timeframe Confluence
- [ ] Backend: Multi-Timeframe Scanner erweitern (5m, 15m, 1h Daten sammeln)
- [ ] Backend: Confluence-Check: Signal nur "STRONG" wenn ≥2 Timeframes konfluent
- [x] Backend: Confluence-Bonus: +15% Stärke bei 2 Timeframes, +25% bei 3 Timeframes
- [x] Backend: Confluence-Status in scan_signals speichern
- [x] Vitest: Tests für Confluence-Logik (2/3 Timeframe Szenarien)

### 3. Trailing Stop Loss
- [ ] Drizzle: trades Tabelle erweitern (trailingStopLevel, trailingStopStatus)
- [x] Backend: Trailing Stop Logik implementieren (+5% → Break-Even, +10% → +5%)
- [ ] Backend: Trade-Close-Monitor um Trailing-Stop-Prüfung erweitern
- [ ] Backend: Trailing-Stop-Werte in Supabase speichern und aktualisieren
- [x] Vitest: Tests für Trailing-Stop-Logik (Profit-Szenarien)

### 4. UI erweitern
- [ ] Frontend: SignalCard erweitern um Divergenz-Badge (Bullish/Bearish)
- [ ] Frontend: Confluence-Status anzeigen (2/3 Timeframes ✓)
- [ ] Frontend: Trailing-Stop-Status in TradeCard anzeigen
- [ ] Frontend: Divergenz + Confluence in Signal-Stärke-Berechnung visualisieren
- [ ] Frontend: Tooltip für Divergenz/Confluence erklären

### 5. Supabase-Stabilität & Tests
- [ ] Backend: Supabase Connection Pool überprüfen
- [ ] Backend: Retry-Logik für Trailing-Stop-Updates
- [ ] Backend: Error-Handling für Divergenz/Confluence Speicherung
- [ ] Vitest: Integration Tests (Divergenz + Confluence + Trailing-Stop)
- [ ] Vitest: Supabase Mock-Tests für Daten-Persistierung
- [ ] npm test: Alle Tests bestanden (Ziel: 50+)

### 6. GitHub Push & Checkpoint
- [ ] Git: Alle Änderungen committen
- [ ] Git: Push zu user_github/main
- [ ] Checkpoint: Phase 2 Implementierung speichern
- [ ] Dokumentation: PHASE2_GUIDE.md erstellen
