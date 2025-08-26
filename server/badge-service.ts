import { db } from './db';
import { userBadges, users, userProfiles, predictions, monthlyLeaderboards } from '../shared/schema';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';

// Badge types and their rules
export interface BadgeRule {
  type: string;
  name: string;
  description: string;
  condition: (userStats: UserStats) => boolean;
  metadata?: Record<string, any>;
}

export interface UserStats {
  userId: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracyPercentage: number;
  currentStreak: number;
  bestStreak: number;
  monthlyScore: number;
  totalScore: number;
}

// Badge rules definition
export const BADGE_RULES: BadgeRule[] = [
  {
    type: 'starter',
    name: 'Starter',
    description: 'First correct prediction',
    condition: (stats) => stats.correctPredictions >= 1,
    metadata: { milestone: 1 }
  },
  {
    type: 'streak_3',
    name: 'Streak 3',
    description: '3 consecutive correct predictions',
    condition: (stats) => stats.currentStreak >= 3,
    metadata: { streakCount: 3 }
  },
  {
    type: 'streak_5',
    name: 'Streak 5',
    description: '5 consecutive correct predictions',
    condition: (stats) => stats.currentStreak >= 5,
    metadata: { streakCount: 5 }
  },
  {
    type: 'streak_10',
    name: 'Streak 10',
    description: '10 consecutive correct predictions',
    condition: (stats) => stats.currentStreak >= 10,
    metadata: { streakCount: 10 }
  },
  {
    type: 'accuracy_70',
    name: 'Accuracy 70',
    description: '70% or higher hit rate over last 20 resolved predictions',
    condition: (stats) => stats.accuracyPercentage >= 70 && stats.totalPredictions >= 20,
    metadata: { accuracyThreshold: 70, minPredictions: 20 }
  },
  {
    type: 'accuracy_80',
    name: 'Accuracy 80',
    description: '80% or higher hit rate over last 20 resolved predictions',
    condition: (stats) => stats.accuracyPercentage >= 80 && stats.totalPredictions >= 20,
    metadata: { accuracyThreshold: 80, minPredictions: 20 }
  },
  {
    type: 'accuracy_90',
    name: 'Accuracy 90',
    description: '90% or higher hit rate over last 20 resolved predictions',
    condition: (stats) => stats.accuracyPercentage >= 90 && stats.totalPredictions >= 20,
    metadata: { accuracyThreshold: 90, minPredictions: 20 }
  },
  {
    type: 'volume_10',
    name: 'Volume 10',
    description: 'Ten predictions resolved',
    condition: (stats) => stats.totalPredictions >= 10,
    metadata: { milestone: 10 }
  },
  {
    type: 'volume_25',
    name: 'Volume 25',
    description: 'Twenty-five predictions resolved',
    condition: (stats) => stats.totalPredictions >= 25,
    metadata: { milestone: 25 }
  },
  {
    type: 'volume_50',
    name: 'Volume 50',
    description: 'Fifty predictions resolved',
    condition: (stats) => stats.totalPredictions >= 50,
    metadata: { milestone: 50 }
  },
  {
    type: 'volume_100',
    name: 'Volume 100',
    description: 'One hundred predictions resolved',
    condition: (stats) => stats.totalPredictions >= 100,
    metadata: { milestone: 100 }
  }
];

// Get user statistics for badge evaluation
export async function getUserStatsForBadges(userId: string): Promise<UserStats> {
  try {
    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    if (!profile) {
      throw new Error(`User profile not found for userId: ${userId}`);
    }

    // Calculate accuracy percentage
    const accuracyPercentage = profile.totalPredictions > 0 
      ? (profile.correctPredictions / profile.totalPredictions) * 100 
      : 0;

    // Get current streak from recent predictions
    const currentStreak = await getCurrentStreak(userId);
    
    // Get best streak from all time
    const bestStreak = await getBestStreak(userId);

    return {
      userId,
      totalPredictions: profile.totalPredictions || 0,
      correctPredictions: profile.correctPredictions || 0,
      accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
      currentStreak,
      bestStreak,
      monthlyScore: profile.monthlyScore || 0,
      totalScore: profile.totalScore || 0,
    };
  } catch (error) {
    console.error(`Error getting user stats for badges:`, error);
    throw error;
  }
}

