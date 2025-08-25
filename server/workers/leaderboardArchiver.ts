import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db.js';
import { 
  predictions, 
  users, 
  userProfiles, 
  monthlyLeaderboards, 
  userBadges,
  monthlyScores 
} from '../../shared/schema.js';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';
import { DateTime } from 'luxon';

// Create Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create queue
export const leaderboardArchiveQueue = new Queue('leaderboard-archive', { connection });

/**
 * Calculate and archive monthly leaderboard
 */
async function archiveMonthlyLeaderboard(monthYear?: string): Promise<void> {
  try {
    // Determine the month to archive (default to previous month)
    const now = DateTime.now().setZone('Europe/Berlin');
    const targetMonth = monthYear || now.minus({ months: 1 }).toFormat('yyyy-MM');
    
    console.log(`Archiving leaderboard for month: ${targetMonth}`);

    // Calculate date range for the month
    const monthStart = DateTime.fromFormat(targetMonth, 'yyyy-MM').setZone('Europe/Berlin').startOf('month');
    const monthEnd = monthStart.endOf('month');

    // Get all evaluated predictions for the month
    const monthlyPredictions = await db
      .select({
        userId: predictions.userId,
        pointsAwarded: predictions.pointsAwarded,
        result: predictions.result,
        evaluatedAt: predictions.evaluatedAt
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.status, 'evaluated'),
          isNotNull(predictions.evaluatedAt),
          gte(predictions.evaluatedAt, monthStart.toJSDate()),
          lte(predictions.evaluatedAt, monthEnd.toJSDate())
        )
      );

    // Aggregate scores by user
    const userScores = new Map<string, {
      totalScore: number;
      totalPredictions: number;
      correctPredictions: number;
      username: string;
    }>();

    for (const prediction of monthlyPredictions) {
      const existing = userScores.get(prediction.userId);
      if (existing) {
        existing.totalScore += prediction.pointsAwarded || 0;
        existing.totalPredictions += 1;
        if (prediction.result === 'correct') {
          existing.correctPredictions += 1;
        }
      } else {
        userScores.set(prediction.userId, {
          totalScore: prediction.pointsAwarded || 0,
          totalPredictions: 1,
          correctPredictions: prediction.result === 'correct' ? 1 : 0,
          username: '' // Will be filled below
        });
      }
    }

    // Get usernames for all users
    const userIds = Array.from(userScores.keys());
    const userList = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, userIds[0]));

    // Fill in usernames
    for (const user of userList) {
      const score = userScores.get(user.id);
      if (score) {
        score.username = user.username;
      }
    }

    // Sort by total score (descending)
    const sortedUsers = Array.from(userScores.entries())
      .map(([userId, score]) => ({ userId, ...score }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Take top 30
    const top30 = sortedUsers.slice(0, 30);

    // Archive top 30 to monthly_leaderboards
    for (let i = 0; i < top30.length; i++) {
      const user = top30[i];
      const rank = i + 1;
      const accuracyPercentage = user.totalPredictions > 0 
        ? (user.correctPredictions / user.totalPredictions) * 100 
        : 0;

      await db.insert(monthlyLeaderboards).values({
        monthYear: targetMonth,
        userId: user.userId,
        username: user.username,
        rank,
        totalScore: user.totalScore,
        totalPredictions: user.totalPredictions,
        correctPredictions: user.correctPredictions,
        accuracyPercentage: accuracyPercentage.toFixed(2)
      });
    }

    // Assign badges to top 4
    const badgeTypes = ['1st_place', '2nd_place', '3rd_place', '4th_place'];
    for (let i = 0; i < Math.min(4, top30.length); i++) {
      const user = top30[i];
      const rank = i + 1;

      await db.insert(userBadges).values({
        userId: user.userId,
        badgeType: badgeTypes[i],
        monthYear: targetMonth,
        rank,
        totalScore: user.totalScore
      });
    }

    // Store monthly scores for all users (for charts)
    for (const user of sortedUsers) {
      const accuracyPercentage = user.totalPredictions > 0 
        ? (user.correctPredictions / user.totalPredictions) * 100 
        : 0;

      await db.insert(monthlyScores).values({
        userId: user.userId,
        monthYear: targetMonth,
        score: user.totalScore,
        rank: sortedUsers.findIndex(u => u.userId === user.userId) + 1,
        totalPredictions: user.totalPredictions,
        correctPredictions: user.correctPredictions
      });
    }

    // Reset monthly scores for all users
    await db
      .update(userProfiles)
      .set({
        monthlyScore: 0,
        lastMonthRank: null
      });

    // Update last month rank for users who were in top 30
    for (let i = 0; i < top30.length; i++) {
      const user = top30[i];
      await db
        .update(userProfiles)
        .set({ lastMonthRank: i + 1 })
        .where(eq(userProfiles.userId, user.userId));
    }

    console.log(`Successfully archived leaderboard for ${targetMonth}`);
    console.log(`- Top 30 users archived`);
    console.log(`- ${Math.min(4, top30.length)} badges assigned`);
    console.log(`- Monthly scores reset`);

  } catch (error) {
    console.error('Error archiving monthly leaderboard:', error);
    throw error;
  }
}

