import pg from 'pg';
const { Pool } = pg;

async function fixDurationEnum() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Cleaning up old slot configs...');
    // Delete all old slot configs
    await client.query('DELETE FROM slot_configs');
    
    console.log('Updating duration enum...');
    // Drop and recreate the enum
    await client.query('DROP TYPE IF EXISTS duration CASCADE');
    await client.query(`
      CREATE TYPE duration AS ENUM ('1h', '3h', '6h', '24h', '48h', '1w', '1m', '3m', '6m', '1y')
    `);
    
    console.log('Fixing slot_configs table...');
    // Fix the duration column in slot_configs table
    await client.query(`
      ALTER TABLE slot_configs 
      ALTER COLUMN duration TYPE duration USING duration::duration
    `);
    
    console.log('Adding duration column to predictions table...');
    // Add duration column to predictions table
    await client.query(`
      ALTER TABLE predictions 
      ADD COLUMN IF NOT EXISTS duration duration
    `);
    
    console.log('Duration enum fixed successfully!');
    
    client.release();
  } catch (error) {
    console.error('Error fixing duration enum:', error);
  } finally {
    await pool.end();
  }
}

fixDurationEnum(); 