// Get current streak of correct predictions
async function getCurrentStreak(userId: string): Promise<number> {
  try {
    const recentPredictions = await db.query.predictions.findMany({
      where: and(
        eq(predictions.userId, userId),
        eq(predictions.status, 'evaluated')
      ),
      orderBy: [desc(predictions.evaluatedAt)],
      limit: 20, // Check last 20 predictions for streak
    });

    let streak = 0;
    for (const prediction of recentPredictions) {
      if (prediction.result === 'correct') {
        streak++;
      } else {
        break; // Streak ends on first incorrect prediction
      }
    }

    return streak;
  } catch (error) {
    console.error(`Error calculating current streak for user ${userId}:`, error);
    return 0;
  }
}

// Get best streak of all time
async function getBestStreak(userId: string): Promise<number> {
  try {
    const allPredictions = await db.query.predictions.findMany({
      where: and(
        eq(predictions.userId, userId),
        eq(predictions.status, 'evaluated')
      ),
      orderBy: [asc(predictions.evaluatedAt)],
    });

    let bestStreak = 0;
    let currentStreak = 0;

    for (const prediction of allPredictions) {
      if (prediction.result === 'correct') {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return bestStreak;
  } catch (error) {
    console.error(`Error calculating best streak for user ${userId}:`, error);
    return 0;
  }
}

// Check and award badges for a user
export async function checkAndAwardBadges(userId: string): Promise<Array<{
  badgeType: string;
  badgeName: string;
  badgeDescription: string;
  metadata?: Record<string, any>;
}>> {
  try {
    console.log(`Checking badges for user: ${userId}`);
    
    // Get user stats
    const userStats = await getUserStatsForBadges(userId);
    
    // Get existing badges
    const existingBadges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
    });

    const existingBadgeTypes = new Set(existingBadges.map(badge => badge.badgeType));
    const newlyAwardedBadges: Array<{
      badgeType: string;
      badgeName: string;
      badgeDescription: string;
      metadata?: Record<string, any>;
    }> = [];

    // Check each badge rule
    for (const rule of BADGE_RULES) {
      // Skip if user already has this badge
      if (existingBadgeTypes.has(rule.type)) {
        continue;
      }

      // Check if user meets the condition
      if (rule.condition(userStats)) {
        console.log(`User ${userId} earned badge: ${rule.name}`);
        
        // Award the badge
        await awardBadge(userId, rule, 'lifetime');
        
        newlyAwardedBadges.push({
          badgeType: rule.type,
          badgeName: rule.name,
          badgeDescription: rule.description,
          metadata: rule.metadata,
        });
      }
    }

    console.log(`User ${userId} earned ${newlyAwardedBadges.length} new badges`);
    return newlyAwardedBadges;
    
  } catch (error) {
    console.error(`Error checking badges for user ${userId}:`, error);
    throw error;
  }
}

// Award a badge to a user
async function awardBadge(
  userId: string, 
  rule: BadgeRule, 
  monthYear: string = 'lifetime'
): Promise<void> {
  try {
    await db.insert(userBadges).values({
      userId,
      badgeType: rule.type,
      badgeName: rule.name,
      badgeDescription: rule.description,
      monthYear,
      metadata: rule.metadata,
    });

    console.log(`Badge ${rule.name} awarded to user ${userId}`);
  } catch (error) {
    console.error(`Error awarding badge ${rule.name} to user ${userId}:`, error);
    throw error;
  }
}

// Get user's badges
export async function getUserBadges(userId: string): Promise<Array<{
  badgeType: string;
  badgeName: string;
  badgeDescription: string;
  monthYear: string;
  rank?: number;
  totalScore?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}>> {
  try {
    const badges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
      orderBy: [desc(userBadges.createdAt)],
    });

    return badges.map(badge => ({
      badgeType: badge.badgeType,
      badgeName: badge.badgeName,
      badgeDescription: badge.badgeDescription,
      monthYear: badge.monthYear,
      rank: badge.rank || undefined,
      totalScore: badge.totalScore || undefined,
      metadata: badge.metadata || undefined,
      createdAt: badge.createdAt || new Date(),
    }));
  } catch (error) {
    console.error(`Error getting badges for user ${userId}:`, error);
    throw error;
  }
}

