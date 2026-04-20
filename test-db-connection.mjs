import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing TiDB Database Connection...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('📋 Connection Details:');
  console.log(`   URL: ${databaseUrl.replace(/:[^@]*@/, ':***@').substring(0, 80)}...`);
  console.log('');

  try {
    console.log('⏳ Attempting connection with SSL...');
    
    // Parse the connection string
    const url = new URL(databaseUrl.replace('mysql://', 'mysql://'));
    
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 4000,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1) || 'mysql',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false }, // TiDB requires SSL
      enableKeepAlive: true,
    };

    console.log('🔧 Config:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   SSL: ${config.ssl}`);
    console.log('');

    const connection = await mysql.createConnection(config);
    console.log('✅ Connection successful!\n');

    // Test query
    console.log('⏳ Running test query...');
    const [results] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query successful!');
    console.log(`   Result: ${JSON.stringify(results)}\n`);

    // Get database info
    console.log('📊 Database Information:');
    const [dbInfo] = await connection.execute('SELECT DATABASE() as db, VERSION() as version');
    console.log(`   Database: ${dbInfo[0].db}`);
    console.log(`   Version: ${dbInfo[0].version}\n`);

    // List tables
    console.log('📋 Tables in database:');
    const [tables] = await connection.execute('SHOW TABLES');
    if (tables.length === 0) {
      console.log('   (No tables found)');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
    }
    console.log('');

    // Check specific tables
    console.log('🔍 Checking application tables:');
    try {
      const [scanSignals] = await connection.execute('SELECT COUNT(*) as count FROM scan_signals');
      console.log(`   ✅ scan_signals: ${scanSignals[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ scan_signals: Table not found`);
    }

    try {
      const [trades] = await connection.execute('SELECT COUNT(*) as count FROM trades');
      console.log(`   ✅ trades: ${trades[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ trades: Table not found`);
    }

    try {
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`   ✅ users: ${users[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ users: Table not found`);
    }

    console.log('');

    await connection.end();
    console.log('✅ All tests passed! Database connection is working.\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error Details:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Errno: ${error.errno}`);
    console.error('');

    if (error.message.includes('insecure transport')) {
      console.error('💡 Solution: TiDB requires SSL. Using ssl: "require" in connection config.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Suggestion: Authentication failed. Check username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Suggestion: Database does not exist. Check database name.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Suggestion: Connection refused. Check host and port.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Suggestion: Host not found. Check hostname.');
    }
    console.error('');

    process.exit(1);
  }
}

testConnection();
