import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum, uuid, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const assetTypeEnum = pgEnum("asset_type", ["crypto", "stock", "forex"]);
export const predictionDirectionEnum = pgEnum("prediction_direction", ["up", "down"]);
export const predictionStatusEnum = pgEnum("prediction_status", ["active", "expired", "evaluated"]);
export const predictionResultEnum = pgEnum("prediction_result", ["pending", "correct", "incorrect"]);
export const durationEnum = pgEnum("duration", ["1h", "3h", "6h", "24h", "48h", "1w", "1m", "3m", "6m", "1y"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles with public and private data
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  avatar: text("avatar"),
  monthlyScore: integer("monthly_score").default(0).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  totalPredictions: integer("total_predictions").default(0).notNull(),
  correctPredictions: integer("correct_predictions").default(0).notNull(),
  followersCount: integer("followers_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),
  lastMonthRank: integer("last_month_rank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Following system
export const userFollows = pgTable("user_follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assets table
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  type: assetTypeEnum("type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  apiSource: text("api_source").notNull(), // "coingecko", "yahoo", "exchangerate"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset prices for evaluation
export const assetPrices = pgTable("asset_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx_asset_time: index("idx_asset_prices_asset_time").on(t.assetId, t.timestamp),
}));

// Slot configuration
export const slotConfigs = pgTable("slot_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  duration: durationEnum("duration").notNull(),
  slotNumber: integer("slot_number").notNull(),
  startTime: text("start_time").notNull(), // "00:00", "03:00", etc.
  endTime: text("end_time").notNull(), // "02:59", "05:59", etc.
  pointsIfCorrect: integer("points_if_correct").notNull(),
  penaltyIfWrong: integer("penalty_if_wrong").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  direction: predictionDirectionEnum("direction").notNull(),
  duration: durationEnum("duration").notNull(),
  slotNumber: integer("slot_number").notNull(),
  slotStart: timestamp("slot_start").notNull(),
  slotEnd: timestamp("slot_end").notNull(),
  timestampCreated: timestamp("timestamp_created").defaultNow(),
  timestampExpiration: timestamp("timestamp_expiration").notNull(),
  status: predictionStatusEnum("status").default("active").notNull(),
  result: predictionResultEnum("result").default("pending").notNull(),
  pointsAwarded: integer("points_awarded"),
  priceStart: decimal("price_start", { precision: 20, scale: 8 }),
  priceEnd: decimal("price_end", { precision: 20, scale: 8 }),
  evaluatedAt: timestamp("evaluated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq_user_asset_slot: uniqueIndex("uniq_pred_user_asset_duration_slot_start").on(
    t.userId,
    t.assetId,
    t.duration,
    t.slotNumber,
    t.slotStart
  ),
  idx_user: index("idx_pred_user").on(t.userId),
  idx_status_exp: index("idx_pred_status_expires").on(t.status, t.timestampExpiration),
  idx_asset_slotstart: index("idx_pred_asset_slotstart").on(t.assetId, t.slotStart),
  idx_evaluated_at: index("idx_pred_evaluated_at").on(t.evaluatedAt),
}));

// Monthly leaderboard archive
export const monthlyLeaderboards = pgTable("monthly_leaderboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  monthYear: text("month_year").notNull(), // "2025-01"
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  rank: integer("rank").notNull(),
  totalScore: integer("total_score").notNull(),
  totalPredictions: integer("total_predictions").notNull(),
  correctPredictions: integer("correct_predictions").notNull(),
  accuracyPercentage: decimal("accuracy_percentage", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges
export const userBadges = pgTable("user_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(), // "starter", "streak", "accuracy", "volume", "1st_place", etc.
  badgeName: text("badge_name").notNull(), // Human readable name
  badgeDescription: text("badge_description").notNull(), // Description of how it was earned
  monthYear: text("month_year").notNull(), // "2025-01" or "lifetime" for permanent badges
  rank: integer("rank"), // For ranking badges (1st, 2nd, 3rd place)
  totalScore: integer("total_score"), // For ranking badges
  metadata: jsonb("metadata"), // Additional data like streak count, accuracy percentage, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly score history for charts
export const monthlyScores = pgTable("monthly_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthYear: text("month_year").notNull(), // "2025-01"
  score: integer("score").notNull(),
  rank: integer("rank"),
  totalPredictions: integer("total_predictions").notNull(),
  correctPredictions: integer("correct_predictions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens
export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type AssetPrice = typeof assetPrices.$inferSelect;
export type MonthlyLeaderboard = typeof monthlyLeaderboards.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type MonthlyScore = typeof monthlyScores.$inferSelect;
export type SlotConfig = typeof slotConfigs.$inferSelect;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;
