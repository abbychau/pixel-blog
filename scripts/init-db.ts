import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../src/lib/database';

// Ensure database directory exists
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Created database directory');
}

// Initialize database
try {
  initializeDatabase();
  console.log('Database initialization completed successfully');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}