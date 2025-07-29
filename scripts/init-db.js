const fs = require('fs');
const path = require('path');

// Ensure database directory exists
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Import and initialize database
const { initializeDatabase } = require('../src/lib/database.ts');
initializeDatabase();