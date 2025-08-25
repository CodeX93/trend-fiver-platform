import { log } from './vite';
import { storage } from './storage';

// Funzione per ottenere il mese corrente nel formato YYYY-MM
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Mese è 0-based, quindi aggiungiamo 1 e assicuriamo il formato a due cifre
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Funzione per ottenere il mese precedente nel formato YYYY-MM
function getPreviousMonth(): string {
  const now = new Date();
  // Imposta la data al primo giorno del mese corrente
  now.setDate(1);
  // Sottrai un giorno per ottenere l'ultimo giorno del mese precedente
  now.setDate(0);
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Funzione per assegnare i badge mensili basati sulle prestazioni
export async function assignMonthlyBadges(): Promise<void> {
  try {
    const previousMonth = getPreviousMonth();
    log(`Assegnando badge per il mese: ${previousMonth}`, 'badge-service');
    
    // Assegna i badge per il mese precedente
    await storage.assignMonthlyBadges(previousMonth);
    
    log(`Badge assegnati con successo per il mese: ${previousMonth}`, 'badge-service');
  } catch (error) {
    console.error('Errore durante l\'assegnazione dei badge mensili:', error);
  }
}

// Funzione per calcolare quando eseguire il prossimo aggiornamento dei badge (il primo di ogni mese)
function calculateNextBadgeUpdate(): Date {
  const now = new Date();
  
  // Se siamo già il primo del mese, pianifica per il primo del prossimo mese
  if (now.getDate() === 1 && now.getHours() < 2) {
    // Calcola tra quanto tempo alle 2 del mattino
    const target = new Date(now);
    target.setHours(2, 0, 0, 0);
    return target;
  }
  
  // Altrimenti, pianifica per il primo del prossimo mese alle 2 del mattino
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0, 0);
  return nextMonth;
}

// Pianifica il prossimo aggiornamento di badge
function scheduleBadgeUpdate(): void {
  const nextUpdate = calculateNextBadgeUpdate();
  const now = new Date();
  
  // Calcola il tempo in millisecondi fino al prossimo aggiornamento
  const timeUntilNextUpdate = nextUpdate.getTime() - now.getTime();
  
  log(`Prossimo aggiornamento badge pianificato per: ${nextUpdate.toLocaleString()}`, 'badge-service');
  
  // Imposta il timeout per il prossimo aggiornamento
  setTimeout(() => {
    // Esegui l'assegnazione dei badge
    assignMonthlyBadges().then(() => {
      // Pianifica il prossimo aggiornamento
      scheduleBadgeUpdate();
    });
  }, timeUntilNextUpdate);
}

// Funzione principale per avviare il servizio di badge
export function startBadgeService(): void {
  log('Avvio del servizio di assegnazione badge mensile', 'badge-service');
  
  // Verifica se è il primo del mese e in caso assegna subito i badge
  const now = new Date();
  if (now.getDate() === 1) {
    log('È il primo del mese, assegnazione badge in corso...', 'badge-service');
    assignMonthlyBadges();
  }
  
  // Pianifica il prossimo aggiornamento
  scheduleBadgeUpdate();
}