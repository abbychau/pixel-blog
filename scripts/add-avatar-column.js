#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Path to the database
const dbPath = path.join(__dirname, '..', 'database', 'blog.db');

console.log('Connecting to database:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check if avatar column exists
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasAvatarColumn = tableInfo.some(column => column.name === 'avatar');
  
  if (hasAvatarColumn) {
    console.log('✅ Avatar column already exists in users table');
  } else {
    console.log('📝 Adding avatar column to users table...');
    db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
    console.log('✅ Avatar column added successfully');
  }
  
  // Verify the column was added
  const updatedTableInfo = db.prepare("PRAGMA table_info(users)").all();
  console.log('\n📋 Current users table schema:');
  updatedTableInfo.forEach(column => {
    console.log(`  ${column.name}: ${column.type}${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ` DEFAULT ${column.dflt_value}` : ''}`);
  });
  
  db.close();
  console.log('\n🎉 Migration completed successfully');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}