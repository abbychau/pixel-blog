import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'blog.db');
export const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

let databaseInitialized = false;

// Create tables
export function initializeDatabase() {
  if (databaseInitialized) {
    console.log('[Database] Skipping initialization - already initialized');
    return;
  }
  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#ff8c00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Articles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT,
      category_id INTEGER,
      author_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (author_id) REFERENCES users (id)
    )
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      display_color TEXT DEFAULT '#ff8c00',
      currency1 INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT 1,
      last_login DATETIME,
      last_daily_claim DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table for secure authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      firebase_uid TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Category suggestions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#ff8c00',
      suggested_by INTEGER NOT NULL,
      vote_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suggested_by) REFERENCES users (id),
      UNIQUE(name, slug)
    )
  `);

  // Category suggestion votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_suggestion_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suggestion_id) REFERENCES category_suggestions (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(suggestion_id, user_id)
    )
  `);

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      original_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      url TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL,
      used_in_articles TEXT, -- JSON array of article IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )
  `);

  // Tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#00ff00',
      article_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Article tags relation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS article_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
      UNIQUE(article_id, tag_id)
    )
  `);

  // Mentions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      mentioned_user_id INTEGER NOT NULL,
      mentioned_username TEXT NOT NULL,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
      FOREIGN KEY (mentioned_user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(article_id, mentioned_user_id)
    )
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      article_id INTEGER,
      mention_id INTEGER,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
      FOREIGN KEY (mention_id) REFERENCES mentions (id) ON DELETE CASCADE
    )
  `);

  // Reactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(article_id, user_id)
    )
  `);

  // Tips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      system_fee INTEGER NOT NULL,
      net_amount INTEGER NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Insert default system settings only if none exist
  const existingSettingsCount = db.prepare('SELECT COUNT(*) as count FROM system_settings').get() as { count: number };
  
  if (existingSettingsCount.count === 0) {
    console.log('[Database] Seeding default system settings...');
    const insertSetting = db.prepare(`
      INSERT INTO system_settings (key, value, description) 
      VALUES (?, ?, ?)
    `);

    insertSetting.run('category_approval_threshold', '5', 'Number of votes needed to auto-approve a category suggestion');
    insertSetting.run('allow_category_suggestions', 'true', 'Whether non-admin users can suggest categories');
    insertSetting.run('currency_url_slug_cost', '5', 'Cost in currency to set a custom URL slug for articles');  
    insertSetting.run('currency_registration_bonus', '100', 'Amount of currency given to new users on registration');
    insertSetting.run('currency_daily_login_bonus', '30', 'Amount of currency given for daily login');
    console.log('[Database] Default system settings seeded successfully');
  } else {
    console.log('[Database] System settings already exist, skipping seeding');
  }

  // Insert default categories only if none exist
  const existingCategoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  
  if (existingCategoriesCount.count === 0) {
    console.log('[Database] Seeding default categories...');
    const insertCategory = db.prepare(`
      INSERT INTO categories (name, slug, description, color) 
      VALUES (?, ?, ?, ?)
    `);

    const defaultCategories = [
      ['Technology', 'tech', 'Technology and programming articles', '#00ff00'],
      ['Web Development', 'web', 'Web development tutorials and tips', '#0080ff'],
      ['Database', 'data', 'Database design and optimization', '#ffff00'],
      ['DevOps', 'devops', 'DevOps and infrastructure articles', '#ff8c00'],
      ['AI/ML', 'ai-ml', 'Artificial Intelligence and Machine Learning', '#ff0080'],
    ];

    defaultCategories.forEach(category => {
      insertCategory.run(...category);
    });
    console.log('[Database] Default categories seeded successfully');
  } else {
    console.log('[Database] Categories already exist, skipping seeding');
  }

  // Migration: Add author_id column if it doesn't exist
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN author_id INTEGER`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add reaction_count column if it doesn't exist
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN reaction_count INTEGER DEFAULT 0`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add display_name column if it doesn't exist
  try {
    // Migration handled by new users table structure
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add display_color column if it doesn't exist
  try {
    // Migration handled by new users table structure
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add currency1 column if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN currency1 INTEGER DEFAULT 10`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add last_login column if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add avatar column if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add is_active column if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1`);
    console.log('✅ Added is_active column to users table');
    
    // Update existing users to be active by default
    db.exec(`UPDATE users SET is_active = 1 WHERE is_active IS NULL`);
    console.log('✅ Set existing users as active');
  } catch (error) {
    // Column already exists, ignore error
    console.log('ℹ️ is_active column already exists in users table');
  }

  // Migration: Add last_daily_claim column if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_daily_claim DATETIME`);
    console.log('✅ Added last_daily_claim column to users table');
  } catch (error) {
    // Column already exists, ignore error
    console.log('ℹ️ last_daily_claim column already exists in users table');
  }

  // Migration: Update existing users to use current username as display_name and create new username
  // Migration handled by new users table structure - this code is disabled
  /* 
  const existingUsers: any[] = [];
  const updateUserStmt = null;
  
  for (const user of existingUsers) {
    if (!updateUserStmt) break; // Skip if no statement available
    
    const displayName = (user as any).username;
    // Convert display name to valid username format (a-z, 0-9, _)
    const newUsername = (user as any).username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20); // Limit length
    
    try {
      updateUserStmt.run(displayName, newUsername, (user as any).id);
    } catch (error) {
      // If username conflict, add number suffix
      let counter = 1;
      let uniqueUsername = newUsername;
      while (true) {
        try {
          uniqueUsername = `${newUsername}_${counter}`;
          updateUserStmt?.run(displayName, uniqueUsername, (user as any).id);
          break;
        } catch (error) {
          counter++;
          if (counter > 100) break; // Safety limit
        }
      }
    }
  }
  */

  // Update existing articles to have the first admin user as author
  const firstAdmin = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  if (firstAdmin) {
    db.prepare('UPDATE articles SET author_id = ? WHERE author_id IS NULL').run((firstAdmin as any).id);
  }

  // Insert sample articles (after admin user is created and migration is done)
  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (title, slug, content, excerpt, category_id, author_id, status, published_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Get the default admin user ID for sample articles  
  const adminUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  const defaultAuthorId = adminUser ? (adminUser as any).id : 1;

  const sampleArticles = [
    [
      'Getting Started with Next.js',
      'getting-started-nextjs',
      '# Getting Started with Next.js\n\nNext.js is a powerful React framework that makes building modern web applications easier...',
      'Learn the basics of Next.js and how to get started with your first project.',
      1, // Tech category
      defaultAuthorId, // Author ID
      'published',
      '2025-01-15 10:00:00'
    ],
    [
      'Building Modern Web Applications',
      'building-modern-web-apps',
      '# Building Modern Web Applications\n\nModern web development has evolved significantly...',
      'Explore the latest trends and best practices in modern web development.',
      2, // Web category
      defaultAuthorId, // Author ID
      'published',
      '2025-01-14 14:30:00'
    ],
    [
      'Database Design Patterns',
      'database-design-patterns',
      '# Database Design Patterns\n\nProper database design is crucial for scalable applications...',
      'Learn essential database design patterns for scalable applications.',
      3, // Data category
      defaultAuthorId, // Author ID
      'draft',
      null
    ],
  ];

  // Note: Sample articles disabled to prevent foreign key constraint errors
  // sampleArticles.forEach(article => {
  //   insertArticle.run(...article);
  // });

  // Set flag to prevent re-initialization
  databaseInitialized = true;
  
  // Only log during development and first initialization (not during build)
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PHASE) {
    console.log('Database initialized successfully');
  }
}


