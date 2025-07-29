const Database = require('better-sqlite3');
const path = require('path');

console.log('=== DATABASE INITIALIZATION TEST ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PHASE:', process.env.NEXT_PHASE);

try {
  const dbPath = path.join(process.cwd(), 'database', 'blog.db');
  console.log('Database path:', dbPath);
  
  const db = new Database(dbPath);
  console.log('✅ Database connection successful');
  
  // Test a simple query
  const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Users count:', result.count);
  
  // Test system settings table
  const settings = db.prepare('SELECT * FROM system_settings WHERE key = ?').get('currency_daily_login_bonus');
  console.log('Daily bonus setting:', settings);
  
  db.close();
  console.log('✅ Database test completed successfully');
} catch (error) {
  console.error('❌ Database test failed:', error.message);
  console.error(error.stack);
}