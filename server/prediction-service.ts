import { db } from './db';
import { predictions, assets, userProfiles, slotConfigs, users } from '../shared/schema';
import { eq, and, or, desc, asc, inArray, lt } from 'drizzle-orm';
import { getAssetPrice, getLiveAssetPrice } from './price-service';
import { getCurrentActiveSlot, isWithinActiveSlot, getSlotForDate, getPointsForSlot, isSlotValid } from './lib/slots.js';
import { sql } from 'drizzle-orm';

// Use the slot service functions instead of duplicating logic

export interface CreatePredictionInput {
  userId: string;
  assetSymbol: string;
  direction: 'up' | 'down';
  duration: '1h' | '3h' | '6h' | '24h' | '48h' | '1w' | '1m' | '3m' | '6m' | '1y';
}

export interface PredictionWithAsset {
  id: string;
  userId: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  direction: 'up' | 'down';
  duration: string; // Support all duration types
  slotNumber: number;
  slotStart: Date;
  slotEnd: Date;
  timestampCreated: Date;
  timestampExpiration: Date;
  status: 'active' | 'expired' | 'evaluated';
  result: 'pending' | 'correct' | 'incorrect';
  pointsAwarded: number | null;
  priceStart: number | null;
  priceEnd: number | null;
}

export interface SentimentData {
  slotNumber: number;
  upCount: number;
  downCount: number;
  totalCount: number;
}

