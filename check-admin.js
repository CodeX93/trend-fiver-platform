import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function checkAdmin() {
  try {
    console.log('Checking admin user...');
    
    const adminUser = await db.select().from(users).where(eq(users.email, 'admin@trend-app.com')).limit(1);
    
    if (adminUser.length === 0) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    const user = adminUser[0];
    console.log('✅ Admin user found:');
    console.log('  ID:', user.id);
    console.log('  Username:', user.username);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Email Verified:', user.emailVerified);
    console.log('  Is Active:', user.isActive);
    console.log('  Created At:', user.createdAt);
    
    if (user.role !== 'admin') {
      console.log('❌ User exists but role is not "admin"!');
      console.log('Current role:', user.role);
    } else {
      console.log('✅ User has admin role!');
    }
    
  } catch (error) {
    console.error('Error checking admin user:', error);
  } finally {
    await pool.end();
  }
}

checkAdmin(); 