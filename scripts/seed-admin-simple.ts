import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, userProfiles } from '../shared/schema';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seedAdmin() {
  try {
    console.log('Seeding admin user...');

    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@trend-app.com')).limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      email: 'admin@trend-app.com',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      isActive: true,
    }).returning();

    // Create admin profile
    await db.insert(userProfiles).values({
      userId: adminUser.id,
      bio: 'System Administrator',
    });

    console.log('Admin user created successfully');
    console.log('Email: admin@trend-app.com');
    console.log('Password: admin123');
    console.log('Username: admin');

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedAdmin(); 