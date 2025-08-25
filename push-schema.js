import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './shared/schema.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  // Modifica l'URL per gestire correttamente la password e l'IPv6
  const dbUrl = new URL(process.env.DATABASE_URL);
  // Rimuovi le parentesi quadre dall'host IPv6 se presenti
  const host = dbUrl.hostname.replace(/^\[(.+)\]$/, '$1');
  // Assicurati che la password sia correttamente codificata
  const password = decodeURIComponent(dbUrl.password);
  // Ricostruisci l'URL con la password codificata
  const modifiedUrl = `${dbUrl.protocol}//${dbUrl.username}:${encodeURIComponent(password)}@${host}:${dbUrl.port}${dbUrl.pathname}${dbUrl.search}`;

  console.log('Connecting to database...');
  const pool = new Pool({ 
    connectionString: modifiedUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  const db = drizzle(pool, { schema });

  console.log('Pushing schema to database...');
  
  try {
    // Add user metrics columns if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS total_predictions INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS accurate_predictions INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS accuracy_percentage DECIMAL NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS advisor_rating DECIMAL NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS is_verified_advisor BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        EXCEPTION
          WHEN duplicate_column THEN
            -- Do nothing, columns already exist
        END;
      END $$;
    `);
    
    // Create prediction_results table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prediction_results (
        id SERIAL PRIMARY KEY,
        opinion_id INTEGER NOT NULL REFERENCES opinions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        asset_id INTEGER NOT NULL REFERENCES assets(id),
        original_prediction DECIMAL NOT NULL,
        actual_result DECIMAL NOT NULL,
        was_accurate BOOLEAN NOT NULL,
        verified_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create leaderboard_entries table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        username TEXT NOT NULL,
        total_predictions INTEGER NOT NULL DEFAULT 0,
        accurate_predictions INTEGER NOT NULL DEFAULT 0,
        accuracy_percentage DECIMAL NOT NULL DEFAULT 0,
        rank INTEGER NOT NULL,
        month_year TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Schema successfully updated!');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
