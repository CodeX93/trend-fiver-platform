import { db } from './db';
import { users, userProfiles, userFollows } from '../shared/schema';
import { eq, and, or, desc, asc, inArray, sql } from 'drizzle-orm';
import { getUserPredictionStats } from './prediction-service';
import { getUserBadges } from './leaderboard-service';
import type { User } from '../shared/schema';

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user || null;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return user || null;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: Date; // user account creation date for "Joined" display
  bio: string | null;
  avatar: string | null;
  monthlyScore: number;
  totalScore: number;
  totalPredictions: number;
  correctPredictions: number;
  followersCount: number;
  followingCount: number;
  lastMonthRank: number | null;
  isFollowing: boolean;
  badges: Array<{
    badgeType: string;
    monthYear: string;
    rank: number;
    totalScore: number;
  }>;
}

export interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracyPercentage: number;
  monthlyScore: number;
  totalScore: number;
}

// Get user profile by ID
export async function getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!profile) {
    return null;
  }

  // Check if viewer is following this user
  let isFollowing = false;
  if (viewerId && viewerId !== userId) {
    const follow = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, viewerId),
        eq(userFollows.followingId, userId)
      ),
    });
    isFollowing = !!follow;
  }

  // Get user badges
  const badges = await getUserBadges(userId);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt!,
    bio: profile.bio,
    avatar: profile.avatar,
    monthlyScore: profile.monthlyScore,
    totalScore: profile.totalScore,
    totalPredictions: profile.totalPredictions,
    correctPredictions: profile.correctPredictions,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    lastMonthRank: profile.lastMonthRank,
    isFollowing,
    badges,
  };
}

// Get user profile by username
export async function getUserProfileByUsername(username: string, viewerId?: string): Promise<UserProfile | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  return getUserProfile(user.id, viewerId);
}

// Update user profile
export async function updateUserProfile(userId: string, updates: {
  bio?: string;
  avatar?: string;
}) {
  const { bio, avatar } = updates;

  const updateData: any = { updatedAt: new Date() };
  if (bio !== undefined) updateData.bio = bio;
  if (avatar !== undefined) updateData.avatar = avatar;

  await db.update(userProfiles)
    .set(updateData)
    .where(eq(userProfiles.userId, userId));

  return getUserProfile(userId);
}

// Follow a user
export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  // Check if already following
  const existingFollow = await db.query.userFollows.findFirst({
    where: and(
      eq(userFollows.followerId, followerId),
      eq(userFollows.followingId, followingId)
    ),
  });

  if (existingFollow) {
    throw new Error('Already following this user');
  }

  // Create follow relationship
  await db.insert(userFollows).values({
    followerId,
    followingId,
  });

  // Update follower counts - using proper Drizzle syntax
  await Promise.all([
    // Increment following count for follower
    db.update(userProfiles)
      .set({
        followingCount: sql`${userProfiles.followingCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, followerId)),
    
    // Increment followers count for following
    db.update(userProfiles)
      .set({
        followersCount: sql`${userProfiles.followersCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, followingId)),
  ]);

  return { success: true };
}

// Unfollow a user
export async function unfollowUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('Cannot unfollow yourself');
  }

  // Check if following
  const existingFollow = await db.query.userFollows.findFirst({
    where: and(
      eq(userFollows.followerId, followerId),
      eq(userFollows.followingId, followingId)
    ),
  });

  if (!existingFollow) {
    throw new Error('Not following this user');
  }

  // Remove follow relationship
  await db.delete(userFollows)
    .where(and(
      eq(userFollows.followerId, followerId),
      eq(userFollows.followingId, followingId)
    ));

  // Update follower counts - using proper Drizzle syntax
  await Promise.all([
    // Decrement following count for follower
    db.update(userProfiles)
      .set({
        followingCount: sql`${userProfiles.followingCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, followerId)),
    
    // Decrement followers count for following
    db.update(userProfiles)
      .set({
        followersCount: sql`${userProfiles.followersCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, followingId)),
  ]);

  return { success: true };
}

// Get users that a user is following
export async function getFollowing(userId: string, limit: number = 20, offset: number = 0) {
  const follows = await db.query.userFollows.findMany({
    where: eq(userFollows.followerId, userId),
    orderBy: [desc(userFollows.createdAt)],
    limit,
    offset,
  });

  // Get user data separately to avoid referencedTable issues
  const followingIds = follows.map(follow => follow.followingId);
  const userData = await db.query.users.findMany({
    where: inArray(users.id, followingIds),
  });
  
  const profiles = await db.query.userProfiles.findMany({
    where: inArray(userProfiles.userId, followingIds),
  });

  const userMap = new Map(userData.map(user => [user.id, user]));
  const profileMap = new Map(profiles.map(profile => [profile.userId, profile]));

  return follows.map(follow => {
    const user = userMap.get(follow.followingId);
    const profile = profileMap.get(follow.followingId);
    
    return {
      id: user?.id || follow.followingId,
      username: user?.username || 'Unknown',
      bio: profile?.bio,
      avatar: profile?.avatar,
      monthlyScore: profile?.monthlyScore || 0,
      followersCount: profile?.followersCount || 0,
      followingCount: profile?.followingCount || 0,
      followedAt: follow.createdAt,
    };
  });
}

