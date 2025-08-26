import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db.js';
import { predictions, users, userProfiles, assets, assetPrices } from '../../shared/schema.js';
import { eq, and, lte, gte, isNull, not, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import WebSocketService from '../websocket-service.js';
import { getSlotForDate, getPointsForSlot } from '../lib/slots.js';

interface PredictionEvaluationJob {
  predictionId: string;
  userId: string;
  assetId: string;
  assetSymbol: string;
  direction: 'up' | 'down';
  duration: string;
  slotStart: Date;
  slotEnd: Date;
}

// Create Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create queues
export const predictionEvaluationQueue = new Queue('prediction-evaluation', { connection });
export const priceFetchQueue = new Queue('price-fetch', { connection });

// Initialize services
const wsService = new WebSocketService({} as any); // Temporary fix - we'll need to pass the actual server

/**
 * Get base score for a slot using the new slot point system
 */
function getBaseScore(duration: string, slotNumber: number): number {
  try {
    return getPointsForSlot(duration as any, slotNumber);
  } catch (error) {
    console.error(`Error getting points for ${duration} slot ${slotNumber}:`, error);
    return 50; // Default fallback
  }
}

/**
 * Calculate points awarded based on prediction result with accuracy bonus
 */
function calculatePoints(correct: boolean, baseScore: number, priceStart?: number, priceEnd?: number): number {
  if (correct) {
    let points = baseScore;
    
    // Add accuracy bonus if we have price data
    if (priceStart && priceEnd && priceStart > 0) {
      const priceChangePercent = Math.abs((priceEnd - priceStart) / priceStart * 100);
      
      if (priceChangePercent <= 0.1) {
        // Exact match bonus (+10 points for closing price within 0.1%)
        points += 10;
        console.log(`Worker accuracy bonus: +10 points for exact match (${priceChangePercent.toFixed(3)}% change)`);
      } else if (priceChangePercent <= 0.5) {
        // High accuracy bonus (+5 points for within 0.5%)
        points += 5;
        console.log(`Worker accuracy bonus: +5 points for high accuracy (${priceChangePercent.toFixed(3)}% change)`);
      } else if (priceChangePercent <= 1.0) {
        // Acceptable range bonus (+2 points for within 1%)
        points += 2;
        console.log(`Worker accuracy bonus: +2 points for acceptable range (${priceChangePercent.toFixed(3)}% change)`);
      }
    }
    
    return points;
  } else {
    // Penalty: 50% of base score, minimum -1
    return Math.max(Math.round(-Math.abs(baseScore * 0.5)), -1);
  }
}

/**
 * Ensure exact boundary price capture for slot start/end
 * This function tries to get the most accurate price at the exact boundary
 */
async function ensureBoundaryPriceCapture(
  assetId: string,
  assetSymbol: string,
  boundaryTime: Date,
  isStart: boolean
): Promise<number | null> {
  try {
    // For start boundary, try to get price slightly before
    // For end boundary, try to get price slightly after
    const offsetMs = isStart ? -60000 : 60000; // 1 minute offset
    const targetTime = new Date(boundaryTime.getTime() + offsetMs);
    
    // First try exact boundary time
    let price = await fetchPriceAtTimestamp(assetId, assetSymbol, boundaryTime, 1);
    if (price) return price;
    
    // Then try with offset
    price = await fetchPriceAtTimestamp(assetId, assetSymbol, targetTime, 2);
    if (price) return price;
    
    // Finally, try current live price as fallback
    const { getLiveAssetPrice } = await import('../price-service.js');
    const livePrice = await getLiveAssetPrice(assetSymbol);
    if (livePrice) {
      // Store the price for future reference
      const { assetPrices } = await import('../../shared/schema.js');
      await db.insert(assetPrices).values({
        assetId,
        price: livePrice.toString(),
        timestamp: new Date(),
        source: 'live-fallback'
      });
      return livePrice;
    }
    
    return null;
  } catch (error) {
    console.error(`Error ensuring boundary price capture for ${assetSymbol}:`, error);
    return null;
  }
}

/**
 * Fetch price at a specific timestamp with fallback logic
 */
async function fetchPriceAtTimestamp(
  assetId: string,
  assetSymbol: string,
  timestamp: Date,
  toleranceMinutes: number = 5 // Reduced tolerance for more accurate boundary capture
): Promise<number | null> {
  try {
    // First, try to find exact price snapshot
    const exactPrice = await db
      .select()
      .from(assetPrices)
      .where(
        and(
          eq(assetPrices.assetId, assetId),
          eq(assetPrices.timestamp, timestamp)
        )
      )
      .limit(1);

    if (exactPrice.length > 0) {
      return parseFloat(exactPrice[0].price.toString());
    }

    // Try to find nearest price within tolerance window
    const toleranceMs = toleranceMinutes * 60 * 1000;
    const toleranceStart = new Date(timestamp.getTime() - toleranceMs);
    const toleranceEnd = new Date(timestamp.getTime() + toleranceMs);

    const nearestPrice = await db
      .select()
      .from(assetPrices)
      .where(
        and(
          eq(assetPrices.assetId, assetId),
          gte(assetPrices.timestamp, toleranceStart),
          lte(assetPrices.timestamp, toleranceEnd)
        )
      )
      .orderBy(assetPrices.timestamp)
      .limit(1);

    if (nearestPrice.length > 0) {
      return parseFloat(nearestPrice[0].price.toString());
    }

    // If no price found, try to fetch from API
    console.log(`No price found for ${assetSymbol} at ${timestamp}, fetching from API...`);
    
    // Get asset info
    const asset = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (asset.length === 0) {
      console.error(`Asset not found: ${assetId}`);
      return null;
    }

    // Fetch current price and store it - using the getAssetPrice function
    const { getAssetPrice } = await import('../price-service.js');
    const currentPrice = await getAssetPrice(assetSymbol);
    if (currentPrice) {
      await db.insert(assetPrices).values({
        assetId,
        price: currentPrice.toString(),
        timestamp: new Date(),
        source: asset[0].apiSource
      });
      
      // For evaluation purposes, use current price as fallback
      return currentPrice;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${assetSymbol} at ${timestamp}:`, error);
    return null;
  }
}

/**
 * Evaluate a single prediction
 */
async function evaluatePrediction(prediction: any): Promise<void> {
  const { id, userId, assetId, direction, duration, slotNumber, slotStart, slotEnd } = prediction;

  try {
    console.log(`Evaluating prediction ${id} for user ${userId}`);

    // Get asset info
    const asset = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (asset.length === 0) {
      console.error(`Asset not found for prediction ${id}`);
      return;
    }

    const assetSymbol = asset[0].symbol;

    // Fetch priceStart if not already set - use exact boundary capture
    let priceStart = prediction.priceStart;
    if (!priceStart) {
      priceStart = await ensureBoundaryPriceCapture(assetId, assetSymbol, slotStart, true);
      if (!priceStart) {
        console.log(`No priceStart available for prediction ${id}, requeuing...`);
        // Requeue with delay
        await predictionEvaluationQueue.add(
          'evaluate-prediction',
          { predictionId: id },
          { delay: 5 * 60 * 1000 } // 5 minutes delay
        );
        return;
      }
    }

    // Fetch priceEnd - use exact boundary capture
    const priceEnd = await ensureBoundaryPriceCapture(assetId, assetSymbol, slotEnd, false);
    if (!priceEnd) {
      console.log(`No priceEnd available for prediction ${id}, requeuing...`);
      // Requeue with delay
      await predictionEvaluationQueue.add(
        'evaluate-prediction',
        { predictionId: id },
        { delay: 5 * 60 * 1000 } // 5 minutes delay
      );
      return;
    }

    // Evaluate prediction
    const isCorrect = direction === 'up' ? priceEnd > priceStart : priceEnd < priceStart;
    
    // Calculate points with accuracy bonus
    const baseScore = getBaseScore(duration, slotNumber);
    const pointsAwarded = calculatePoints(isCorrect, baseScore, priceStart, priceEnd);

    // Update prediction
    await db
      .update(predictions)
      .set({
        status: 'evaluated',
        result: isCorrect ? 'correct' : 'incorrect',
        pointsAwarded,
        priceStart: priceStart.toString(),
        priceEnd: priceEnd.toString(),
        evaluatedAt: new Date()
      })
      .where(eq(predictions.id, id));

    // Update user profile - only update scores and correct predictions, not totalPredictions
    // (totalPredictions is already incremented in createPrediction)
    await db
      .update(userProfiles)
      .set({
        monthlyScore: sql`${userProfiles.monthlyScore} + ${pointsAwarded}`,
        totalScore: sql`${userProfiles.totalScore} + ${pointsAwarded}`,
        correctPredictions: sql`${userProfiles.correctPredictions} + ${isCorrect ? 1 : 0}`
      })
      .where(eq(userProfiles.userId, userId));

    console.log(`Prediction ${id} evaluated: ${isCorrect ? 'correct' : 'incorrect'}, points: ${pointsAwarded}`);

    // Emit WebSocket event - using available methods
    wsService.broadcastPredictionUpdate(assetSymbol, duration as any, slotNumber, 0, 0);

  } catch (error) {
    console.error(`Error evaluating prediction ${id}:`, error);
    
    // Requeue with exponential backoff
    const attempts = prediction.attempts || 0;
    if (attempts < 6) {
      const delay = Math.min(5 * Math.pow(2, attempts), 60) * 60 * 1000; // Max 60 minutes
      await predictionEvaluationQueue.add(
        'evaluate-prediction',
        { predictionId: id, attempts: attempts + 1 },
        { delay }
      );
    } else {
      // Mark as pending manual review
      await db
        .update(predictions)
        .set({
          status: 'expired',
          result: 'pending'
        })
        .where(eq(predictions.id, id));
      
      console.error(`Prediction ${id} marked for manual review after ${attempts} attempts`);
    }
  }
}

/**
 * Find and queue expired predictions for evaluation
 */
async function findExpiredPredictions(): Promise<void> {
  try {
    const now = new Date();
    
    // Find predictions that are active and expired
    const expiredPredictions = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.status, 'active'),
          lte(predictions.timestampExpiration, now)
        )
      );

    console.log(`Found ${expiredPredictions.length} expired predictions to evaluate`);

    // Queue each prediction for evaluation
    for (const prediction of expiredPredictions) {
      await predictionEvaluationQueue.add(
        'evaluate-prediction',
        { predictionId: prediction.id },
        { 
          jobId: `eval-${prediction.id}`,
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 }
        }
      );
    }
  } catch (error) {
    console.error('Error finding expired predictions:', error);
  }
}

// Create worker for prediction evaluation
const predictionWorker = new Worker(
  'prediction-evaluation',
  async (job: Job) => {
    const { predictionId } = job.data;

    // Get prediction from database
    const prediction = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, predictionId))
      .limit(1);

    if (prediction.length === 0) {
      console.error(`Prediction ${predictionId} not found`);
      return;
    }

    await evaluatePrediction(prediction[0]);
  },
  { 
    connection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

// Create worker for finding expired predictions
const expiredPredictionsWorker = new Worker(
  'find-expired-predictions',
  async () => {
    await findExpiredPredictions();
  },
  { 
    connection,
    concurrency: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

// Error handling
predictionWorker.on('error', (error) => {
  console.error('Prediction worker error:', error);
});

expiredPredictionsWorker.on('error', (error) => {
  console.error('Expired predictions worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down prediction evaluation workers...');
  await predictionWorker.close();
  await expiredPredictionsWorker.close();
  await predictionEvaluationQueue.close();
  process.exit(0);
});

// Export functions for manual triggering
export async function triggerEvaluation(predictionId: string): Promise<void> {
  await predictionEvaluationQueue.add(
    'evaluate-prediction',
    { predictionId },
    { jobId: `manual-eval-${predictionId}` }
  );
}

export async function triggerExpiredSearch(): Promise<void> {
  await predictionEvaluationQueue.add(
    'find-expired-predictions',
    {},
    { jobId: 'manual-expired-search' }
  );
}

// Start the workers
console.log('Prediction evaluation workers started');

// Schedule regular expired prediction search
setInterval(async () => {
  await findExpiredPredictions();
}, 5 * 60 * 1000); // Every 5 minutes 