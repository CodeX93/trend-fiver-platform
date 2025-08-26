import { db } from './db';
import { users, userProfiles, emailVerifications, predictions, assets, assetPrices, monthlyLeaderboards } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function getAdminStats() {
  console.log('getAdminStats: Fetching admin statistics...');
  
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
  const totalPredictions = await db.select({ count: sql<number>`count(*)` }).from(predictions);
  const totalAssets = await db.select({ count: sql<number>`count(*)` }).from(assets);
  
  const verifiedUsers = await db.select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.emailVerified, true));

  // Get top assets by prediction count
  const topAssets = await db
    .select({
      symbol: assets.symbol,
      predictionCount: sql<number>`count(${predictions.id})`,
    })
    .from(assets)
    .leftJoin(predictions, eq(assets.id, predictions.assetId))
    .groupBy(assets.symbol)
    .orderBy(desc(sql<number>`count(${predictions.id})`))
    .limit(5);

  const stats = {
    totalUsers: totalUsers[0]?.count || 0,
    totalPredictions: totalPredictions[0]?.count || 0,
    totalAssets: totalAssets[0]?.count || 0,
    verifiedUsers: verifiedUsers[0]?.count || 0,
    unverifiedUsers: (totalUsers[0]?.count || 0) - (verifiedUsers[0]?.count || 0),
    topAssets: topAssets.map(asset => ({
      symbol: asset.symbol,
      predictionCount: asset.predictionCount || 0,
    })),
  };

  console.log('getAdminStats: Statistics:', stats);
  return stats;
}

export async function getAllUsers() {
  console.log('getAllUsers: Fetching users with profiles...');
  
  // Get all users with their profiles to include prediction counts
  const usersWithProfiles = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      // Profile data
      monthlyScore: userProfiles.monthlyScore,
      totalScore: userProfiles.totalScore,
      totalPredictions: userProfiles.totalPredictions,
      correctPredictions: userProfiles.correctPredictions,
      lastMonthRank: userProfiles.lastMonthRank,
      followersCount: userProfiles.followersCount,
      followingCount: userProfiles.followingCount,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .orderBy(desc(users.createdAt));

  console.log(`getAllUsers: Found ${usersWithProfiles.length} users with profiles`);
  console.log('getAllUsers: Sample user data:', usersWithProfiles.slice(0, 2).map(u => ({
    username: u.username,
    totalPredictions: u.totalPredictions || 0,
    totalScore: u.totalScore || 0
  })));

  // Ensure null values are converted to 0 for display
  return usersWithProfiles.map(user => ({
    ...user,
    totalPredictions: user.totalPredictions || 0,
    totalScore: user.totalScore || 0,
    correctPredictions: user.correctPredictions || 0,
    monthlyScore: user.monthlyScore || 0,
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
  }));
}

export async function updateUser(userId: string, updates: Partial<typeof users.$inferInsert>) {
  const [updatedUser] = await db.update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();
  
  return updatedUser;
}



export async function verifyUserEmail(userId: string) {
  // Update user email verification status
  const [updatedUser] = await db.update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId))
    .returning();

  // Mark all verification tokens as used
  await db.update(emailVerifications)
    .set({ verified: true })
    .where(eq(emailVerifications.userId, userId));

  return updatedUser;
}

export async function deactivateUser(userId: string) {
  const [updatedUser] = await db.update(users)
    .set({ isActive: false })
    .where(eq(users.id, userId))
    .returning();
  
  return updatedUser;
}

export async function activateUser(userId: string) {
  const [updatedUser] = await db.update(users)
    .set({ isActive: true })
    .where(eq(users.id, userId))
    .returning();
  
  return updatedUser;
}

export async function getAllPredictions() {
  return await db
    .select({
      id: predictions.id,
      userId: predictions.userId,
      assetId: predictions.assetId,
      direction: predictions.direction,
      duration: predictions.duration,
      slotNumber: predictions.slotNumber,
      status: predictions.status,
      result: predictions.result,
      pointsAwarded: predictions.pointsAwarded,
      createdAt: predictions.createdAt,
      evaluatedAt: predictions.evaluatedAt,
      // User information
      username: users.username,
      email: users.email,
      // Asset information
      assetName: assets.name,
      assetSymbol: assets.symbol,
    })
    .from(predictions)
    .leftJoin(users, eq(predictions.userId, users.id))
    .leftJoin(assets, eq(predictions.assetId, assets.id))
    .orderBy(desc(predictions.createdAt));
}

