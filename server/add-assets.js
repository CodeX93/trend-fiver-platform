import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

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

  console.log('Adding new assets...');
  
  try {
    // Additional cryptocurrencies
    const additionalCryptos = [
      { name: "Dogecoin", symbol: "DOGE", type: "cryptocurrency", sentiment: "neutral", prediction: "2.5" },
      { name: "Cardano", symbol: "ADA", type: "cryptocurrency", sentiment: "neutral", prediction: "1.8" },
      { name: "Solana", symbol: "SOL", type: "cryptocurrency", sentiment: "positive", prediction: "4.2" },
      { name: "Polkadot", symbol: "DOT", type: "cryptocurrency", sentiment: "neutral", prediction: "1.2" },
      { name: "Binance Coin", symbol: "BNB", type: "cryptocurrency", sentiment: "positive", prediction: "3.7" },
      { name: "XRP", symbol: "XRP", type: "cryptocurrency", sentiment: "neutral", prediction: "0.9" },
      { name: "Avalanche", symbol: "AVAX", type: "cryptocurrency", sentiment: "positive", prediction: "2.8" },
      { name: "Chainlink", symbol: "LINK", type: "cryptocurrency", sentiment: "neutral", prediction: "1.5" },
    ];
    
    // Additional stocks
    const additionalStocks = [
      { name: "Microsoft", symbol: "MSFT", type: "stock", sentiment: "positive", prediction: "3.2" },
      { name: "Alphabet", symbol: "GOOGL", type: "stock", sentiment: "positive", prediction: "2.8" },
      { name: "Meta", symbol: "META", type: "stock", sentiment: "neutral", prediction: "1.4" },
      { name: "Berkshire Hathaway", symbol: "BRK.B", type: "stock", sentiment: "positive", prediction: "1.9" },
      { name: "Johnson & Johnson", symbol: "JNJ", type: "stock", sentiment: "neutral", prediction: "0.7" },
      { name: "JPMorgan Chase", symbol: "JPM", type: "stock", sentiment: "positive", prediction: "2.1" },
      { name: "Visa", symbol: "V", type: "stock", sentiment: "positive", prediction: "2.4" },
      { name: "Walmart", symbol: "WMT", type: "stock", sentiment: "neutral", prediction: "1.1" },
      { name: "UnitedHealth Group", symbol: "UNH", type: "stock", sentiment: "neutral", prediction: "0.9" },
      { name: "Procter & Gamble", symbol: "PG", type: "stock", sentiment: "neutral", prediction: "0.5" },
    ];
    
    // Check if assets already exist to avoid duplicates
    const allNewAssets = [...additionalCryptos, ...additionalStocks];
    
    for (const asset of allNewAssets) {
      // Check if the asset already exists by symbol
      const checkResult = await pool.query(
        'SELECT id FROM assets WHERE symbol = $1',
        [asset.symbol]
      );
      
      if (checkResult.rows.length === 0) {
        // Asset doesn't exist, so insert it
        await pool.query(
          'INSERT INTO assets (name, symbol, type, sentiment, prediction) VALUES ($1, $2, $3, $4, $5)',
          [asset.name, asset.symbol, asset.type, asset.sentiment, asset.prediction]
        );
        console.log(`Added ${asset.type} ${asset.name} (${asset.symbol})`);
      } else {
        console.log(`Asset ${asset.symbol} already exists, skipping`);
      }
    }
    
    console.log('New assets added successfully!');
  } catch (error) {
    console.error('Error adding new assets:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);