import { ensureInitialized } from './database';

// Global singleton to ensure initialization only happens once per process
let hasInitialized = false;

// Initialize database on startup - but skip during build
if (!hasInitialized && process.env.NODE_ENV !== 'production') {
  try {
    ensureInitialized();
    console.log('✅ Database initialized on startup');
    hasInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize database on startup:', error);
    // Don't throw during build - just log the error
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }
}