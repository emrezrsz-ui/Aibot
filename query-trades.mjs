import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: 'crypto_signals',
});

// Trades abrufen
const [trades] = await connection.execute(`
  SELECT 
    id, symbol, type, entry_price, stop_loss, take_profit, 
    strength, timeframe, status, close_reason, close_price, 
    opened_at, closed_at
  FROM trades
  WHERE status = 'CLOSED'
  ORDER BY closed_at DESC
  LIMIT 1000
`);

console.log(JSON.stringify(trades, null, 2));
connection.end();