// Award ranking badges (1st, 2nd, 3rd place) for monthly leaderboard
export async function awardRankingBadges(monthYear: string): Promise<void> {
  try {
    console.log(`Awarding ranking badges for month: ${monthYear}`);
    
    // Get top 4 users from monthly leaderboard
    const topUsers = await db.query.monthlyLeaderboards.findMany({
      where: eq(monthlyLeaderboards.monthYear, monthYear),
      orderBy: [asc(monthlyLeaderboards.rank)],
      limit: 4,
    });

    const badgeTypes = ['1st_place', '2nd_place', '3rd_place', '4th_place'];

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const badgeType = badgeTypes[i];
      
      // Check if user already has this badge for this month
      const existingBadge = await db.query.userBadges.findFirst({
        where: and(
          eq(userBadges.userId, user.userId),
          eq(userBadges.badgeType, badgeType),
          eq(userBadges.monthYear, monthYear)
        ),
      });

      if (!existingBadge) {
        await db.insert(userBadges).values({
          userId: user.userId,
          badgeType,
          badgeName: `${i + 1}${getOrdinalSuffix(i + 1)} Place`,
          badgeDescription: `Finished ${i + 1}${getOrdinalSuffix(i + 1)} in ${monthYear} leaderboard`,
          monthYear,
          rank: user.rank,
          totalScore: user.totalScore,
        });

        console.log(`Ranking badge ${badgeType} awarded to user ${user.userId} for ${monthYear}`);
      }
    }
  } catch (error) {
    console.error(`Error awarding ranking badges for ${monthYear}:`, error);
    throw error;
  }
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(num: number): string {
  if (num >= 11 && num <= 13) return 'th';
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Backfill badges for existing users based on historical data
export async function backfillBadgesForExistingUsers(): Promise<{
  totalUsers: number;
  usersWithNewBadges: number;
  totalBadgesAwarded: number;
}> {
  try {
    console.log('Starting badge backfill for existing users...');
    
    // Get all users with profiles
    const userProfiles = await db.query.userProfiles.findMany();
    
    let usersWithNewBadges = 0;
    let totalBadgesAwarded = 0;

    for (const profile of userProfiles) {
      try {
        const newBadges = await checkAndAwardBadges(profile.userId);
        if (newBadges.length > 0) {
          usersWithNewBadges++;
          totalBadgesAwarded += newBadges.length;
        }
      } catch (error) {
        console.error(`Error processing badges for user ${profile.userId}:`, error);
      }
    }

    const result = {
      totalUsers: userProfiles.length,
      usersWithNewBadges,
      totalBadgesAwarded,
    };

    console.log('Badge backfill completed:', result);
    return result;
    
  } catch (error) {
    console.error('Error during badge backfill:', error);
    throw error;
  }
}

// Get badge statistics for admin dashboard
export async function getBadgeStatistics(): Promise<{
  totalBadgesAwarded: number;
  badgesByType: Record<string, number>;
  recentBadges: Array<{
    userId: string;
    badgeType: string;
    badgeName: string;
    createdAt: Date;
  }>;
}> {
  try {
    // Get total badges count
    const totalBadges = await db.select({ count: count() }).from(userBadges);
    
    // Get badges by type
    const badgesByType = await db.select({
      badgeType: userBadges.badgeType,
      count: count(),
    }).from(userBadges).groupBy(userBadges.badgeType);
    
    // Get recent badges
    const recentBadges = await db.query.userBadges.findMany({
      orderBy: [desc(userBadges.createdAt)],
      limit: 10,
    });

    const badgesByTypeMap: Record<string, number> = {};
    badgesByType.forEach(item => {
      badgesByTypeMap[item.badgeType] = Number(item.count);
    });

    return {
      totalBadgesAwarded: Number(totalBadges[0]?.count || 0),
      badgesByType: badgesByTypeMap,
      recentBadges: recentBadges.map(badge => ({
        userId: badge.userId,
        badgeType: badge.badgeType,
        badgeName: badge.badgeName,
        createdAt: badge.createdAt || new Date(),
      })),
    };
  } catch (error) {
    console.error('Error getting badge statistics:', error);
    throw error;
  }
}