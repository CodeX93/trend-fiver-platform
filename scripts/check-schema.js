import pg from 'pg';
const { Pool } = pg;

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Checking predictions table structure...');
    const result = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'predictions'
      ORDER BY ordinal_position
    `);
    
    console.log('Predictions table columns:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });
    
    console.log('\nChecking slot_configs table structure...');
    const slotResult = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'slot_configs'
      ORDER BY ordinal_position
    `);
    
    console.log('Slot configs table columns:');
    slotResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });
    
    client.release();
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema(); 