// Get users following a user
export async function getFollowers(userId: string, limit: number = 20, offset: number = 0) {
  const follows = await db.query.userFollows.findMany({
    where: eq(userFollows.followingId, userId),
    orderBy: [desc(userFollows.createdAt)],
    limit,
    offset,
  });

  // Get user data separately to avoid referencedTable issues
  const followerIds = follows.map(follow => follow.followerId);
  const userData = await db.query.users.findMany({
    where: inArray(users.id, followerIds),
  });
  
  const profiles = await db.query.userProfiles.findMany({
    where: inArray(userProfiles.userId, followerIds),
  });

  const userMap = new Map(userData.map(user => [user.id, user]));
  const profileMap = new Map(profiles.map(profile => [profile.userId, profile]));

  return follows.map(follow => {
    const user = userMap.get(follow.followerId);
    const profile = profileMap.get(follow.followerId);
    
    return {
      id: user?.id || follow.followerId,
      username: user?.username || 'Unknown',
      bio: profile?.bio,
      avatar: profile?.avatar,
      monthlyScore: profile?.monthlyScore || 0,
      followersCount: profile?.followersCount || 0,
      followingCount: profile?.followingCount || 0,
      followedAt: follow.createdAt,
    };
  });
}

// Check if user A is following user B
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;

  const follow = await db.query.userFollows.findFirst({
    where: and(
      eq(userFollows.followerId, followerId),
      eq(userFollows.followingId, followingId)
    ),
  });

  return !!follow;
}

// Search users
export async function searchUsers(query: string, limit: number = 20, offset: number = 0) {
  const userData = await db.query.users.findMany({
    where: or(
      eq(users.username, query),
      sql`${users.username} LIKE ${`%${query}%`}`
    ),
    orderBy: [asc(users.username)],
    limit,
    offset,
  });

  // Get user profiles separately to avoid referencedTable issues
  const userIds = userData.map(user => user.id);
  const profiles = await db.query.userProfiles.findMany({
    where: inArray(userProfiles.userId, userIds),
  });

  const profileMap = new Map(profiles.map(profile => [profile.userId, profile]));

  return userData.map(user => {
    const profile = profileMap.get(user.id);
    
    return {
      id: user.id,
      username: user.username,
      bio: profile?.bio,
      avatar: profile?.avatar,
      monthlyScore: profile?.monthlyScore || 0,
      followersCount: profile?.followersCount || 0,
      followingCount: profile?.followingCount || 0,
    };
  });
}

// Get user statistics
export async function getUserStats(userId: string): Promise<UserStats> {
  const stats = await getUserPredictionStats(userId);
  
  return {
    totalPredictions: stats.totalPredictions,
    correctPredictions: stats.correctPredictions,
    accuracyPercentage: stats.accuracyPercentage,
    monthlyScore: stats.monthlyScore,
    totalScore: stats.totalScore,
  };
}

// Get users by rank (for leaderboard)
export async function getUsersByRank(limit: number = 50, offset: number = 0) {
  const profiles = await db.query.userProfiles.findMany({
    orderBy: [desc(userProfiles.monthlyScore)],
    limit,
    offset,
  });

  // Get user data separately to avoid referencedTable issues
  const userIds = profiles.map(profile => profile.userId);
  const userData = await db.query.users.findMany({
    where: inArray(users.id, userIds),
  });

  const userMap = new Map(userData.map(user => [user.id, user]));

  return profiles.map((profile, index) => {
    const user = userMap.get(profile.userId);
    
    return {
      rank: offset + index + 1,
      id: user?.id || profile.userId,
      username: user?.username || 'Unknown',
      bio: profile.bio,
      avatar: profile.avatar,
      monthlyScore: profile.monthlyScore,
      totalScore: profile.totalScore,
      totalPredictions: profile.totalPredictions,
      correctPredictions: profile.correctPredictions,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      lastMonthRank: profile.lastMonthRank,
    };
  });
}

// Get user's rank
export async function getUserRank(userId: string): Promise<number | null> {
  const allProfiles = await db.query.userProfiles.findMany({
    orderBy: [desc(userProfiles.monthlyScore)],
  });

  const rank = allProfiles.findIndex(profile => profile.userId === userId) + 1;
  return rank > 0 ? rank : null;
}

// Get user's public profile (without email)
export async function getPublicUserProfile(userId: string, viewerId?: string) {
  const profile = await getUserProfile(userId, viewerId);
  
  if (!profile) return null;

  // Remove private information
  const { email, ...publicProfile } = profile;
  
  return publicProfile;
}

// Update user's last activity
export async function updateUserLastActivity(userId: string) {
  await db.update(userProfiles)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));
} 