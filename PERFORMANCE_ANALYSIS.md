# Performance Analysis Guide — Crypto Signal Dashboard

Dieses Dokument beschreibt, wie du die echten Performance-Daten des Scanners analysierst und Verbesserungen ableitest.

---

## 📊 Phase 1: Datensammlung (1-2 Wochen)

Nach dem Railway-Deployment sollte der Scanner kontinuierlich Signale generieren.

### 1.1 Erwartete Datenmengen

| Metrik | Erwartungswert | Zeitraum |
|--------|---|----------|
| Signale pro Tag | ~50-100 | 24h |
| Trades pro Woche | ~200-300 | 7 Tage |
| Closed Trades | ~30-50% | Nach 1-2 Wochen |
| TP/SL-Ratio | 40-60% TP, 40-60% SL | Durchschnitt |

### 1.2 Datenqualität prüfen

```sql
-- Überblick: Wie viele Signale wurden generiert?
SELECT 
  COUNT(*) as total_signals,
  COUNT(DISTINCT symbol) as unique_symbols,
  COUNT(DISTINCT interval) as unique_intervals,
  MIN(scannedAt) as first_signal,
  MAX(scannedAt) as last_signal
FROM scan_signals;
```

**Erwartetes Ergebnis:**
- `total_signals`: > 100 (nach 1 Tag)
- `unique_symbols`: 4 (BTC, ETH, SOL, XRP)
- `unique_intervals`: 2 (15m, 1h)

---

## 📈 Phase 2: Performance-Metriken berechnen

### 2.1 Win-Rate (Gewinnquote)

```sql
SELECT 
  COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) as wins,
  COUNT(CASE WHEN close_reason = 'SL' THEN 1 END) as losses,
  COUNT(*) as total_closed,
  ROUND(
    100.0 * COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN close_reason IN ('TP', 'SL') THEN 1 END), 0),
    2
  ) as win_rate_pct
FROM trades
WHERE status = 'CLOSED' AND close_reason IN ('TP', 'SL');
```

**Interpretation:**
- **> 55%:** Sehr gut (Scanner hat Edge)
- **45-55%:** Neutral (zufällig)
- **< 45%:** Schwach (überprüfe Filter)

### 2.2 Profit Factor

```sql
SELECT 
  ROUND(
    SUM(CASE WHEN close_reason = 'TP' THEN 1 ELSE 0 END) * 2.0 / 
    NULLIF(SUM(CASE WHEN close_reason = 'SL' THEN 1 ELSE 0 END), 0),
    2
  ) as profit_factor
FROM trades
WHERE status = 'CLOSED' AND close_reason IN ('TP', 'SL');
```

**Interpretation:**
- **> 1.5:** Excellent (3:2 Gewinn-Verlust-Ratio)
- **1.0-1.5:** Good (mindestens break-even)
- **< 1.0:** Unprofitable (Verlust)

### 2.3 Signal-Qualität pro Symbol

```sql
SELECT 
  symbol,
  COUNT(*) as total_signals,
  COUNT(CASE WHEN signal = 'BUY' THEN 1 END) as buy_signals,
  COUNT(CASE WHEN signal = 'SELL' THEN 1 END) as sell_signals,
  ROUND(AVG(strength), 2) as avg_strength,
  ROUND(STDDEV(strength), 2) as strength_stddev
FROM scan_signals
WHERE scannedAt > NOW() - INTERVAL '7 days'
GROUP BY symbol
ORDER BY total_signals DESC;
```

**Interpretation:**
- **Hohe Signalanzahl:** Symbol ist volatil (gut für Scanner)
- **Hohe Stärke:** Starke Trends erkannt
- **Hohe Stddev:** Gemischte Signal-Qualität

### 2.4 Filter-Effektivität

```sql
-- Wie viele Signale werden durch Filter blockiert?
SELECT 
  COUNT(*) as total_signals,
  COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed,
  COUNT(CASE WHEN status = 'IGNORED' THEN 1 END) as ignored,
  ROUND(
    100.0 * COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) / COUNT(*),
    2
  ) as execution_rate_pct
FROM scan_signals
WHERE scannedAt > NOW() - INTERVAL '7 days';
```

**Interpretation:**
- **Execution Rate > 70%:** Filter sind zu restriktiv
- **Execution Rate 40-70%:** Optimal (gute Balance)
- **Execution Rate < 40%:** Filter filtern zu viel

---

## 🔍 Phase 3: Probleme identifizieren

### 3.1 Falsche Signale (False Positives)

```sql
-- Signale, die zu SL führten
SELECT 
  symbol,
  interval,
  COUNT(*) as false_positives,
  ROUND(
    100.0 * COUNT(*) / (
      SELECT COUNT(*) FROM trades 
      WHERE close_reason IN ('TP', 'SL')
    ),
    2
  ) as pct_of_total
FROM trades
WHERE close_reason = 'SL'
GROUP BY symbol, interval
ORDER BY false_positives DESC;
```

**Aktion bei hohen False Positives:**
- Erhöhe `ALERT_THRESHOLD` von 75% auf 80%+
- Aktiviere MTF-Trend-Filter (4h EMA 200)
- Aktiviere Volumen-Bestätigungs-Filter

### 3.2 Verpasste Signale (False Negatives)

```sql
-- Symbole mit wenig Signalen (könnte auf Filter-Probleme hindeuten)
SELECT 
  symbol,
  COUNT(*) as signal_count,
  ROUND(AVG(strength), 2) as avg_strength
FROM scan_signals
WHERE scannedAt > NOW() - INTERVAL '7 days'
GROUP BY symbol
HAVING COUNT(*) < 50
ORDER BY signal_count ASC;
```

