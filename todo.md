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
- [x] Backend: detectRSIDivergence() Funktion implementieren (Bullish/Bearish)
- [x] Backend: Divergenz-Logik in processClosedCandle integrieren
- [x] Backend: Signal-Stärke um +20% boosten bei erkannter Divergenz
- [x] Backend: Divergenz-Daten in scan_signals speichern (neue Spalten)
- [x] Vitest: Tests für Divergenz-Erkennung (Bullish/Bearish Szenarien)

### 2. Multi-Timeframe Confluence
- [x] Backend: Multi-Timeframe Scanner erweitern (5m, 15m, 1h Daten sammeln)
- [x] Backend: Confluence-Check: Signal nur "STRONG" wenn ≥2 Timeframes konfluent
- [x] Backend: Confluence-Bonus: +15% Stärke bei 2 Timeframes, +25% bei 3 Timeframes
- [x] Backend: Confluence-Status in scan_signals speichern
- [x] Vitest: Tests für Confluence-Logik (2/3 Timeframe Szenarien)

### 3. Trailing Stop Loss
- [x] Drizzle: trades Tabelle erweitern (trailingStopLevel, trailingStopStatus)
- [x] Backend: Trailing Stop Logik implementieren (+5% → Break-Even, +10% → +5%)
- [x] Backend: Trade-Close-Monitor um Trailing-Stop-Prüfung erweitern
- [x] Backend: Trailing-Stop-Werte in Supabase speichern und aktualisieren
- [x] Vitest: Tests für Trailing-Stop-Logik (Profit-Szenarien)

### 4. UI erweitern
- [x] Frontend: SignalCard erweitern um Divergenz-Badge (Bullish/Bearish)
- [x] Frontend: Confluence-Status anzeigen (2/3 Timeframes ✓)
- [x] Frontend: Trailing-Stop-Status in TradeCard anzeigen
- [x] Frontend: Divergenz + Confluence in Signal-Stärke-Berechnung visualisieren
- [x] Frontend: Tooltip für Divergenz/Confluence erklären

### 5. Supabase-Stabilität & Tests
- [x] Backend: Supabase Connection Pool überprüfen
- [x] Backend: Retry-Logik für Trailing-Stop-Updates
- [x] Backend: Error-Handling für Divergenz/Confluence Speicherung
- [x] Vitest: Integration Tests (Divergenz + Confluence + Trailing-Stop)
- [x] Vitest: Supabase Mock-Tests für Daten-Persistierung
- [x] npm test: Alle Tests bestanden (Ziel: 50+)

### 6. GitHub Push & Checkpoint
- [x] Git: Alle Änderungen committen
- [x] Git: Push zu user_github/main
- [x] Checkpoint: Phase 2 Implementierung speichern
- [x] Dokumentation: PHASE2_GUIDE.md erstellen


## Phase 3: Trading Hub & Connection Manager

### 1. Drizzle-Schema
- [x] user_connections Tabelle: id, userId, exchange, apiKey (encrypted), apiSecret (encrypted), webhookUrl, status, createdAt
- [x] trading_config Tabelle: id, userId, botStatus (ON/OFF), demoMode (true/false), slippageTolerance (%), maxTradeSize (USDT), createdAt, updatedAt
- [x] Drizzle-Migration generieren und anwenden

### 2. Backend: Binance API & Encryption
- [x] npm install ccxt crypto-js
- [x] server/encryption.ts: encryptApiKey() und decryptApiKey() Funktionen
- [x] server/binance.ts: Binance-Klasse mit CCXT-Integration
- [x] server/routers.ts: tRPC Procedure für saveApiKeys (mit Verschlüsselung)
- [x] server/routers.ts: tRPC Procedure für getConnectionStatus
- [x] Vitest: Tests für Verschlüsselung und API-Verbindung

### 3. Backend: MetaTrader & Risk Management
- [x] server/webhook.ts: generateWebhookUrl() Funktion
- [x] server/risk-manager.ts: checkSlippage() und validateTradeSize()
- [x] server/routers.ts: tRPC Procedure für updateTradingConfig
- [x] server/routers.ts: tRPC Procedure für generateWebhookUrl
- [x] Vitest: Tests für Risk Management Logik

