import { db } from './db';
import { userProfiles, monthlyLeaderboards, userBadges, monthlyScores, users } from '../shared/schema';
import { eq, and, desc, asc, gte, lte, gt, inArray } from 'drizzle-orm';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracyPercentage: number;
  badges: string[];
}

export interface MonthlyScoreEntry {
  monthYear: string;
  score: number;
  rank: number;
  totalPredictions: number;
  correctPredictions: number;
}

// Get current month-year string
function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get previous month-year string
function getPreviousMonthYear(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

// Get monthly leaderboard (Top 30)
export async function getMonthlyLeaderboard(monthYear?: string): Promise<LeaderboardEntry[]> {
  const targetMonth = monthYear || getPreviousMonthYear();
  
  const leaderboard = await db.query.monthlyLeaderboards.findMany({
    where: eq(monthlyLeaderboards.monthYear, targetMonth),
    orderBy: [asc(monthlyLeaderboards.rank)],
    limit: 30,
  });

  // Get badges for each user
  const userIds = leaderboard.map(entry => entry.userId);
  let badges: Array<{ userId: string; badgeType: string }> = [];
  if (userIds.length > 0) {
    badges = await db.query.userBadges.findMany({
      where: eq(userBadges.monthYear, targetMonth),
    });
  }

  const badgeMap = new Map<string, string[]>();
  badges.forEach(badge => {
    if (!badgeMap.has(badge.userId)) {
      badgeMap.set(badge.userId, []);
    }
    badgeMap.get(badge.userId)!.push(badge.badgeType);
  });

  return leaderboard.map(entry => ({
    rank: entry.rank,
    userId: entry.userId,
    username: entry.username,
    totalScore: entry.totalScore,
    totalPredictions: entry.totalPredictions,
    correctPredictions: entry.correctPredictions,
    accuracyPercentage: parseFloat(entry.accuracyPercentage?.toString() || '0'),
    badges: badgeMap.get(entry.userId) || [],
  }));
}

// Get user's rank for a specific month
export async function getUserRank(userId: string, monthYear?: string): Promise<number | null> {
  const targetMonth = monthYear || getPreviousMonthYear();
  
  const entry = await db.query.monthlyLeaderboards.findFirst({
    where: and(
      eq(monthlyLeaderboards.userId, userId),
      eq(monthlyLeaderboards.monthYear, targetMonth)
    ),
  });

  return entry?.rank || null;
}

// Get user's monthly score history
export async function getUserMonthlyScores(userId: string): Promise<MonthlyScoreEntry[]> {
  const scores = await db.query.monthlyScores.findMany({
    where: eq(monthlyScores.userId, userId),
    orderBy: [desc(monthlyScores.monthYear)],
  });

  return scores.map(score => ({
    monthYear: score.monthYear,
    score: score.score,
    rank: score.rank || 0,
    totalPredictions: score.totalPredictions,
    correctPredictions: score.correctPredictions,
  }));
}

// Get user's badges
export async function getUserBadges(userId: string): Promise<Array<{
  badgeType: string;
  monthYear: string;
  rank: number;
  totalScore: number;
}>> {
  const badges = await db.query.userBadges.findMany({
    where: eq(userBadges.userId, userId),
    orderBy: [desc(userBadges.monthYear)],
  });

  return badges.map(badge => ({
    badgeType: badge.badgeType,
    monthYear: badge.monthYear,
    rank: badge.rank || 0,
    totalScore: badge.totalScore || 0,
  }));
}

// Process monthly leaderboard (run at the beginning of each month)
export async function processMonthlyLeaderboard() {
  const previousMonth = getPreviousMonthYear();
  const currentMonth = getCurrentMonthYear();
  
  console.log(`Processing leaderboard for ${previousMonth}`);

  // Get all user profiles with their monthly scores
  const profiles = await db.query.userProfiles.findMany();
  
  // Get user data separately to avoid referencedTable issues
  const userIds = profiles.map(profile => profile.userId);
  const usersData = await db.query.users.findMany({
    where: inArray(users.id, userIds),
  });
  
  const userMap = new Map(usersData.map(user => [user.id, user]));
  
  // Combine profiles with user data
  const profilesWithUsers = profiles.map(profile => ({
    ...profile,
    user: userMap.get(profile.userId),
  }));

  // Sort by monthly score (descending)
  const sortedProfiles = profilesWithUsers
    .filter(profile => profile.monthlyScore > 0)
    .sort((a, b) => b.monthlyScore - a.monthlyScore);

  // Create leaderboard entries
  const leaderboardEntries = sortedProfiles.map((profile, index) => {
    const rank = index + 1;
    const accuracyPercentage = profile.totalPredictions > 0 
      ? (profile.correctPredictions / profile.totalPredictions) * 100 
      : 0;

    return {
      monthYear: previousMonth,
      userId: profile.userId,
      username: profile.user?.username || 'Unknown',
      rank,
      totalScore: profile.monthlyScore,
      totalPredictions: profile.totalPredictions,
      correctPredictions: profile.correctPredictions,
      accuracyPercentage: (Math.round(accuracyPercentage * 100) / 100).toString(),
    };
  });

  // Save leaderboard entries
  if (leaderboardEntries.length > 0) {
    await db.insert(monthlyLeaderboards).values(leaderboardEntries);
  }

  // Award ranking badges using the badge service
  try {
    const { awardRankingBadges } = await import('./badge-service');
    await awardRankingBadges(previousMonth);
  } catch (error) {
    console.error(`Error awarding ranking badges for ${previousMonth}:`, error);
    // Non-critical error, continue with leaderboard processing
  }

  // Save monthly scores for all users
  const monthlyScoreEntries = profilesWithUsers.map(profile => ({
    userId: profile.userId,
    monthYear: previousMonth,
    score: profile.monthlyScore,
    rank: leaderboardEntries.find(entry => entry.userId === profile.userId)?.rank || null,
    totalPredictions: profile.totalPredictions,
    correctPredictions: profile.correctPredictions,
  }));

  if (monthlyScoreEntries.length > 0) {
    await db.insert(monthlyScores).values(monthlyScoreEntries);
  }

  // Reset monthly scores for all users
  await db.update(userProfiles)
    .set({
      monthlyScore: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      lastMonthRank: null,
      updatedAt: new Date(),
    });

  // Update last month rank for users who were in the leaderboard
  for (const entry of leaderboardEntries) {
    await db.update(userProfiles)
      .set({
        lastMonthRank: entry.rank,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, entry.userId));
  }

  console.log(`Monthly leaderboard processed. ${leaderboardEntries.length} users ranked.`);
}

// Get current month leaderboard (live scores) - FIXED VERSION
export async function getCurrentMonthLeaderboard(): Promise<LeaderboardEntry[]> {
  // Get current month boundaries in Europe/Rome timezone
  const now = new Date();
  const romeTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  // Start of current month (00:00:00 CEST)
  const startOfMonth = new Date(romeTime.getFullYear(), romeTime.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  // End of current month (23:59:59 CEST)
  const endOfMonth = new Date(romeTime.getFullYear(), romeTime.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  console.log(`Getting current month leaderboard from ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
  
  // Import predictions table to avoid circular dependency
  const { predictions } = await import('../shared/schema');
  
  // Get all predictions for the current month (both active and evaluated)
  const currentMonthPredictions = await db
    .select({
      userId: predictions.userId,
      pointsAwarded: predictions.pointsAwarded,
      result: predictions.result,
      status: predictions.status,
      slotStart: predictions.slotStart,
    })
    .from(predictions)
    .where(
      and(
        inArray(predictions.status, ['active', 'evaluated']),
        gte(predictions.slotStart, startOfMonth),
        lte(predictions.slotStart, endOfMonth)
      )
    );
  
  console.log(`Found ${currentMonthPredictions.length} resolved predictions for current month`);
  
  // If no predictions found, fall back to showing all user profiles
  if (currentMonthPredictions.length === 0) {
    console.log('No current month predictions found, falling back to all user profiles');
    return await getAllUserProfilesLeaderboard();
  }
  
  // Aggregate predictions by user
  const userStats = new Map<string, {
    totalScore: number;
    totalPredictions: number;
    correctPredictions: number;
  }>();
  
  for (const pred of currentMonthPredictions) {
    if (!userStats.has(pred.userId)) {
      userStats.set(pred.userId, {
        totalScore: 0,
        totalPredictions: 0,
        correctPredictions: 0,
      });
    }
    
    const stats = userStats.get(pred.userId)!;
    stats.totalPredictions++;
    
    // For evaluated predictions, add points and count results
    if (pred.status === 'evaluated') {
      stats.totalScore += pred.pointsAwarded || 0;
      if (pred.result === 'correct') {
        stats.correctPredictions++;
      }
    }
    // For active predictions, they count towards total but don't contribute to score yet
  }
  
  // Convert to array and sort by score
  const leaderboardData = Array.from(userStats.entries())
    .map(([userId, stats]) => ({
      userId,
      totalScore: stats.totalScore,
      totalPredictions: stats.totalPredictions,
      correctPredictions: stats.correctPredictions,
      accuracyPercentage: stats.totalPredictions > 0 
        ? (stats.correctPredictions / stats.totalPredictions) * 100 
        : 0,
    }))
    .filter(entry => entry.totalPredictions > 0) // Show users with any predictions
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 30); // Top 30
  
  // Get user data for usernames
  const userIds = leaderboardData.map(entry => entry.userId);
  const usersData = await db.query.users.findMany({
    where: inArray(users.id, userIds),
  });
  
  const userMap = new Map(usersData.map(user => [user.id, user]));
  
  // Format the response
  return leaderboardData.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: userMap.get(entry.userId)?.username || 'Unknown',
    totalScore: entry.totalScore,
    totalPredictions: entry.totalPredictions,
    correctPredictions: entry.correctPredictions,
    accuracyPercentage: Math.round(entry.accuracyPercentage * 100) / 100,
    badges: [], // No badges for current month
  }));
}

// Fallback function to show all users with their current profiles
async function getAllUserProfilesLeaderboard(): Promise<LeaderboardEntry[]> {
  console.log('Getting all user profiles for fallback leaderboard');
  
  // Get all user profiles with user data
  const profilesWithUsers = await db
    .select({
      userId: userProfiles.userId,
      monthlyScore: userProfiles.monthlyScore,
      totalPredictions: userProfiles.totalPredictions,
      correctPredictions: userProfiles.correctPredictions,
      username: users.username,
      role: users.role,
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .orderBy(desc(userProfiles.monthlyScore));
  
  console.log(`Found ${profilesWithUsers.length} user profiles`);
  
  // Convert to leaderboard format
  return profilesWithUsers.map((profile, index) => ({
    rank: index + 1,
    userId: profile.userId,
    username: profile.username || 'Unknown',
    totalScore: profile.monthlyScore || 0,
    totalPredictions: profile.totalPredictions || 0,
    correctPredictions: profile.correctPredictions || 0,
    accuracyPercentage: profile.totalPredictions > 0 
      ? (profile.correctPredictions / profile.totalPredictions) * 100 
      : 0,
    badges: [], // No badges for current month
    isAdmin: profile.role === 'admin',
  }));
}

// Get user's current month stats
export async function getUserCurrentMonthStats(userId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!profile) {
    return null;
  }

  // Get user data separately
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // Get current rank
  const allProfiles = await db.query.userProfiles.findMany({
    orderBy: [desc(userProfiles.monthlyScore)],
  });

  const currentRank = allProfiles.findIndex(p => p.userId === userId) + 1;

  const accuracyPercentage = profile.totalPredictions > 0 
    ? (profile.correctPredictions / profile.totalPredictions) * 100 
    : 0;

  return {
    userId: profile.userId,
    username: user?.username || 'Unknown',
    monthlyScore: profile.monthlyScore,
    totalPredictions: profile.totalPredictions,
    correctPredictions: profile.correctPredictions,
    accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
    currentRank,
    lastMonthRank: profile.lastMonthRank,
  };
}

// Get leaderboard statistics
export async function getLeaderboardStats() {
  const currentMonth = getCurrentMonthYear();
  const previousMonth = getPreviousMonthYear();

  const [currentMonthCount, previousMonthCount] = await Promise.all([
    db.query.userProfiles.findMany({
      where: gt(userProfiles.monthlyScore, 0),
    }).then(profiles => profiles.length),
    db.query.monthlyLeaderboards.findMany({
      where: eq(monthlyLeaderboards.monthYear, previousMonth),
    }).then(entries => entries.length),
  ]);

  return {
    currentMonth: {
      monthYear: currentMonth,
      participants: currentMonthCount,
    },
    previousMonth: {
      monthYear: previousMonth,
      participants: previousMonthCount,
    },
  };
}

// Schedule monthly leaderboard processing
export function scheduleMonthlyLeaderboardProcessing() {
  // Check if it's the first day of the month at 00:00 CEST
  const checkAndProcess = () => {
    const now = new Date();
    const cestOffset = 2; // CEST is UTC+2
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cestTime = new Date(utc + (cestOffset * 3600000));
    
    // Check if it's the first day of the month at 00:00
    if (cestTime.getDate() === 1 && cestTime.getHours() === 0 && cestTime.getMinutes() === 0) {
      processMonthlyLeaderboard();
    }
  };

  // Check every minute
  setInterval(checkAndProcess, 60 * 1000);
  
  // Also check immediately on startup
  checkAndProcess();
} 

// Get current month countdown information
export function getCurrentMonthCountdown() {
  // Get current time in Europe/Rome timezone
  const now = new Date();
  const romeTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  // End of current month (23:59:59 CEST)
  const endOfMonth = new Date(romeTime.getFullYear(), romeTime.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  // Calculate time remaining
  const timeRemaining = endOfMonth.getTime() - now.getTime();
  
  if (timeRemaining <= 0) {
    return {
      isExpired: true,
      message: "Month has ended",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      endDate: endOfMonth.toISOString(),
    };
  }
  
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  return {
    isExpired: false,
    message: `Ends in: ${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} CEST`,
    days,
    hours,
    minutes,
    seconds,
    endDate: endOfMonth.toISOString(),
  };
} 