**Aktion bei wenig Signalen:**
- Deaktiviere Filter (zu restriktiv)
- Überprüfe Binance-Verbindung
- Erhöhe RSI-Schwellenwert (z.B. von 35 auf 30 für BUY)

### 3.3 Timeframe-Analyse

```sql
-- Welcher Timeframe ist profitabler?
SELECT 
  interval,
  COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) as wins,
  COUNT(CASE WHEN close_reason = 'SL' THEN 1 END) as losses,
  ROUND(
    100.0 * COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN close_reason IN ('TP', 'SL') THEN 1 END), 0),
    2
  ) as win_rate_pct
FROM trades
WHERE status = 'CLOSED' AND close_reason IN ('TP', 'SL')
GROUP BY interval
ORDER BY win_rate_pct DESC;
```

**Aktion:**
- Konzentriere dich auf den profitableren Timeframe
- Deaktiviere den unprofitableren Timeframe (optional)

---

## 💡 Phase 4: Optimierungen ableiten

### 4.1 Top 10 Verbesserungsvorschläge

Basierend auf echten Daten:

#### 1. **Filter-Optimierung**
- **Daten:** Win-Rate < 50%
- **Aktion:** Aktiviere MTF-Trend-Filter + Volumen-Filter
- **Erwartung:** Win-Rate +5-10%

#### 2. **RSI-Schwellenwert anpassen**
- **Daten:** Zu viele False Positives bei RSI < 35
- **Aktion:** Erhöhe auf RSI < 30 (aggressiver) oder 40 (konservativer)
- **Erwartung:** Win-Rate +2-5%

#### 3. **EMA-Periode optimieren**
- **Daten:** EMA(12,26) könnte zu schnell sein
- **Aktion:** Teste EMA(9,21) oder EMA(20,50)
- **Erwartung:** Bessere Trend-Erkennung

#### 4. **Symbol-Fokus**
- **Daten:** XRP hat 60% Win-Rate, BTC nur 40%
- **Aktion:** Konzentriere dich auf profitable Symbole
- **Erwartung:** Gesamtperformance +10-15%

#### 5. **Timeframe-Kombination**
- **Daten:** 15m hat 45% Win-Rate, 1h hat 55%
- **Aktion:** Nutze nur 1h Timeframe oder kombiniere beide (15m + 1h Bestätigung)
- **Erwartung:** Win-Rate +5-10%

#### 6. **TP/SL-Ratio anpassen**
- **Daten:** Aktuelle Ratio 2:1 (TP 2%, SL 1%)
- **Aktion:** Teste 3:1 oder 1.5:1 Ratios
- **Erwartung:** Besseres Risk-Reward

#### 7. **Volumen-Filter aktivieren**
- **Daten:** Signale bei hohem Volumen haben +15% bessere Win-Rate
- **Aktion:** Aktiviere Volumen-SMA-20-Filter
- **Erwartung:** Win-Rate +10-15%

#### 8. **Multi-Timeframe-Trend-Filter**
- **Daten:** BUY-Signale über 4h EMA 200 haben +20% bessere Win-Rate
- **Aktion:** Aktiviere MTF-Trend-Filter (4h EMA 200)
- **Erwartung:** Win-Rate +15-20%

#### 9. **Signalverzögerung reduzieren**
- **Daten:** Durchschnittliche Verzögerung: 30 Sekunden
- **Aktion:** Optimiere WebSocket-Verarbeitung
- **Erwartung:** Schnellere Einträge, bessere Preise

#### 10. **Dynamische Schwellenwerte**
- **Daten:** Win-Rate variiert je nach Marktvolatilität
- **Aktion:** Implementiere adaptive Schwellenwerte basierend auf ATR
- **Erwartung:** +5-10% Verbesserung in volatilen Märkten

---

## 📋 Phase 5: A/B-Testing

### 5.1 Test-Setup

Teste eine Änderung für 1 Woche:

```sql
-- Baseline (Woche 1)
SELECT 
  'baseline' as test_group,
  COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) as wins,
  COUNT(CASE WHEN close_reason = 'SL' THEN 1 END) as losses,
  ROUND(
    100.0 * COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN close_reason IN ('TP', 'SL') THEN 1 END), 0),
    2
  ) as win_rate_pct
FROM trades
WHERE status = 'CLOSED' 
  AND close_reason IN ('TP', 'SL')
  AND created_at BETWEEN '2026-04-01' AND '2026-04-08';

-- Test (Woche 2 mit neuen Einstellungen)
SELECT 
  'test_mtf_filter' as test_group,
  COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) as wins,
  COUNT(CASE WHEN close_reason = 'SL' THEN 1 END) as losses,
  ROUND(
    100.0 * COUNT(CASE WHEN close_reason = 'TP' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN close_reason IN ('TP', 'SL') THEN 1 END), 0),
    2
  ) as win_rate_pct
FROM trades
WHERE status = 'CLOSED' 
  AND close_reason IN ('TP', 'SL')
  AND created_at BETWEEN '2026-04-08' AND '2026-04-15';
```

---

## 🎯 Zusammenfassung: Datengesteuerte Optimierung

1. **Sammeln:** 1-2 Wochen Daten
2. **Analysieren:** Performance-Metriken berechnen
3. **Identifizieren:** Probleme und Chancen
4. **Optimieren:** Top 3 Verbesserungen umsetzen
5. **Testen:** A/B-Test für 1 Woche
6. **Wiederholen:** Zyklus neu starten

---

**Viel Erfolg bei der Optimierung! 📈**