### 4. Frontend: Trading Hub Seite
- [x] client/src/pages/TradingHub.tsx: Hauptseite mit 3 Karten
- [x] client/src/components/AccountStatusCard.tsx: Account-Status Anzeige
- [x] client/src/components/ConnectionManagerCard.tsx: Binance API-Form + MetaTrader Webhook
- [x] client/src/components/MasterSwitch.tsx: Bot ON/OFF Toggle
- [x] client/src/components/TradingModeToggle.tsx: Demo/Real Mode Toggle
- [x] client/src/components/RiskSettingsForm.tsx: Slippage + Max Trade Size
- [x] App.tsx: Trading Hub als Navigator-Punkt hinzufügen

### 5. Frontend: Live Activity Log
- [x] client/src/components/ActivityLogTerminal.tsx: Terminal-Fenster mit Logs
- [x] client/src/hooks/useActivityLog.ts: Hook für Echtzeit-Log-Updates
- [x] WebSocket-Integration für Live-Logs
- [x] Styling: Schwarzer Hintergrund, grüne/rote Text-Farben

### 6. Integration & Tests
- [x] Alle Komponenten zusammenbinden
- [x] Vitest: Integration Tests (76 Tests)
- [x] Supabase-Verbindung testen
- [x] Git: Committen und zu GitHub pushen
- [x] Checkpoint speichern


## Phase 4: Vollständige Order-Execution & Sicherheits-Filter

### 1. tRPC Procedures
- [x] server/routers.ts: saveApiKeys Mutation (Binance API-Keys verschlüsselt speichern)
- [x] server/routers.ts: updateTradingConfig Mutation (Bot-Status, Demo/Real Mode, Risk Settings)
- [x] server/routers.ts: generateWebhookUrl Mutation (MetaTrader Webhook URL generieren)
- [x] server/routers.ts: getConnectionStatus Query (Verbindungsstatus prüfen)

### 2. Signal-Handler & Order-Execution
- [x] server/order-executor.ts: placeMarketOrder Funktion (CCXT + Demo-Modus)
- [x] server/order-executor.ts: validateOrderExecution (Slippage, Size, Balance)
- [x] server/scanner.ts: Signal-Handler mit placeMarketOrder Integration
- [x] server/scanner.ts: Bot-Status Check (nur Orders wenn Bot ON)

### 3. Sicherheits-Filter
- [x] server/safety-filters.ts: checkLiquidity (>50M USD 24h Volume)
- [x] server/safety-filters.ts: checkTimeFilter (keine Orders 30 Min vor Hour-Close)
- [x] server/safety-filters.ts: checkChopFilter (22:00-06:00 UTC: min 85% Strength)
- [x] server/safety-filters.ts: executeAllFilters (kombiniert alle Filter)

### 4. Live-Activity-Log
- [x] server/activity-logger.ts: logFilterCheck (Liquidität, Zeit, Chop)
- [x] server/activity-logger.ts: logOrderStatus (Pending, Executed, Failed)
- [x] client/src/hooks/useActivityLog.ts: WebSocket-Integration für Live-Updates
- [x] client/src/components/ActivityLogTerminal.tsx: Echtzeit-Log-Anzeige

### 5. Tests & Validierung
- [x] Vitest: order-executor.test.ts (placeMarketOrder, validateOrderExecution)
- [x] Vitest: safety-filters.test.ts (Liquidität, Zeit, Chop Filter)
- [x] Vitest: Integration Tests (Signal → Filter → Order)
- [x] Ziel: 100+ Tests bestanden

### 6. GitHub & Finaler Checkpoint
- [x] Git: Alle Änderungen committen
- [x] Git: Push zu user_github/main
- [x] Checkpoint: Phase 4 Implementierung speichern
- [x] Dokumentation: PHASE4_GUIDE.md erstellen


## Phase 5: Final Integration & Automation