// Lazy initialization flag
let queriesInitialized = false;

// Initialize empty queries object that will be populated lazily
export const queries: any = {};

// Function to ensure database and queries are initialized
export function ensureInitialized() {
  if (!queriesInitialized) {
    try {
      console.log('[Database] Initializing database and queries...');
      initializeDatabase();
      populateQueries();
      queriesInitialized = true;
      console.log('[Database] Database and queries initialized successfully');
    } catch (error) {
      console.error('❌ [Database] Database initialization error:', error);
      console.error('❌ [Database] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      throw error; // Don't fall back to dummy queries, fail fast to identify the issue
    }
  }
}

// Create dummy queries for build context
function createDummyQueries() {
  const dummyQuery = {
    get: () => null,
    all: () => [],
    run: () => ({ lastInsertRowid: 1, changes: 0 })
  };
  
  // Add all the query methods that might be called during build
  const queryNames = [
    'getAllCategories', 'getCategoryById', 'getUserByEmail', 'getUserById', 
    'getAllArticles', 'getArticleById', 'insertUser', 'updateUser',
    'getSessionByToken', 'insertSession', 'deleteSession'
  ];
  
  queryNames.forEach(name => {
    queries[name] = dummyQuery;
  });
}

// Function to populate queries after database is initialized
function populateQueries() {
  Object.assign(queries, {
  // Categories
  getAllCategories: db.prepare('SELECT * FROM categories ORDER BY name'),
  getCategoryById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  getCategoryBySlug: db.prepare('SELECT * FROM categories WHERE slug = ?'),
  insertCategory: db.prepare(`
    INSERT INTO categories (name, slug, description, color) 
    VALUES (?, ?, ?, ?)
  `),
  updateCategory: db.prepare(`
    UPDATE categories 
    SET name = ?, slug = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  deleteCategory: db.prepare('DELETE FROM categories WHERE id = ?'),

  // Articles
  getAllArticles: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC
  `),
  getAllArticlesForListing: db.prepare(`
    SELECT a.id, a.title, a.slug, a.excerpt, a.category_id, a.author_id, a.status, a.published_at, a.created_at, a.updated_at, a.reaction_count,
           c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `),
  getPublishedArticles: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC
  `),
  getPublishedArticlesForListing: db.prepare(`
    SELECT a.id, a.title, a.slug, a.excerpt, a.category_id, a.author_id, a.status, a.published_at, a.created_at, a.updated_at, a.reaction_count,
           c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC
    LIMIT ?
  `),
  getArticleById: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `),
  getArticleBySlug: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.slug = ?
  `),
  getArticlesByAuthor: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.author_id = ? AND a.status = 'published'
    ORDER BY a.published_at DESC
  `),
  getArticlesByAuthorForListing: db.prepare(`
    SELECT a.id, a.title, a.slug, a.excerpt, a.category_id, a.author_id, a.status, a.published_at, a.created_at, a.updated_at, a.reaction_count,
           c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.author_id = ?
    ORDER BY a.created_at DESC
    LIMIT ?
  `),
  insertArticle: db.prepare(`
    INSERT INTO articles (title, slug, content, excerpt, category_id, author_id, status, published_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateArticle: db.prepare(`
    UPDATE articles 
    SET title = ?, slug = ?, content = ?, excerpt = ?, category_id = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  deleteArticle: db.prepare('DELETE FROM articles WHERE id = ?'),

  // Users
  getAllUsers: db.prepare('SELECT id, username, display_name, email, role, display_color, currency1, avatar, is_active, last_login, created_at FROM users ORDER BY created_at DESC'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  insertUser: db.prepare(`
    INSERT INTO users (username, display_name, email, role, currency1, is_active) 
    VALUES (?, ?, ?, ?, ?, 1)
  `),
  updateUserProfile: db.prepare(`
    UPDATE users 
    SET display_name = ?, display_color = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  updateUserAvatar: db.prepare(`
    UPDATE users 
    SET avatar = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  updateUserCurrency: db.prepare(`
    UPDATE users 
    SET currency1 = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  updateUserLastLogin: db.prepare(`
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),

  // Sessions
  createSession: db.prepare(`
    INSERT INTO sessions (id, user_id, firebase_uid, expires_at)
    VALUES (?, ?, ?, ?)
  `),
  getSession: db.prepare(`
    SELECT s.*, u.id as user_id, u.username, u.display_name, u.email, u.role, u.display_color, u.currency1, u.avatar, u.last_login
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `),
  updateSessionLastUsed: db.prepare(`
    UPDATE sessions 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),

  // Category suggestions
  getAllCategorySuggestions: db.prepare(`
    SELECT cs.*, u.username as suggested_by_name 
    FROM category_suggestions cs
    LEFT JOIN users u ON cs.suggested_by = u.id
    ORDER BY cs.vote_count DESC, cs.created_at DESC
  `),
  getCategorySuggestionById: db.prepare('SELECT * FROM category_suggestions WHERE id = ?'),
  getCategorySuggestionByName: db.prepare('SELECT * FROM category_suggestions WHERE name = ? OR slug = ?'),
  insertCategorySuggestion: db.prepare(`
    INSERT INTO category_suggestions (name, slug, description, color, suggested_by, vote_count) 
    VALUES (?, ?, ?, ?, ?, 1)
  `),
  updateCategorySuggestionVotes: db.prepare(`
    UPDATE category_suggestions 
    SET vote_count = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  updateCategorySuggestionStatus: db.prepare(`
    UPDATE category_suggestions 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  deleteCategorySuggestion: db.prepare('DELETE FROM category_suggestions WHERE id = ?'),

  // Category suggestion votes
  getCategorySuggestionVote: db.prepare('SELECT * FROM category_suggestion_votes WHERE suggestion_id = ? AND user_id = ?'),
  insertCategorySuggestionVote: db.prepare(`
    INSERT INTO category_suggestion_votes (suggestion_id, user_id) 
    VALUES (?, ?)
  `),
  deleteCategorySuggestionVote: db.prepare('DELETE FROM category_suggestion_votes WHERE suggestion_id = ? AND user_id = ?'),
  getCategorySuggestionVoteCount: db.prepare('SELECT COUNT(*) as count FROM category_suggestion_votes WHERE suggestion_id = ?'),

  // System settings
  getSystemSetting: db.prepare('SELECT * FROM system_settings WHERE key = ?'),
  updateSystemSetting: db.prepare(`
    UPDATE system_settings 
    SET value = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE key = ?
  `),
  getAllSystemSettings: db.prepare('SELECT * FROM system_settings ORDER BY key'),

  // Tags
  getAllTags: db.prepare('SELECT * FROM tags ORDER BY article_count DESC, name'),
  getTagById: db.prepare('SELECT * FROM tags WHERE id = ?'),
  getTagByName: db.prepare('SELECT * FROM tags WHERE name = ?'),
  getTagBySlug: db.prepare('SELECT * FROM tags WHERE slug = ?'),
  insertTag: db.prepare(`
    INSERT INTO tags (name, slug, color) 
    VALUES (?, ?, ?)
  `),
  updateTagCount: db.prepare(`
    UPDATE tags 
    SET article_count = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  deleteTag: db.prepare('DELETE FROM tags WHERE id = ?'),

  // Article tags
  getArticleTags: db.prepare(`
    SELECT t.* FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    WHERE at.article_id = ?
    ORDER BY t.name
  `),
  getTagArticles: db.prepare(`
    SELECT a.*, c.name as category_name, c.color as category_color, u.display_name as author_name, u.display_color as author_color, u.avatar as author_avatar
    FROM articles a
    JOIN article_tags at ON a.id = at.article_id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE at.tag_id = ? AND a.status = 'published'
    ORDER BY a.published_at DESC
  `),
  insertArticleTag: db.prepare(`
    INSERT OR IGNORE INTO article_tags (article_id, tag_id) 
    VALUES (?, ?)
  `),
  deleteArticleTags: db.prepare('DELETE FROM article_tags WHERE article_id = ?'),
  deleteArticleTag: db.prepare('DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?'),

  // Mentions
  getArticleMentions: db.prepare(`
    SELECT m.*, u.username, u.display_name, u.email 
    FROM mentions m
    LEFT JOIN users u ON m.mentioned_user_id = u.id
    WHERE m.article_id = ?
  `),
  getUserMentions: db.prepare(`
    SELECT m.*, a.title as article_title, a.slug as article_slug
    FROM mentions m
    JOIN articles a ON m.article_id = a.id
    WHERE m.mentioned_user_id = ?
    ORDER BY m.created_at DESC
  `),
  insertMention: db.prepare(`
    INSERT OR IGNORE INTO mentions (article_id, mentioned_user_id, mentioned_username, context) 
    VALUES (?, ?, ?, ?)
  `),
  deleteMentions: db.prepare('DELETE FROM mentions WHERE article_id = ?'),

  // Notifications
  getUserNotifications: db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `),
  getUnreadNotificationCount: db.prepare(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `),
  insertNotification: db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, article_id, mention_id) 
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  markNotificationRead: db.prepare(`
    UPDATE notifications 
    SET is_read = 1, read_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  markAllNotificationsRead: db.prepare(`
    UPDATE notifications 
    SET is_read = 1, read_at = CURRENT_TIMESTAMP 
    WHERE user_id = ? AND is_read = 0
  `),
  deleteNotification: db.prepare('DELETE FROM notifications WHERE id = ?'),

  // Image queries
  createImage: db.prepare(`
    INSERT INTO images (filename, original_filename, file_size, file_type, width, height, url, uploaded_by, used_in_articles)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getImageById: db.prepare('SELECT * FROM images WHERE id = ?'),
  getImageByFilename: db.prepare('SELECT * FROM images WHERE filename = ?'),
  getImagesByUser: db.prepare('SELECT * FROM images WHERE uploaded_by = ? ORDER BY created_at DESC'),
  getAllImages: db.prepare('SELECT * FROM images ORDER BY created_at DESC'),
  updateImageUsage: db.prepare('UPDATE images SET used_in_articles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  deleteImage: db.prepare('DELETE FROM images WHERE id = ?'),
  getImageUsageStats: db.prepare(`
    SELECT 
      COUNT(*) as total_images,
      SUM(file_size) as total_size,
      uploaded_by
    FROM images 
    WHERE uploaded_by = ?
  `),

  // Reaction queries
  getArticleReactions: db.prepare(`
    SELECT r.*, u.username, u.display_name, u.avatar, u.display_color
    FROM reactions r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.article_id = ?
    ORDER BY r.created_at DESC
  `),
  getUserReactionForArticle: db.prepare(`
    SELECT * FROM reactions 
    WHERE article_id = ? AND user_id = ?
  `),
  insertReaction: db.prepare(`
    INSERT OR REPLACE INTO reactions (article_id, user_id, emoji, updated_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `),
  deleteReaction: db.prepare(`
    DELETE FROM reactions 
    WHERE article_id = ? AND user_id = ?
  `),
  getReactionCounts: db.prepare(`
    SELECT emoji, COUNT(*) as count 
    FROM reactions 
    WHERE article_id = ? 
    GROUP BY emoji 
    ORDER BY count DESC
  `),
  updateArticleReactionCount: db.prepare(`
    UPDATE articles 
    SET reaction_count = (
      SELECT COUNT(*) FROM reactions WHERE article_id = ?
    ) 
    WHERE id = ?
  `),

  // Tip queries
  getArticleTips: db.prepare(`
    SELECT t.*, 
           from_user.username as from_username, 
           from_user.display_name as from_display_name, 
           from_user.display_color as from_display_color,
           to_user.username as to_username, 
           to_user.display_name as to_display_name, 
           to_user.display_color as to_display_color
    FROM tips t
    LEFT JOIN users from_user ON t.from_user_id = from_user.id
    LEFT JOIN users to_user ON t.to_user_id = to_user.id
    WHERE t.article_id = ?
    ORDER BY t.created_at DESC
  `),
  getUserTipsReceived: db.prepare(`
    SELECT t.*, 
           from_user.username as from_username, 
           from_user.display_name as from_display_name,
           a.title as article_title, 
           a.slug as article_slug
    FROM tips t
    LEFT JOIN users from_user ON t.from_user_id = from_user.id
    LEFT JOIN articles a ON t.article_id = a.id
    WHERE t.to_user_id = ?
    ORDER BY t.created_at DESC
    LIMIT ?
  `),
  getUserTipsSent: db.prepare(`
    SELECT t.*, 
           to_user.username as to_username, 
           to_user.display_name as to_display_name,
           a.title as article_title, 
           a.slug as article_slug
    FROM tips t
    LEFT JOIN users to_user ON t.to_user_id = to_user.id
    LEFT JOIN articles a ON t.article_id = a.id
    WHERE t.from_user_id = ?
    ORDER BY t.created_at DESC
    LIMIT ?
  `),
  insertTip: db.prepare(`
    INSERT INTO tips (article_id, from_user_id, to_user_id, amount, system_fee, net_amount, message) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getTipStats: db.prepare(`
    SELECT 
      COUNT(*) as total_tips,
      SUM(amount) as total_amount,
      SUM(system_fee) as total_fees,
      SUM(net_amount) as total_net
    FROM tips 
    WHERE article_id = ?
  `),
  getUserCurrency: db.prepare(`
    SELECT currency1 FROM users WHERE id = ?
  `)
  });
}

// Export types
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  author_id: number;
  author_name?: string;
  author_color?: string;
  status: 'draft' | 'published';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  display_color?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  user_id: number;
  username?: string;
  display_name?: string;
  email?: string;
  role?: string;
  expires_at: string;
  created_at: string;
}

export interface Image {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  width?: number;
  height?: number;
  url: string;
  uploaded_by: number;
  used_in_articles: string; // JSON string of article IDs
  created_at: string;
  updated_at: string;
}

export interface CategorySuggestion {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  suggested_by: number;
  suggested_by_name?: string;
  vote_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CategorySuggestionVote {
  id: number;
  suggestion_id: number;
  user_id: number;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleTag {
  id: number;
  article_id: number;
  tag_id: number;
  created_at: string;
}

export interface Mention {
  id: number;
  article_id: number;
  mentioned_user_id: number;
  mentioned_username: string;
  context?: string;
  created_at: string;
  // Joined fields
  username?: string;
  display_name?: string;
  email?: string;
  article_title?: string;
  article_slug?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'mention' | 'article_published' | 'reaction' | 'system';
  title: string;
  message: string;
  article_id?: number;
  mention_id?: number;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface Reaction {
  id: number;
  article_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  username?: string;
  display_name?: string;
  avatar?: string;
  display_color?: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
}