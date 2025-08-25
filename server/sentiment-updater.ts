import { db } from './db';
import { assets } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { log } from './vite';

// Sentiment trends - These determine how likely an asset is to change sentiment
const sentimentTrends = {
  "BTC": 0.7,    // Bitcoin tends to be more positive
  "ETH": 0.6,    // Ethereum tends to be positive
  "TSLA": 0.5,   // Tesla is volatile (neutral)
  "AAPL": 0.6,   // Apple tends to be positive
  "NVDA": 0.7,   // Nvidia tends to be positive
  "AMZN": 0.5,   // Amazon is neutral
};

// Volatility factors - higher means more likely to change
const volatilityFactors = {
  "cryptocurrency": 0.3,  // Crypto is more volatile
  "stock": 0.2,          // Stocks are less volatile
};

// Weight influence from user opinions vs market simulations
const USER_OPINION_WEIGHT = 0.6;
const MARKET_SIMULATION_WEIGHT = 0.4;

// Sentiment map for conversion
const sentimentMap: Record<string, number> = {
  "positive": 1,
  "neutral": 0,
  "negative": -1
};

// Returns a random number between min and max
function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Simulates a market sentiment change for an asset
function simulateMarketSentiment(symbol: string, type: string, currentSentiment: string): string {
  const trend = sentimentTrends[symbol as keyof typeof sentimentTrends] || 0.5;
  const volatility = volatilityFactors[type as keyof typeof volatilityFactors] || 0.2;
  
  // Convert current sentiment to numeric value
  const currentSentimentValue = sentimentMap[currentSentiment] || 0;
  
  // Calculate new sentiment value with some randomness
  // Higher trend values favor positive sentiment
  const random = Math.random();
  let change = 0;
  
  if (random < volatility) {
    // Generate a change based on the trend
    // If trend is high (bullish), more likely to become more positive
    if (Math.random() < trend) {
      change = 1;
    } else {
      change = -1;
    }
  }
  
  // Calculate new sentiment numeric value
  let newSentimentValue = currentSentimentValue + change;
  
  // Clamp between -1 and 1
  newSentimentValue = Math.max(-1, Math.min(1, newSentimentValue));
  
  // Convert back to string sentiment
  if (newSentimentValue > 0) return "positive";
  if (newSentimentValue < 0) return "negative";
  return "neutral";
}

// Generate a realistic prediction percentage based on sentiment
function generatePrediction(sentiment: string, assetType: string): number {
  // Base ranges for different sentiments
  const ranges = {
    positive: { min: 1, max: 10 },
    neutral: { min: -2, max: 2 },
    negative: { min: -8, max: -1 }
  };
  
  // Adjust ranges based on asset type (crypto is more volatile)
  const multiplier = assetType === 'cryptocurrency' ? 1.5 : 1;
  
  const range = ranges[sentiment as keyof typeof ranges];
  return getRandomInRange(range.min * multiplier, range.max * multiplier);
}

// Update all assets with simulated market sentiment
export async function updateMarketSentiments(): Promise<void> {
  try {
    // Get all assets
    const allAssets = await db.select().from(assets);
    
    for (const asset of allAssets) {
      // Get user opinions for this asset (this could be cached or optimized)
      // For now, this is just a simulation
      
      // Simulate market sentiment
      const assetType = asset.type || 'stock';
      const assetSentiment = asset.sentiment || 'neutral';
      const marketSentiment = simulateMarketSentiment(asset.symbol, assetType, assetSentiment);
      
      // Blend user opinions with market simulation
      // In a real app, you would get the aggregated user sentiment and blend it with market simulation
      // For now, we'll just use the market simulation
      
      // Generate a new prediction percentage based on the sentiment
      const newPrediction = generatePrediction(marketSentiment, assetType);
      
      // Update the asset
      await db.update(assets)
        .set({ 
          sentiment: marketSentiment,
          prediction: newPrediction.toString() 
        })
        .where(eq(assets.id, asset.id));
      
      log(`Updated ${asset.symbol} sentiment to ${marketSentiment} with prediction ${newPrediction.toFixed(2)}%`, 'sentiment-updater');
    }
    
    log('All asset sentiments updated with market simulation', 'sentiment-updater');
  } catch (error) {
    console.error('Error updating market sentiments:', error);
  }
}

// Schedule periodic updates
export function startSentimentUpdates(intervalMinutes: number = 2): void {
  log(`Starting sentiment updater with ${intervalMinutes} minute interval`, 'sentiment-updater');
  
  // Do an initial update
  updateMarketSentiments();
  
  // Set interval for future updates (converted to milliseconds)
  setInterval(updateMarketSentiments, intervalMinutes * 60 * 1000);
}