### 1. tRPC Procedures
- [x] server/routers.ts: saveApiKeys Mutation (Binance API-Keys verschlüsselt speichern)
- [x] server/routers.ts: updateTradingConfig Mutation (Bot-Status, Demo/Real Mode)
- [x] server/routers.ts: generateWebhookUrl Mutation (MetaTrader Webhook URL)
- [x] server/routers.ts: getTradingConfig Query (Aktuelle Einstellungen laden)

### 2. Signal-Handler Integration
- [x] server/scanner.ts: Signal-Handler mit Bot-Status Check
- [x] server/scanner.ts: STRONG Signal → placeMarketOrder aufrufen
- [x] server/scanner.ts: Filter-Checks vor Order-Ausführung
- [x] server/scanner.ts: Activity-Logs für jeden Schritt

### 3. WebSocket Live-Logs
- [x] server/_core/index.ts: Socket.IO Setup für Activity-Logs
- [x] server/activity-logger.ts: Emit Activity-Logs über WebSocket
- [x] client/src/hooks/useActivityLog.ts: WebSocket-Listener implementieren
- [x] client/src/components/ActivityLogTerminal.tsx: Live-Updates anzeigen

### 4. MetaTrader Webhook
- [x] server/webhook.ts: generateWebhookUrl Funktion
- [x] server/webhook.ts: POST /api/webhook/mt5 Endpoint
- [x] server/webhook.ts: Signal-Parsing aus MQL5-Payload
- [x] Dokumentation: MQL5-Skript-Template

### 5. Demo-Durchlauf & Tests
- [x] Simulierter Signal → Filter → Order Flow im Demo-Modus
- [x] Activity-Log zeigt jeden Schritt
- [x] Integration Tests für kompletten Flow
- [x] Ziel: 120+ Tests bestanden

### 6. GitHub & Finaler Checkpoint
- [x] Git: Alle Änderungen committen
- [x] Git: Push zu user_github/main
- [x] Checkpoint: Phase 5 Final speichern
- [x] Dokumentation: PHASE5_GUIDE.md + Webhook-URL


## Bug Fixes

- [x] WebSocket Reconnect Loop: Über 1000 Reconnects, Status zeigt "Getrennt"
- [x] Exponential Backoff für Reconnect-Versuche implementieren
- [x] Connection-Pool limitieren (max 5 Reconnects pro Minute)
- [x] GitHub Push nach Fix

## Phase 6: Signal-Filterfunktion im Trading-Hub

### 1. Frontend: Filter-UI Komponenten
- [ ] client/src/components/SignalFilterPanel.tsx: Filter-Panel mit Checkboxes/Dropdowns
- [ ] Filter nach Kryptowährung (BTC, ETH, SOL, XRP)
- [ ] Filter nach Zeitrahmen (1m, 5m, 15m, 1h, 4h)
- [ ] Filter nach Signal-Typ (BUY, SELL, NEUTRAL)
- [ ] Filter nach Status (PENDING, EXECUTED, IGNORED)
- [ ] "Reset Filters" Button
- [ ] Aktive Filter als Badges anzeigen

### 2. Frontend: Integration in Trading-Hub
- [ ] TradingHub.tsx: SignalFilterPanel oben hinzufügen
- [ ] State für aktive Filter (selectedSymbols, selectedIntervals, etc.)
- [ ] Gefilterte Signale in der Liste anzeigen
- [ ] Anzahl gefilterte Signale anzeigen

### 3. Backend: Filter-Query in tRPC
- [ ] server/routers.ts: getSignals Query erweitern (Filter-Parameter)
- [ ] server/db.ts: getSignalsByFilter Helper-Funktion
- [ ] Drizzle Query mit WHERE-Clauses für Symbol, Interval, Signal, Status

### 4. Tests
- [ ] Vitest: Filter-Logik testen (einzelne und kombinierte Filter)
- [ ] Vitest: getSignalsByFilter Query testen
- [ ] Integration Tests: Frontend-Filter → Backend-Query

### 5. GitHub & Checkpoint
- [ ] Git: Alle Änderungen committen
- [ ] Git: Push zu user_github/main
- [ ] Checkpoint: Phase 6 Filterfunktion speichern

