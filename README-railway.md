# Deploy di Trend su Railway

## Passi per il deploy

1. Registrati su [Railway](https://railway.app/)

2. Dalla dashboard di Railway, clicca su "New Project" e seleziona "Deploy from GitHub repo"

3. Collega il tuo repository GitHub e seleziona il branch da deployare (solitamente `main`)

4. Configura le seguenti variabili d'ambiente nel pannello "Variables":
   - `DATABASE_URL`: Usa il servizio PostgreSQL di Railway (viene fornito automaticamente se aggiungi un database)
   - `SESSION_SECRET`: Una stringa casuale e sicura per la sessione
   - `BREVO_API_KEY`: La tua API key di Brevo per i servizi email

5. Aggiungi un servizio PostgreSQL cliccando su "New" → "Database" → "PostgreSQL"

6. Railway si occuperà automaticamente del build e del deploy usando le configurazioni nel file `railway.toml`

## Monitoraggio e Logs

- Puoi monitorare logs e metriche dalla dashboard di Railway
- Railway fornisce un URL per accedere all'applicazione deployata

## Risoluzione problemi

Se incontri problemi durante il deploy:

1. Controlla i logs nel pannello "Deployments"
2. Verifica che tutte le variabili d'ambiente siano configurate correttamente
3. Assicurati che il database sia stato inizializzato correttamente

## Deployment manuale con Railway CLI

In alternativa, puoi utilizzare la CLI di Railway per il deploy:

```bash
# Installa la Railway CLI
npm i -g @railway/cli

# Login
railway login

# Collega al progetto
railway link

# Esegui il deploy
railway up
``` 