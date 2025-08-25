# Istruzioni per l'esportazione dell'applicazione Trend

## Passaggi per scaricare l'applicazione completa

1. All'interno dell'ambiente Replit, usa l'opzione "Export repl" dal menu principale
   - Clicca sui tre puntini (...) nella barra superiore
   - Seleziona "Export repl"
   - Scegli "Download as ZIP"

2. In alternativa, puoi utilizzare l'opzione "Download as ZIP" direttamente dalla pagina del tuo Repl

Questo ti permetterà di scaricare l'intero progetto in formato compresso, inclusi tutti i file necessari per l'installazione.

## Contenuti del pacchetto scaricato

Il pacchetto scaricato include:

- Codice sorgente completo del frontend (React/TypeScript)
- Codice sorgente completo del backend (Node.js/Express)
- File di configurazione per il database PostgreSQL
- Documentazione dell'API
- Script per la creazione del database e la migrazione

## Requisiti per l'installazione

- Node.js v16 o superiore
- PostgreSQL 14 o superiore
- Account Brevo per servizi email (opzionale, ma raccomandato)

## Istruzioni per l'installazione

1. **Configurazione database**
   ```bash
   # Creare un nuovo database PostgreSQL
   createdb trend
   ```

2. **Configurazione variabili d'ambiente**
   Creare un file `.env` nella root del progetto con:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/trend
   SESSION_SECRET=genera_un_secret_lungo_e_casuale
   BREVO_API_KEY=il_tuo_api_key_brevo
   ```

3. **Installazione dipendenze**
   ```bash
   npm install
   ```

4. **Migrazione database**
   ```bash
   npm run db:push
   ```

5. **Avvio dell'applicazione**
   ```bash
   # Per sviluppo
   npm run dev
   
   # Per produzione
   npm run build
   npm start
   ```

6. **Accesso all'applicazione**
   Apri il browser all'indirizzo http://localhost:5000

   L'utente amministratore predefinito è:
   - Username: admin
   - Password: password

## Assistenza

In caso di problemi di installazione, assicurati che:
- PostgreSQL sia correttamente installato e in esecuzione
- Le variabili d'ambiente siano configurate correttamente
- Node.js sia alla versione corretta