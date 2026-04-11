import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sql = `CREATE TABLE IF NOT EXISTS \`scan_signals\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`symbol\` varchar(20) NOT NULL,
  \`interval\` varchar(10) NOT NULL,
  \`signal\` varchar(10) NOT NULL,
  \`strength\` int NOT NULL DEFAULT 0,
  \`currentPrice\` text NOT NULL,
  \`rsi\` text NOT NULL,
  \`ema12\` text NOT NULL,
  \`ema26\` text NOT NULL,
  \`status\` enum('PENDING','EXECUTED','IGNORED') NOT NULL DEFAULT 'PENDING',
  \`note\` text,
  \`scannedAt\` timestamp NOT NULL DEFAULT (now()),
  \`actionAt\` timestamp,
  CONSTRAINT \`scan_signals_id\` PRIMARY KEY(\`id\`)
)`;

try {
  await conn.execute(sql);
  console.log('✅ scan_signals Tabelle erfolgreich erstellt');
} catch(e) {
  if (e.code === 'ER_TABLE_EXISTS_ERROR') {
    console.log('ℹ️  scan_signals Tabelle existiert bereits');
  } else {
    console.error('❌ Fehler:', e.message);
  }
}
await conn.end();
