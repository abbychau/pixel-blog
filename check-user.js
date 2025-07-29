const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'blog.db');
const db = new Database(dbPath);

// Check abby's user record
const user = db.prepare("SELECT id, username, display_name, email, role, is_active, created_at FROM admin_users WHERE email = 'i@abby.md' OR username = 'abby'").get();
console.log('User record for abby:', user);

// Check all admin users
const allUsers = db.prepare("SELECT id, username, display_name, email, role, is_active FROM admin_users ORDER BY id").all();
console.log('\nAll users:');
allUsers.forEach(u => console.log(u));

db.close();