## Phase 6: Signal-Filterfunktion im Trading-Hub

### 1. Frontend: Filter-UI Komponenten
- [x] client/src/components/SignalFilterPanel.tsx: Filter-Panel mit Checkboxes/Dropdowns
- [x] Filter nach Kryptowährung (BTC, ETH, SOL, XRP)
- [x] Filter nach Zeitrahmen (1m, 5m, 15m, 1h, 4h)
- [x] Filter nach Signal-Typ (BUY, SELL, NEUTRAL)
- [x] Filter nach Status (PENDING, EXECUTED, IGNORED)
- [x] "Reset Filters" Button
- [x] Aktive Filter als Badges anzeigen

### 2. Frontend: Integration in Signals-Seite
- [x] Signals.tsx: SignalFilterPanel integriert
- [x] State für aktive Filter (selectedSymbols, selectedIntervals, etc.)
- [x] Gefilterte Signale in der Liste anzeigen
- [x] Anzahl gefilterte Signale anzeigen

### 3. Backend: Filter-Query in tRPC
- [x] server/routers.ts: signals.filtered Query hinzugefügt (Filter-Parameter)
- [x] server/db.ts: getSignalsByFilter Helper-Funktion
- [x] Drizzle Query mit WHERE-Clauses für Symbol, Interval, Signal, Status

### 4. Tests
- [x] Vitest: Filter-Logik testen (einzelne und kombinierte Filter) - 10 Tests
- [x] Vitest: getSignalsByFilter Query testen
- [x] Integration Tests: Frontend-Filter → Backend-Query
- [x] 131/132 Tests bestanden

### 5. GitHub & Checkpoint
- [ ] Git: Alle Änderungen committen
- [ ] Git: Push zu user_github/main
- [ ] Checkpoint: Phase 6 Filterfunktion speichern


## Phase 7: Performance-Optimierung — Datenbank-Level Filtering

### 1. Backend: Drizzle Query Optimierung
- [ ] server/db.ts: getSignalsByFilter erweitern mit WHERE-Clauses
- [ ] Drizzle: .where() für symbol, interval, signal, status
- [ ] Drizzle: .limit() und .offset() für Pagination
- [ ] Drizzle: .orderBy() für sortierte Ergebnisse
- [ ] Datenbank-Indizes für häufig gefilterte Spalten prüfen

### 2. Backend: tRPC Query Optimierung
- [ ] server/routers.ts: signals.filtered Query erweitern
- [ ] Filter-Parameter an getSignalsByFilter weitergeben
- [ ] Response-Größe reduzieren (nur benötigte Spalten)
- [ ] Pagination-Support hinzufügen (limit, offset)

### 3. Frontend: Query-Optimierung
- [ ] client/src/pages/Signals.tsx: trpc.signals.filtered statt trpc.signals.list
- [ ] Filter-Parameter an tRPC Query übergeben
- [ ] Pagination implementieren (Load More / Infinite Scroll)
- [ ] Query-Caching mit React Query optimieren

### 4. Frontend: ScannerSignals Komponente
- [ ] ScannerSignals: Nur gefilterte Daten vom Backend laden
- [ ] Entfernen: Frontend-seitige Filterung
- [ ] Loading-State für Datenbank-Abfrage
- [ ] Error-Handling für Datenbank-Fehler

### 5. Performance-Tests
- [ ] Vitest: getSignalsByFilter mit verschiedenen Filtern testen
- [ ] Vitest: Query-Performance mit 1000+ Signalen testen
- [ ] Benchmark: Frontend-Filterung vs. Datenbank-Filterung
- [ ] Load-Test: Mehrere gleichzeitige Benutzer mit Filtern

### 6. GitHub & Checkpoint
- [ ] Git: Alle Änderungen committen
- [ ] Git: Push zu user_github/main
- [ ] Checkpoint: Phase 7 Performance-Optimierung speichern


## Phase 8: Pagination für große Datenmengen (ABGESCHLOSSEN)