// Create a new prediction
export async function createPrediction(input: CreatePredictionInput) {
  const { userId, assetSymbol, direction, duration } = input;

  // Check if user's email is verified
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.emailVerified) {
    throw new Error('Email verification required. Please verify your email before making predictions.');
  }

  // Get the asset
  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol),
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  if (!asset.isActive) {
    throw new Error('Asset is not available for predictions');
  }

  // Get current active slot using the new slot logic
  const activeSlot = getCurrentActiveSlot(duration);
  
  // Validate that we can make predictions for the current slot
  const isValid = isSlotValid(duration, activeSlot.slotNumber);
  if (!isValid) {
    throw new Error('Current slot is not valid for predictions - only current and future slots are allowed');
  }
  
  // Check if user already has a prediction for this asset, duration, and slot
  const existingPrediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.assetId, asset.id),
      eq(predictions.duration, duration),
      eq(predictions.slotNumber, activeSlot.slotNumber),
      eq(predictions.slotStart, activeSlot.slotStart.toJSDate())
    ),
  });

  if (existingPrediction) {
    throw new Error('You already have a prediction for this asset in the current slot');
  }

  // Check if we're within the active slot window
  if (!isWithinActiveSlot(new Date(), duration)) {
    throw new Error('No active slot available for this duration');
  }

  // Get live asset price immediately for accurate price_start
  console.log(`Fetching live price for ${assetSymbol} at prediction submission...`);
  const livePrice = await getLiveAssetPrice(assetSymbol);
  if (!livePrice) {
    console.error(`Failed to get live price for ${assetSymbol}, falling back to cached price`);
    // Fallback to cached price if live price fails
    const cachedPrice = await getAssetPrice(assetSymbol);
    if (!cachedPrice) {
      throw new Error('Unable to get current asset price');
    }
  }

  const currentPrice = livePrice || await getAssetPrice(assetSymbol);
  if (!currentPrice) {
    throw new Error('Unable to get current asset price');
  }

  console.log(`Prediction submission - ${assetSymbol} price_start: ${currentPrice}`);

  // Create prediction
  const [prediction] = await db.insert(predictions).values({
    userId,
    assetId: asset.id,
    direction,
    duration,
    slotNumber: activeSlot.slotNumber,
    slotStart: activeSlot.slotStart.toJSDate(),
    slotEnd: activeSlot.slotEnd.toJSDate(),
    timestampExpiration: activeSlot.slotEnd.toJSDate(),
    priceStart: currentPrice.toString(),
  }).returning();

  // Update user's total predictions count (increment by 1)
  try {
    console.log(`Updating prediction count for user ${userId} - incrementing totalPredictions`);
    
    // First check if user profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    
    if (!existingProfile) {
      console.log(`No user profile found for ${userId}, creating one...`);
      await db.insert(userProfiles).values({
        userId,
        totalPredictions: 1,
      });
      console.log(`Created user profile for ${userId} with totalPredictions: 1`);
    } else {
      console.log(`Existing profile for ${userId}: totalPredictions = ${existingProfile.totalPredictions}`);
      
      const [updatedProfile] = await db.update(userProfiles)
        .set({
          totalPredictions: sql`${userProfiles.totalPredictions} + 1`
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
      
      console.log(`Successfully updated user profile for ${userId}. New totalPredictions: ${updatedProfile?.totalPredictions}`);
    }
  } catch (error) {
    console.error(`Failed to update user profile prediction count for ${userId}:`, error);
    // Non-critical error - prediction was created successfully
  }

  // Broadcast prediction update via WebSocket for real-time sentiment updates
  try {
    // Note: WebSocket service needs to be properly initialized in the main server
    // For now, we'll skip broadcasting to avoid import issues
    console.log('Prediction created - WebSocket broadcast would happen here');
  } catch (error) {
    console.error('Failed to broadcast prediction update:', error);
    // Non-critical error - prediction was created successfully
  }

  return prediction;
}

// Get user's predictions
export async function getUserPredictions(userId: string, options?: {
  status?: 'active' | 'expired' | 'evaluated';
  assetSymbol?: string;
  limit?: number;
  offset?: number;
}) {
  const { status, assetSymbol, limit = 50, offset = 0 } = options || {};

  let whereConditions = [eq(predictions.userId, userId)];

  if (status) {
    whereConditions.push(eq(predictions.status, status));
  }

  if (assetSymbol) {
    // We can't filter by asset symbol directly in the query due to the join
    // We'll filter after fetching the data
  }

  const userPredictions = await db.query.predictions.findMany({
    where: and(...whereConditions),
    orderBy: [desc(predictions.timestampCreated)],
    limit,
    offset,
  });

  // Get assets for the predictions
  const assetIds = Array.from(new Set(userPredictions.map(pred => pred.assetId)));
  let assetsData: any[] = [];
  if (assetIds.length > 0) {
    assetsData = await db.query.assets.findMany({
      where: inArray(assets.id, assetIds),
    });
  }
  const assetMap = new Map(assetsData.map(asset => [asset.id, asset]));

  // Filter by asset symbol if provided
  let filteredPredictions = userPredictions;
  if (assetSymbol) {
    filteredPredictions = userPredictions.filter(pred => {
      const asset = assetMap.get(pred.assetId);
      return asset && asset.symbol === assetSymbol;
    });
  }

  return filteredPredictions.map(pred => {
    const asset = assetMap.get(pred.assetId);
    return {
      id: pred.id,
      userId: pred.userId,
      assetId: pred.assetId,
      asset: {
        name: asset?.name || 'Unknown',
        symbol: asset?.symbol || 'Unknown',
        type: asset?.type || 'Unknown',
      },
      direction: pred.direction,
      duration: pred.duration,
      slotNumber: pred.slotNumber,
      slotStart: pred.slotStart,
      slotEnd: pred.slotEnd,
      timestampCreated: pred.timestampCreated,
      timestampExpiration: pred.timestampExpiration,
      status: pred.status,
      result: pred.result,
      pointsAwarded: pred.pointsAwarded,
      priceStart: pred.priceStart,
      priceEnd: pred.priceEnd,
    };
  });
}

// Get predictions for sentiment chart
export async function getSentimentData(assetSymbol: string, duration: string): Promise<SentimentData[]> {
  console.log(`getSentimentData: Fetching sentiment for ${assetSymbol} with duration ${duration}`);
  
  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol),
  });

  if (!asset) {
    console.log(`getSentimentData: Asset not found for symbol ${assetSymbol}`);
    throw new Error('Asset not found');
  }

  console.log(`getSentimentData: Found asset:`, { id: asset.id, symbol: asset.symbol, name: asset.name, type: asset.type });

  // Get all predictions for this asset and duration
  const allPredictions = await db.query.predictions.findMany({
    where: and(
      eq(predictions.assetId, asset.id),
      eq(predictions.duration, duration as "1h" | "3h" | "6h" | "24h" | "48h" | "1w" | "1m" | "3m" | "6m" | "1y")
    ),
  });

  console.log(`getSentimentData: Found ${allPredictions.length} predictions for ${assetSymbol} with duration ${duration}`);

  // Group predictions by slot
  const slotData = new Map<number, { up: number; down: number }>();

  // Count predictions by slot and direction
  allPredictions.forEach(prediction => {
    if (!slotData.has(prediction.slotNumber)) {
      slotData.set(prediction.slotNumber, { up: 0, down: 0 });
    }
    
    const slot = slotData.get(prediction.slotNumber)!;
    if (prediction.direction === 'up') {
      slot.up++;
    } else {
      slot.down++;
    }
  });

  console.log(`getSentimentData: Slot data:`, Object.fromEntries(slotData));

  // Convert to array format and sort by slot number
  const result = Array.from(slotData.entries())
    .map(([slotNumber, counts]) => ({
      slotNumber,
      upCount: counts.up,
      downCount: counts.down,
      totalCount: counts.up + counts.down,
    }))
    .sort((a, b) => a.slotNumber - b.slotNumber);

  console.log(`getSentimentData: Final result:`, result);
  return result;
}

// Evaluate expired predictions
export async function evaluateExpiredPredictions() {
  try {
    console.log('Starting prediction evaluation...');
    
    // Get all expired predictions that haven't been evaluated
    const expiredPredictions = await db.query.predictions.findMany({
      where: and(
        eq(predictions.status, 'active'),
        lt(predictions.timestampExpiration, new Date())
      ),
    });

    console.log(`Found ${expiredPredictions.length} expired predictions to evaluate`);

    for (const prediction of expiredPredictions) {
      try {
        await evaluatePrediction(prediction.id);
      } catch (error) {
        console.error(`Failed to evaluate prediction ${prediction.id}:`, error);
      }
    }

    console.log('Prediction evaluation completed');
  } catch (error) {
    console.error('Error in prediction evaluation:', error);
  }
}

