import { users, assets, opinions, userBadges, type User, type InsertUser, type Asset, type Opinion, type UserBadge, type InsertUserBadge } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

// Initial assets data - will be used to seed the database if needed
const initialAssets = [
  { name: "Bitcoin", symbol: "BTC", type: "crypto", apiSource: "coingecko", sentiment: "positive", prediction: "5.25" },
  { name: "Ethereum", symbol: "ETH", type: "crypto", apiSource: "coingecko", sentiment: "positive", prediction: "8.30" },
  { name: "Tesla", symbol: "TSLA", type: "stock", apiSource: "yahoo", sentiment: "neutral", prediction: "0.75" },
  { name: "Apple", symbol: "AAPL", type: "stock", apiSource: "yahoo", sentiment: "positive", prediction: "2.10" },
  { name: "Nvidia", symbol: "NVDA", type: "stock", apiSource: "yahoo", sentiment: "positive", prediction: "4.50" },
  { name: "Amazon", symbol: "AMZN", type: "stock", apiSource: "yahoo", sentiment: "neutral", prediction: "1.25" },
];

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>; // Nuovo metodo per recuperare tutti gli utenti
  checkAndUpdateVerificationStatus(userId: number): Promise<boolean>;
  getVerificationProgress(userId: number): Promise<{ 
    isVerified: boolean; 
    accountAge: { 
      months: number; 
      isComplete: boolean; 
    }; 
    opinionCount: { 
      count: number; 
      isComplete: boolean; 
    }; 
  }>;
  
  getAllAssets(): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | undefined>;
  getAssetBySymbol(symbol: string): Promise<Asset | undefined>;
  updateAssetSentiment(assetId: number): Promise<Asset>;
  
  getOpinionsByAssetId(assetId: number): Promise<Opinion[]>;
  createOpinion(opinion: any): Promise<Opinion>;
  
  // Badge management methods
  getUserBadges(userId: number): Promise<UserBadge[]>;
  getMonthlyTopPredictors(monthYear: string, limit?: number): Promise<User[]>;
  assignMonthlyBadges(monthYear: string): Promise<void>;
  getBadgeHistory(userId: number): Promise<UserBadge[]>;
  
  // Initialize the database with default data if needed
  initializeDatabase(): Promise<void>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 // cleanup expired sessions every 60 minutes
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Set registration date to current date
    const userWithDate = {
      ...insertUser,
      createdAt: new Date()
    };
    
    const [user] = await db
      .insert(users)
      .values(userWithDate)
      .returning();
    return user;
  }
  
  async checkAndUpdateVerificationStatus(userId: number): Promise<boolean> {
    // Get the user
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Controlla se l'email è verificata
    const isEmailVerified = user.emailVerified || false;
    
    // Check if user has at least 15 opinions
    const userOpinions = await db
      .select({ count: sql<number>`count(*)` })
      .from(opinions)
      .where(eq(opinions.userId, userId));
    
    const opinionCount = userOpinions[0]?.count || 0;
    const hasEnoughOpinions = opinionCount >= 15;
    
    // Update user verification status if both conditions are met
    const shouldBeVerified = isEmailVerified && hasEnoughOpinions;
    
    // Only update if the status needs to change
    if (shouldBeVerified !== user.isVerifiedAdvisor) {
      await db
        .update(users)
        .set({ isVerifiedAdvisor: shouldBeVerified })
        .where(eq(users.id, userId));
    }
    
    return shouldBeVerified;
  }
  
  async getVerificationProgress(userId: number): Promise<{ 
    isVerified: boolean; 
    accountAge: { 
      months: number; 
      isComplete: boolean; 
    }; 
    opinionCount: { 
      count: number; 
      isComplete: boolean; 
    }; 
  }> {
    // Get the user
    const user = await this.getUser(userId);
    if (!user) {
      return {
        isVerified: false,
        accountAge: { months: 0, isComplete: false },
        opinionCount: { count: 0, isComplete: false }
      };
    }
    
    // Check if already verified
    if (user.isVerifiedAdvisor) {
      return {
        isVerified: true,
        accountAge: { months: 1, isComplete: true },  // 1 = email verified
        opinionCount: { count: 15, isComplete: true }
      };
    }
    
    // Check email verification status
    const isEmailVerified = user.emailVerified || false;
    
    // Count opinions
    const userOpinions = await db
      .select({ count: sql<number>`count(*)` })
      .from(opinions)
      .where(eq(opinions.userId, userId));
    
    const opinionCount = userOpinions[0]?.count || 0;
    const hasEnoughOpinions = opinionCount >= 15;
    
    return {
      isVerified: isEmailVerified && hasEnoughOpinions,
      accountAge: {
        months: isEmailVerified ? 1 : 0,  // Usiamo 1 come stato verificato
        isComplete: isEmailVerified
      },
      opinionCount: {
        count: opinionCount,
        isComplete: hasEnoughOpinions
      }
    };
  }
  
  // Asset methods
  async getAllAssets(): Promise<Asset[]> {
    return db.select().from(assets);
  }
  
  async getAssetById(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }
  
  async getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.symbol, symbol));
    return asset;
  }
  
  async updateAssetSentiment(assetId: number): Promise<Asset> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
    if (!asset) {
      throw new Error("Asset not found");
    }
    
    const assetOpinions = await this.getOpinionsByAssetId(assetId);
    
    if (assetOpinions.length === 0) {
      return asset;
    }
    
    // Calculate average sentiment
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    
    assetOpinions.forEach(opinion => {
      sentimentCounts[opinion.sentiment as keyof typeof sentimentCounts]++;
    });
    
    let dominantSentiment: string = "neutral";
    let maxCount = 0;
    
    Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantSentiment = sentiment;
      }
    });
    
    // Calculate average prediction
    const totalPrediction = assetOpinions.reduce((sum, opinion) => sum + Number(opinion.prediction), 0);
    const averagePrediction = totalPrediction / assetOpinions.length;
    
    // Update asset
    const [updatedAsset] = await db
      .update(assets)
      .set({
        sentiment: dominantSentiment,
        prediction: averagePrediction.toString(),
      })
      .where(eq(assets.id, assetId))
      .returning();
    
    return updatedAsset;
  }
  
  // Opinion methods
  async getOpinionsByAssetId(assetId: number): Promise<Opinion[]> {
    return db
      .select()
      .from(opinions)
      .where(eq(opinions.assetId, assetId))
      .orderBy(desc(opinions.createdAt));
  }
  
  async createOpinion(opinionData: any): Promise<Opinion> {
    const [opinion] = await db
      .insert(opinions)
      .values(opinionData)
      .returning();
    
    return opinion;
  }
  
  // Badge management methods
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.createdAt));
  }
  
  async getMonthlyTopPredictors(monthYear: string, limit: number = 5): Promise<User[]> {
    // Ottiene i migliori predittori del mese in base all'accuratezza e al numero di predizioni
    const topPredictors = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.totalPredictions} > 0`,
          sql`${users.isVerifiedAdvisor} = true`
        )
      )
      .orderBy(desc(users.accuracyPercentage))
      .limit(limit);
    
    return topPredictors;
  }
  
  async assignMonthlyBadges(monthYear: string): Promise<void> {
    // Ottiene i top 5 predittori del mese
    const topPredictors = await this.getMonthlyTopPredictors(monthYear);
    
    // Assegna i badge agli utenti
    for (let i = 0; i < topPredictors.length; i++) {
      const user = topPredictors[i];
      const badgeType = `top${i + 1}`;
      
      // Aggiorna il badge corrente dell'utente
      await db
        .update(users)
        .set({ currentBadge: badgeType })
        .where(eq(users.id, user.id));
      
      // Aggiunge il badge alla cronologia
      await db
        .insert(userBadges)
        .values({
          userId: user.id,
          username: user.username,
          badgeType: badgeType,
          monthYear: monthYear,
          accuracyPercentage: user.accuracyPercentage,
          totalPredictions: user.totalPredictions
        });
    }
  }
  
  async getBadgeHistory(userId: number): Promise<UserBadge[]> {
    return db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.monthYear));
  }
  
  // Initialize database with default data if needed
  async initializeDatabase(): Promise<void> {
    try {
      // Check if assets table is empty
      const existingAssets = await db.select().from(assets);
      
      if (existingAssets.length === 0) {
        // Seed with initial assets
        console.log("Seeding database with initial assets...");
        await db.insert(assets).values(initialAssets);
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
}

export const storage = new DatabaseStorage();