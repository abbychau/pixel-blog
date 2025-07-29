import { initializeDatabase, queries } from '../src/lib/database';
import { hashPassword } from '../src/lib/auth';

async function createDefaultAdmin() {
  try {
    initializeDatabase();

    // Check if admin user already exists
    const existingAdmin = queries.getUserByUsername.get('admin');
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin user
    const hashedPassword = await hashPassword('admin123');
    
    queries.insertUser.run(
      'admin',
      'Administrator',
      'admin@pixelblog.local',
      hashedPassword,
      'admin'
    );

    console.log('Default admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Please change the password after first login');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createDefaultAdmin();