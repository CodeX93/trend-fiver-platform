// Script per aggiungere badge di test all'utente admin
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { userBadges, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

// Connessione al database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { userBadges, users } });

const ADMIN_USERNAME = 'admin';
const CURRENT_YEAR = new Date().getFullYear();

async function main() {
  try {
    console.log('Aggiunta di badge di test all\'utente admin...');
    
    // Trova l'utente admin
    const [adminUser] = await db.select().from(users).where(eq(users.username, ADMIN_USERNAME));
    
    if (!adminUser) {
      console.error('Utente admin non trovato!');
      process.exit(1);
    }
    
    // Controlla se ci sono già badge per l'utente admin
    const existingBadges = await db.select().from(userBadges).where(eq(userBadges.userId, adminUser.id));
    
    if (existingBadges.length > 0) {
      console.log(`Trovati ${existingBadges.length} badge esistenti per l'utente admin.`);
      console.log('Operazione annullata. Se vuoi aggiungere nuovi badge, elimina prima quelli esistenti.');
      process.exit(0);
    }
    
    // Badge di esempio per gli ultimi mesi
    const sampleBadges = [
      {
        userId: adminUser.id,
        username: adminUser.username,
        badgeType: 'top1',
        monthYear: `${CURRENT_YEAR-1}-12`,
        accuracyPercentage: 92.5,
        totalPredictions: 40
      },
      {
        userId: adminUser.id,
        username: adminUser.username,
        badgeType: 'top2',
        monthYear: `${CURRENT_YEAR}-01`,
        accuracyPercentage: 87.3,
        totalPredictions: 32
      },
      {
        userId: adminUser.id,
        username: adminUser.username,
        badgeType: 'top3',
        monthYear: `${CURRENT_YEAR}-02`,
        accuracyPercentage: 82.1,
        totalPredictions: 28
      }
    ];
    
    // Inserisci i badge
    const insertedBadges = await db.insert(userBadges).values(sampleBadges).returning();
    console.log(`Inseriti ${insertedBadges.length} badge di test.`);
    
    // Aggiorna il badge corrente dell'utente admin
    await db.update(users)
      .set({ currentBadge: 'top3' })
      .where(eq(users.id, adminUser.id));
    
    console.log('Badge corrente dell\'utente admin impostato a "top3"');
    console.log('Operazione completata con successo!');
  } catch (error) {
    console.error('Errore durante l\'aggiunta dei badge di test:', error);
    process.exit(1);
  }
}

main();