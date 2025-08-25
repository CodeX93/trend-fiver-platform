import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Modifica l'URL per gestire correttamente la password e l'IPv6
const dbUrl = new URL(process.env.DATABASE_URL);
// Rimuovi le parentesi quadre dall'host IPv6 se presenti
const host = dbUrl.hostname.replace(/^\[(.+)\]$/, '$1');
// Assicurati che la password sia correttamente codificata
const password = decodeURIComponent(dbUrl.password);
// Ricostruisci l'URL con la password codificata
const modifiedUrl = `${dbUrl.protocol}//${dbUrl.username}:${encodeURIComponent(password)}@${host}:${dbUrl.port}${dbUrl.pathname}${dbUrl.search}`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: modifiedUrl,
  },
});
