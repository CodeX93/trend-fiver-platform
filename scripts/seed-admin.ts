import { db } from '../server/db';
import { users, userProfiles } from '../shared/schema';
import { hashPassword } from '../server/auth';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

async function seedAdmin() {
  try {
    console.log('Seeding admin user...');

    // Check if admin already exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, 'admin@trend-app.com'),
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword('admin123');

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
    process.exit(0);
  }
}

seedAdmin();