### 1. Backend: Drizzle Query mit Pagination
- [x] server/db.ts: getSignalsByFilter erweitern mit offset/limit
- [x] Pagination-Parameter: page, pageSize (default 50)
- [x] Berechne offset = (page - 1) * pageSize
- [x] Rückgabe: { signals, total, page, pageSize, totalPages }
- [x] Vitest: Pagination-Tests für verschiedene Seiten

### 2. Backend: tRPC Query mit Pagination
- [x] server/routers.ts: signals.filtered Query erweitern
- [x] Pagination-Input: page, pageSize
- [x] Response-Type: { data: ScanSignal[], pagination: { total, page, pageSize, totalPages } }
- [x] Vitest: tRPC Pagination Query Tests

### 3. Frontend: Pagination UI Komponenten
- [x] client/src/components/PaginationControls.tsx: Neue Komponente
- [x] Buttons: Previous, Next, First, Last
- [x] Seiten-Anzeige: "Seite 1 von 10"
- [x] Seitengröße-Selector: 25, 50, 100, 200 Signale pro Seite
- [x] Disabled-State für erste/letzte Seite
- [x] Responsive Design für Mobile

### 4. Frontend: ScannerSignals Integration
- [x] ScannerSignals: Pagination-State (page, pageSize)
- [x] Nutze trpc.signals.filtered mit page/pageSize
- [x] Zeige Pagination-Controls unten in der Liste
- [x] "Lade mehr" Button als Alternative zu Pagination
- [x] Loading-State während Seite lädt

### 5. Frontend: Infinite Scroll (Optional)
- [ ] client/src/hooks/useInfiniteScroll.ts: Hook für Infinite Scroll
- [ ] Automatisches Laden nächster Seite beim Scrollen
- [ ] Loading-Indicator beim Laden
- [ ] "Keine weiteren Signale" Nachricht

### 6. Performance & Tests
- [x] Vitest: Pagination-Tests (erste, mittlere, letzte Seite) - 21 neue Tests
- [x] Vitest: Seitengröße-Wechsel Tests
- [x] Vitest: Kombinierte Filter + Pagination Tests
- [x] Benchmark: Ladezeit mit/ohne Pagination
- [x] Load-Test: 10.000+ Signale mit Pagination
- [x] 167/167 Tests bestanden

### 7. GitHub & Checkpoint
- [x] Git: Alle Änderungen committen
- [x] Git: Push zu user_github/main
- [x] Checkpoint: Phase 8 Pagination speichern


## Phase 9: Trade-Persistierung Bug Fix

- [ ] Bug: Trades werden nicht persistent gespeichert (resetten beim Schließen der App)
- [ ] Überprüfe: Wo werden Trades aktuell gespeichert (LocalStorage vs. Datenbank)?
- [ ] Überprüfe: Sind tRPC Mutations für Trade-Speicherung vorhanden?
- [ ] Überprüfe: Wird die Datenbank-Verbindung korrekt initialisiert?
- [ ] Fix: Stelle sicher, dass alle Trades in Supabase/Datenbank gespeichert werden
- [ ] Fix: Implementiere automatische Synchronisierung beim Erstellen eines Trades
- [ ] Fix: Überprüfe, dass Trades beim App-Reload aus der Datenbank geladen werden
- [ ] Test: Erstelle einen Trade, schließe die App, öffne sie wieder → Trade sollte noch da sein
- [ ] Test: Vitest Tests für Trade-Persistierung schreiben
- [ ] GitHub: Alle Änderungen committen und zu Aibot Repository pushen


## Phase 9: Trade-Persistierung (ABGESCHLOSSEN)

### 1. Backend: Trade-Datenbank-Funktionen
- [x] server/db.ts: saveTrade() Funktion implementiert
- [x] server/db.ts: updateTrade() Funktion implementiert
- [x] server/db.ts: getUserTrades() Funktion implementiert
- [x] server/db.ts: getActiveTrades() Funktion implementiert
- [x] server/db.ts: getTradeById() Funktion implementiert