export async function getAllPredictionsWithFilters(filters: {
  asset?: string;
  duration?: string;
  slot?: string;
  status?: string;
  result?: string;
}) {
  const conditions = [];
  
  if (filters.asset) {
    conditions.push(eq(predictions.assetId, filters.asset));
  }
  
  if (filters.duration) {
    conditions.push(eq(predictions.duration, filters.duration as any));
  }
  
  if (filters.slot) {
    conditions.push(eq(predictions.slotNumber, parseInt(filters.slot)));
  }
  
  if (filters.status) {
    conditions.push(eq(predictions.status, filters.status as any));
  }
  
  if (filters.result) {
    conditions.push(eq(predictions.result, filters.result as any));
  }
  
  const baseQuery = db
    .select({
      id: predictions.id,
      userId: predictions.userId,
      assetId: predictions.assetId,
      direction: predictions.direction,
      duration: predictions.duration,
      slotNumber: predictions.slotNumber,
      status: predictions.status,
      result: predictions.result,
      pointsAwarded: predictions.pointsAwarded,
      createdAt: predictions.createdAt,
      evaluatedAt: predictions.evaluatedAt,
      // User information
      username: users.username,
      email: users.email,
      // Asset information
      assetName: assets.name,
      assetSymbol: assets.symbol,
    })
    .from(predictions)
    .leftJoin(users, eq(predictions.userId, users.id))
    .leftJoin(assets, eq(predictions.assetId, assets.id));
  
  if (conditions.length > 0) {
    return await baseQuery.where(and(...conditions)).orderBy(desc(predictions.createdAt));
  }
  
  return await baseQuery.orderBy(desc(predictions.createdAt));
}

export async function getAllAssets() {
  return await db.select().from(assets).orderBy(desc(assets.createdAt));
}

export async function updateAssetPrice(assetId: string, price: number) {
  // Since assets table doesn't have currentPrice, we'll add a new price record
  const [newPrice] = await db.insert(assetPrices).values({
    assetId,
    price: price.toString(),
    timestamp: new Date(),
    source: 'admin',
  }).returning();
  
  return newPrice;
}

// Add missing functions that are imported in routes.ts
export async function getUserDetails(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user;
}

export async function getUserPredictions(userId: string) {
  return await db.select().from(predictions).where(eq(predictions.userId, userId)).orderBy(desc(predictions.createdAt));
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const [updatedUser] = await db.update(users)
    .set({ isActive })
    .where(eq(users.id, userId))
    .returning();
  
  return updatedUser;
}

export async function manuallyEvaluatePrediction(predictionId: string) {
  // This would implement manual prediction evaluation logic
  // For now, return a placeholder
  return { success: true, message: 'Prediction evaluation triggered' };
}

export async function updateAsset(assetId: string, updates: any) {
  const [updatedAsset] = await db.update(assets)
    .set(updates)
    .where(eq(assets.id, assetId))
    .returning();
  
  return updatedAsset;
}

export async function addAsset(assetData: any) {
  const [newAsset] = await db.insert(assets).values(assetData).returning();
  return newAsset;
}

export async function getAssetPriceHistory(assetId: string) {
  return await db.select().from(assetPrices).where(eq(assetPrices.assetId, assetId)).orderBy(desc(assetPrices.timestamp));
}

export async function getAdminAssetPriceHistory(assetId: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await db.select().from(assetPrices)
    .where(and(
      eq(assetPrices.assetId, assetId),
      sql`${assetPrices.timestamp} >= ${startDate}`
    ))
    .orderBy(desc(assetPrices.timestamp));
}

export async function getAllPricesWithFilters(filters: {
  asset?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}) {
  const conditions = [];
  
  if (filters.asset) {
    conditions.push(eq(assetPrices.assetId, filters.asset));
  }
  
  if (filters.source) {
    conditions.push(eq(assetPrices.source, filters.source));
  }
  
  if (filters.startDate) {
    conditions.push(sql`${assetPrices.timestamp} >= ${new Date(filters.startDate)}`);
  }
  
  if (filters.endDate) {
    conditions.push(sql`${assetPrices.timestamp} <= ${new Date(filters.endDate)}`);
  }
  
  if (conditions.length > 0) {
    return await db.select().from(assetPrices).where(and(...conditions)).orderBy(desc(assetPrices.timestamp));
  }
  
  return await db.select().from(assetPrices).orderBy(desc(assetPrices.timestamp));
}