// Evaluate a single prediction
export async function evaluatePrediction(predictionId: string) {
  try {
    // Get the prediction
    const prediction = await db.query.predictions.findFirst({
      where: eq(predictions.id, predictionId),
    });

    if (!prediction) {
      throw new Error('Prediction not found');
    }

    // Get the asset
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, prediction.assetId),
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Get current asset price
    const currentPrice = await getLiveAssetPrice(asset.symbol) || await getAssetPrice(asset.symbol);
    
    if (!currentPrice) {
      throw new Error('No current price available');
    }

    // Get the prediction's start and end prices
    const priceStart = parseFloat(prediction.priceStart || '0');
    const priceEnd = parseFloat(currentPrice.toString());

    if (!priceStart || !priceEnd) {
      throw new Error('Missing price data');
    }

    // Determine if prediction was correct
    let result: 'correct' | 'incorrect' = 'incorrect';
    let pointsAwarded = 0;

    if (prediction.direction === 'up' && priceEnd > priceStart) {
      result = 'correct';
    } else if (prediction.direction === 'down' && priceEnd < priceStart) {
      result = 'correct';
    }

    // Calculate points based on slot timing and result
    if (result === 'correct') {
      // Import slot service to get points calculation
      const { getPointsForSlot } = await import('./slot-service');
      pointsAwarded = getPointsForSlot(prediction.duration as any, prediction.slotNumber);
    } else {
      // Penalty for incorrect prediction (50% of slot points, minimum -1)
      const { getPointsForSlot } = await import('./slot-service');
      const slotPoints = getPointsForSlot(prediction.duration as any, prediction.slotNumber);
      pointsAwarded = Math.max(-1, Math.floor(-slotPoints / 2));
    }

    // Update prediction with result
    await db.update(predictions)
      .set({
        status: 'evaluated',
        result,
        pointsAwarded,
        priceEnd: priceEnd.toString(),
        evaluatedAt: new Date(),
      })
      .where(eq(predictions.id, prediction.id));

    // Update user profile with new score
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, prediction.userId),
    });

    if (userProfile) {
      const newMonthlyScore = (userProfile.monthlyScore || 0) + pointsAwarded;
      const newTotalPredictions = (userProfile.totalPredictions || 0) + 1;
      const newCorrectPredictions = (userProfile.correctPredictions || 0) + (result === 'correct' ? 1 : 0);

      await db.update(userProfiles)
        .set({
          monthlyScore: newMonthlyScore,
          totalPredictions: newTotalPredictions,
          correctPredictions: newCorrectPredictions,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, prediction.userId));

      console.log(`Updated user ${prediction.userId} profile: score=${newMonthlyScore}, predictions=${newTotalPredictions}, correct=${newCorrectPredictions}`);
    }

    // Check and award badges after updating user profile
    try {
      const { checkAndAwardBadges } = await import('./badge-service');
      const newBadges = await checkAndAwardBadges(prediction.userId);
      
      if (newBadges.length > 0) {
        console.log(`User ${prediction.userId} earned ${newBadges.length} new badges:`, newBadges.map(b => b.badgeName));
        
        // TODO: Broadcast badge notification via WebSocket
        // if (wsService) {
        //   wsService.broadcastToUser(prediction.userId, 'badge-earned', {
        //     badges: newBadges,
        //     message: `Congratulations! You earned ${newBadges.length} new badge${newBadges.length > 1 ? 's' : ''}!`
        //   });
        // }
      }
    } catch (error) {
      console.error(`Error checking badges for user ${prediction.userId}:`, error);
      // Don't fail the prediction evaluation if badge checking fails
    }

    // Broadcast leaderboard update via WebSocket
    try {
      // Note: WebSocket service needs to be properly initialized in the main server
      // For now, we'll skip broadcasting to avoid import issues
      console.log(`Leaderboard update for user ${prediction.userId} - WebSocket broadcast would happen here`);
    } catch (error) {
      console.error('Failed to broadcast leaderboard update:', error);
      // Non-critical error
    }

    console.log(`Prediction ${prediction.id} evaluated: ${result}, points: ${pointsAwarded}`);
    return { result, pointsAwarded };

  } catch (error) {
    console.error(`Error evaluating prediction ${predictionId}:`, error);
    throw error;
  }
}

// Get prediction statistics for a user
export async function getUserPredictionStats(userId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!profile) {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracyPercentage: 0,
      monthlyScore: 0,
      totalScore: 0,
    };
  }

  const accuracyPercentage = profile.totalPredictions > 0 
    ? (profile.correctPredictions / profile.totalPredictions) * 100 
    : 0;

  return {
    totalPredictions: profile.totalPredictions,
    correctPredictions: profile.correctPredictions,
    accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
    monthlyScore: profile.monthlyScore,
    totalScore: profile.totalScore,
  };
}

// Get active predictions count for a user
export async function getActivePredictionsCount(userId: string): Promise<number> {
  const count = await db.query.predictions.findMany({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.status, 'active')
    ),
  });

  return count.length;
} 