### 2. Backend: tRPC Trades Router
- [x] server/routers.ts: trades.save Mutation (neuen Trade speichern)
- [x] server/routers.ts: trades.update Mutation (Trade aktualisieren)
- [x] server/routers.ts: trades.list Query (alle Trades laden)
- [x] server/routers.ts: trades.active Query (aktive Trades laden)

### 3. Frontend: Trade-Persistierungs-Hook
- [x] client/src/hooks/useTradesWithPersistence.ts: Neuer Hook mit tRPC-Integration
- [x] Hook lädt Trades aus Datenbank beim Start
- [x] Hook speichert neue Trades über tRPC
- [x] Hook aktualisiert Trades beim Close über tRPC
- [x] Fallback auf LocalStorage wenn tRPC nicht verfügbar

### 4. Integration & Tests
- [x] Alle 167 Tests bestanden
- [x] tRPC Trades-Mutations funktionieren
- [x] Datenbank-Funktionen getestet
- [x] Trade-Persistierung funktioniert end-to-end

### 5. GitHub & Checkpoint
- [ ] Git: Alle Änderungen committen
- [ ] Git: Push zu Aibot Repository (main branch)
- [ ] Checkpoint: Phase 9 Trade-Persistierung speichern


## Phase 10: Railway Status Monitoring (ABGESCHLOSSEN)

### 1. Backend: Health Check & Monitoring
- [x] server/health.ts: getSystemHealth() Funktion (CPU, Memory, Uptime)
- [x] server/health.ts: getErrorLogs() Funktion (letzte Fehler aus Logs)
- [x] server/health.ts: getDatabaseStatus() Funktion (Datenbankverbindung prüfen)
- [x] server/health.ts: getWebSocketStatus() Funktion (Scanner WebSocket Status)
- [x] server/routers.ts: health.system Query (System-Metriken)
- [x] server/routers.ts: health.errors Query (Fehler-Log)
- [x] server/routers.ts: health.database Query (Datenbankstatus)
- [x] server/routers.ts: health.websocket Query (WebSocket-Status)

### 2. Frontend: Status Dashboard Komponente
- [x] client/src/components/RailwayStatusDashboard.tsx: Haupt-Komponente (alle Metriken in einer Komponente)
- [x] HealthMetricsCard: System-Metriken anzeigen (integriert in Dashboard)
- [x] ErrorLogViewer: Fehler-Log anzeigen (integriert in Dashboard)
- [x] DatabaseStatusCard: Datenbankstatus anzeigen (integriert in Dashboard)
- [x] WebSocketStatusCard: WebSocket-Status anzeigen (integriert in Dashboard)
- [x] Styling: Terminal-ähnliches Design mit Grün/Rot-Farben

### 3. Frontend: Status Page Integration
- [x] client/src/pages/Status.tsx: Neue Status-Seite
- [x] App.tsx: Link zu Status-Seite hinzufügen
- [x] Navigation: Status-Link in Hauptmenü
- [x] Auto-Refresh: Status alle 5 Sekunden aktualisieren (Auto-Refresh Toggle)

### 4. Metriken & Monitoring
- [x] Uptime: Sekunden seit Server-Start (formatiert: Xd Xh Xm)
- [x] Memory: Aktuelle Nutzung vs. Max mit Progress-Bar
- [x] CPU: Durchschnittliche Last und Cores
- [x] Database: Verbindungsstatus, Query-Fehler, Latenz
- [x] WebSocket: Verbindungsstatus, Reconnects, Messages/min
- [x] Fehler: Letzte 10 Fehler mit Timestamps und Log-Level

### 5. Tests & Validierung
- [x] Vitest: health.test.ts (13 Tests für alle Funktionen)
- [x] Vitest: getSystemHealth, getDatabaseStatus, getWebSocketStatus, Error Logging, WebSocket Tracking
- [x] Ziel: 180+ Tests bestanden (13 neue Health-Tests)

### 6. GitHub & Checkpoint
- [x] Git: Alle Änderungen committen
- [x] Git: Push zu Aibot Repository
- [x] Checkpoint: Phase 10 Railway Status Monitoring speichern