export async function getLeaderboardData() {
  return await db.select().from(monthlyLeaderboards).orderBy(desc(monthlyLeaderboards.monthYear));
}

export async function getBadgeData() {
  // This would return badge-related data
  // For now, return a placeholder
  return { badges: [] };
}

export async function triggerPriceUpdate() {
  try {
    console.log('Admin triggered manual price update at:', new Date().toISOString());
    
    // Import price service functions
    const { updateAllPrices, updateForexPrices } = await import('./price-service');
    
    // Start the price update process
    const startTime = Date.now();
    
    // Update all prices (crypto, stocks, forex)
    await updateAllPrices();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log the successful update
    console.log(`Manual price update completed successfully in ${duration}ms`);
    
    // Get updated asset count for verification
    const { getAllAssets } = await import('./price-service');
    const assets = await getAllAssets();
    const activeAssets = assets.filter(asset => asset.isActive);
    
    const result = {
      success: true,
      message: 'Price update completed successfully',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      assetsUpdated: activeAssets.length,
      details: {
        crypto: activeAssets.filter(asset => asset.type === 'crypto').length,
        stocks: activeAssets.filter(asset => asset.type === 'stock').length,
        forex: activeAssets.filter(asset => asset.type === 'forex').length
      }
    };
    
    console.log('Price update result:', result);
    return result;
    
  } catch (error) {
    console.error('Manual price update failed:', error);
    
    const errorResult = {
      success: false,
      message: 'Price update failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check server logs for more information'
    };
    
    console.error('Price update error result:', errorResult);
    return errorResult;
  }
}

export async function getSystemHealth() {
  // This would check system health
  // For now, return a placeholder
  return { status: 'healthy', timestamp: new Date() };
}

export async function getUnverifiedUsers() {
  return await db.select().from(users).where(eq(users.emailVerified, false)).orderBy(desc(users.createdAt));
}

export async function getMonthlyLeaderboardStats() {
  const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  return await db.select().from(monthlyLeaderboards).where(eq(monthlyLeaderboards.monthYear, monthYear)).orderBy(desc(monthlyLeaderboards.totalScore)).limit(10);
}

export async function getTopAssetsByVolume() {
  const result = await db.select({
    symbol: assets.symbol,
    name: assets.name,
    predictionCount: sql<number>`count(${predictions.id})`
  })
  .from(assets)
  .leftJoin(predictions, eq(assets.id, predictions.assetId))
  .groupBy(assets.id, assets.symbol, assets.name)
  .orderBy(desc(sql<number>`count(${predictions.id})`))
  .limit(5);
  
  return result;
}

export async function getActiveSlots() {
  const now = new Date();
  const durations: ('24h' | '7d' | '30d')[] = ['24h', '7d', '30d'];
  const activeSlots = [];
  
  for (const duration of durations) {
    const currentSlot = getCurrentSlot(duration);
    const { start, end } = getSlotTimes(duration, currentSlot);
    
    activeSlots.push({
      duration,
      currentSlot,
      startTime: start,
      endTime: end,
      timeRemaining: end.getTime() - now.getTime()
    });
  }
  
  return activeSlots;
}

function getCurrentSlot(duration: '24h' | '7d' | '30d'): number {
  const now = new Date();
  
  if (duration === '24h') {
    const hour = now.getHours();
    return Math.floor(hour / 3) + 1;
  }
  
  return 1; // Default for other durations
}

function getSlotTimes(duration: '24h' | '7d' | '30d', slotNumber: number): { start: Date; end: Date } {
  const now = new Date();
  
  if (duration === '24h') {
    const startHour = (slotNumber - 1) * 3;
    const endHour = startHour + 3;
    
    const start = new Date(now);
    start.setHours(startHour, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(endHour, 0, 0, 0);
    
    return { start, end };
  }
  
  // Default fallback
  return { start: now, end: new Date(now.getTime() + 3 * 60 * 60 * 1000) };
} 