/**
 * Get archived leaderboard for a specific month
 */
export async function getArchivedLeaderboard(monthYear: string): Promise<any[]> {
  return await db
    .select()
    .from(monthlyLeaderboards)
    .where(eq(monthlyLeaderboards.monthYear, monthYear))
    .orderBy(monthlyLeaderboards.rank);
}

/**
 * Get user's monthly score history
 */
export async function getUserMonthlyScores(userId: string, months: number = 12): Promise<any[]> {
  const cutoffDate = DateTime.now().setZone('Europe/Berlin').minus({ months }).toFormat('yyyy-MM');
  
  return await db
    .select()
    .from(monthlyScores)
    .where(
      and(
        eq(monthlyScores.userId, userId),
        gte(monthlyScores.monthYear, cutoffDate)
      )
    )
    .orderBy(monthlyScores.monthYear);
}

// Create worker
const leaderboardWorker = new Worker(
  'leaderboard-archive',
  async (job: Job) => {
    const { monthYear } = job.data;
    await archiveMonthlyLeaderboard(monthYear);
  },
  { 
    connection,
    concurrency: 1,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 }
  }
);

// Error handling
leaderboardWorker.on('error', (error) => {
  console.error('Leaderboard archive worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down leaderboard archive worker...');
  await leaderboardWorker.close();
  await leaderboardArchiveQueue.close();
  process.exit(0);
});

// Export functions for manual triggering
export async function triggerMonthlyArchive(monthYear?: string): Promise<void> {
  await leaderboardArchiveQueue.add(
    'archive-monthly-leaderboard',
    { monthYear },
    { 
      jobId: `archive-${monthYear || 'auto'}`,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 }
    }
  );
}

// Schedule monthly archive (runs at 00:00 CEST on the 1st of each month)
function scheduleMonthlyArchive(): void {
  const now = DateTime.now().setZone('Europe/Berlin');
  const nextMonth = now.plus({ months: 1 }).startOf('month');
  
  const delay = nextMonth.diff(now).milliseconds;
  
  setTimeout(async () => {
    await triggerMonthlyArchive();
    // Schedule next month
    scheduleMonthlyArchive();
  }, delay);
}

// Start the worker and schedule
console.log('Leaderboard archive worker started');

// Schedule the first monthly archive
scheduleMonthlyArchive();

// Also run every day at 00:00 to check if it's the first of the month
setInterval(async () => {
  const now = DateTime.now().setZone('Europe/Berlin');
  if (now.day === 1 && now.hour === 0 && now.minute === 0) {
    await triggerMonthlyArchive();
  }
}, 60 * 1000); // Check every minute 