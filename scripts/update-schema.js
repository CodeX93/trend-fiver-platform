// Script per aggiornare lo schema del database
import { exec } from 'child_process';
import fs from 'fs';

// Creiamo un file SQL temporaneo con le query necessarie
const tempSqlPath = './temp-schema-update.sql';

const sqlQueries = `
-- Aggiungiamo la colonna current_badge alla tabella users se non esiste
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'current_badge'
    ) THEN 
        ALTER TABLE users ADD COLUMN current_badge text;
    END IF;
END $$;

-- Creiamo il tipo enum badge_type se non esiste
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'badge_type'
    ) THEN 
        CREATE TYPE badge_type AS ENUM ('top1', 'top2', 'top3', 'top4', 'top5');
    END IF;
END $$;

-- Creare tabella user_badges se non esiste
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    username TEXT NOT NULL,
    badge_type TEXT NOT NULL,
    month_year TEXT NOT NULL,
    accuracy_percentage DECIMAL DEFAULT 0 NOT NULL,
    total_predictions INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
`;

fs.writeFileSync(tempSqlPath, sqlQueries);

// Eseguiamo lo script SQL
const command = `PGPASSWORD="${process.env.PGPASSWORD}" psql -h ${process.env.PGHOST} -p ${process.env.PGPORT} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -f ${tempSqlPath}`;

console.log('Aggiornamento dello schema in corso...');
exec(command, (error, stdout, stderr) => {
  // Rimuoviamo il file temporaneo
  fs.unlinkSync(tempSqlPath);
  
  if (error) {
    console.error(`Errore durante l'aggiornamento dello schema:`, error);
    return;
  }
  
  if (stderr) {
    console.error(`Avvisi durante l'aggiornamento dello schema:`, stderr);
  }
  
  console.log('Output:', stdout);
  console.log('Schema aggiornato con successo!');
});