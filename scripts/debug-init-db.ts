#!/usr/bin/env tsx

/**
 * Debug script to manually initialize the database
 * 
 * Usage:
 *   npm run debug:init-db
 *   or
 *   npx tsx scripts/debug-init-db.ts
 */

import { initializeDatabase } from '../src/lib/database';

console.log('🔧 Manual database initialization started...');

try {
  initializeDatabase();
  console.log('✅ Database initialized successfully!');
  console.log('📋 Tables created and ready for use');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

console.log('🎉 Manual initialization completed');