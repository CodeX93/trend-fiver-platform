import { db } from '../server/db';
import { initializeSlotConfigs } from '../server/slot-service';
import { initializeDefaultAssets } from '../server/price-service';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Initialize slot configurations
    console.log('📅 Setting up slot configurations...');
    await initializeSlotConfigs();
    console.log('✅ Slot configurations initialized');

    // Initialize default assets
    console.log('📊 Setting up default assets...');
    await initializeDefaultAssets();
    console.log('✅ Default assets initialized');

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run "npm run seed-admin" to create admin user');
    console.log('2. Start the server with "npm run dev"');
    console.log('3. Access the admin panel at /admin');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeDatabase(); 