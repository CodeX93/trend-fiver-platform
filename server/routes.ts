import express from 'express';
import { z } from 'zod';
import { db } from './db';
import { users, emailVerifications, predictions, assets, userProfiles, slotConfigs } from '../shared/schema';
import { eq, and, sql, gte, lte, inArray, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import WebSocketService from './websocket-service';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// Helper function to safely extract user from authenticated requests
const requireUser = (req: express.Request) => {
  if (!req.user) {
    throw new Error('User not found in request');
  }
  return req.user;
};

// Helper function to get user with full profile including email verification status
const requireUserWithProfile = async (req: express.Request) => {
  if (!req.user) {
    throw new Error('User not found in request');
  }
  
  // Get full user profile from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user.userId),
  });
  
  if (!user) {
    throw new Error('User not found in database');
  }
  
  return user;
};
import { 
  registerUser, 
  loginUser, 
  verifyEmail, 
  requestPasswordReset, 
  resetPassword,
  extractUserFromToken,
  isAdmin,
  isAuthenticated,
  comparePassword,
  hashPassword,
} from './auth';
import { generateVerificationToken, sendVerificationEmail } from './email-service';
import { 
  createPrediction, 
  getSentimentData,
  evaluateExpiredPredictions,
  getUserPredictionStats,
  getUserPredictions,
} from './prediction-service';
import { getAdminAuth } from './firebase-admin';
import { getUserByEmail } from './user-service';
import { 
  getActiveSlot, 
  getAllSlots, 
  getNextSlot,
  initializeSlotConfigs,
  getEnhancedActiveSlot,
  getEnhancedValidSlots
} from './slot-service';
import { getCurrentActiveSlot as getActiveSlotLuxon, getAllSlotsForDuration as getAllSlotsLuxon } from './lib/slots';
import { 
  getAssetPrice, 
  getAssetPriceHistory,
  getAllAssets,
  getAssetBySymbol,
  initializeDefaultAssets,
  updateForexPrices,
} from './price-service';
import { 
  getMonthlyLeaderboard, 
  getCurrentMonthLeaderboard,
  getCurrentMonthCountdown,
  getUserCurrentMonthStats,
  getUserRank,
  getUserMonthlyScores,
  getUserBadges,
  getLeaderboardStats,
} from './leaderboard-service';
import { 
  getUserById,
  getUserProfile, 
  getUserProfileByUsername,
  updateUserProfile,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  searchUsers,
  getUserStats,
  getUsersByRank,
  getPublicUserProfile,
  isFollowing,
} from './user-service';
import { 
  getAdminStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllPredictions,
  getAllPredictionsWithFilters,
  manuallyEvaluatePrediction,
  getAllAssets as getAdminAssets,
  updateAsset,
  addAsset,
  getAssetPriceHistory as getAdminAssetPriceHistory,
  getAllPricesWithFilters,

  getLeaderboardData,
  getBadgeData,
  triggerPriceUpdate,
  getSystemHealth,
  updateUser,
  verifyUserEmail,
  deactivateUser,
  activateUser,
  getUnverifiedUsers,
  updateAssetPrice,
  getMonthlyLeaderboardStats,
  getTopAssetsByVolume,
  getActiveSlots,
} from './admin-service';

const router = express.Router();

// WebSocket service instance (will be set by the main server)
let wsService: WebSocketService | null = null;

// Function to set WebSocket service instance
export function setWebSocketService(service: WebSocketService) {
  wsService = service;
}

// Admin middleware defined later; keep routes that need it after its declaration.

// ===== Enhanced Slots Endpoints (with new specification) =====
router.get('/slots/:duration/active', async (req, res) => {
  try {
    const duration = req.params.duration as any;
    console.log(`Getting active slot for duration: ${duration}`);
    
    const activeSlot = await getEnhancedActiveSlot(duration);
    console.log(`Active slot result:`, activeSlot);
    
    if (!activeSlot) {
      console.log('No active slot found for duration:', duration);
      return res.status(404).json({ error: 'No active slot found' });
    }
    
    return res.json(activeSlot);
  } catch (e) {
    console.error('Error getting active slot for duration', req.params.duration, ':', e);
    return res.status(400).json({ error: 'Invalid duration or server error', details: e instanceof Error ? e.message : 'Unknown error' });
  }
});

router.get('/slots/:duration', async (req, res) => {
  try {
    const duration = req.params.duration as any;
    console.log(`Getting all slots for duration: ${duration}`);
    
    // Use new fixed CEST boundaries
    const { getAllSlotsForDuration, getPartitionedIntervals } = await import('./slot-service');
    
    const slots = getAllSlotsForDuration(duration);
    console.log(`All slots result for ${duration}:`, slots?.length, 'slots');
    
    // Add partitioned intervals for each slot
    const enhancedSlots = slots.map(slot => ({
      ...slot,
      intervals: getPartitionedIntervals(duration, slot.start, slot.end)
    }));
    
    return res.json(enhancedSlots);
  } catch (e) {
    console.error('Error getting slots for duration', req.params.duration, ':', e);
    return res.status(400).json({ error: 'Invalid duration or server error', details: e instanceof Error ? e.message : 'Unknown error' });
  }
});

// Get current slot for a duration with lock status
router.get('/slots/:duration/current', async (req, res) => {
  try {
    const duration = req.params.duration as any;
    const { getFixedCESTBoundaries, getSlotLockStatus, getPartitionedIntervals } = await import('./slot-service');
    
    const currentSlot = getFixedCESTBoundaries(duration);
    const lockStatus = getSlotLockStatus(duration, currentSlot.slotNumber);
    const intervals = getPartitionedIntervals(duration, currentSlot.start, currentSlot.end);
    
    res.json({
      ...currentSlot,
      lockStatus,
      intervals
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get current slot' });
  }
});

// Validate slot selection endpoint  
router.post('/slots/:duration/:slotNumber/validate', async (req, res) => {
  try {
    const duration = req.params.duration as any;
    const slotNumber = parseInt(req.params.slotNumber, 10);
    
    if (isNaN(slotNumber)) {
      return res.status(400).json({ error: 'Invalid slot number' });
    }
    
    // Import the validation function directly
    const { validateSlotSelection } = await import('./slot-service');
    const validation = validateSlotSelection(duration, slotNumber);
    return res.json(validation);
  } catch (e) {
    console.error('Error validating slot:', e);
    return res.status(400).json({ error: 'Invalid duration or server error' });
  }
});

// (Admin slot routes moved below adminMiddleware definition)

// Middleware to parse JSON
router.use(express.json());

// Authentication middleware
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let user = null;

    // Try Firebase ID token first
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify Firebase ID token
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        user = {
          userId: decodedToken.uid,
          email: decodedToken.email || '',
          role: 'user', // Default role for Firebase users
        };
      } catch (firebaseError) {
        console.log('Firebase token verification failed, trying JWT...');
        
        // Fallback to JWT verification
        try {
          user = extractUserFromToken(authHeader);
        } catch (jwtError) {
          console.log('JWT verification also failed');
          return res.status(401).json({ error: 'Invalid authentication token' });
        }
      }
    } else {
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Optional authentication middleware - doesn't require auth but sets user if available
const optionalAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = extractUserFromToken(req.headers.authorization);
  if (user) {
    req.user = user;
  }
  next();
};

// Admin middleware
const adminMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('Admin middleware - Authorization header:', req.headers.authorization);
  
  const user = extractUserFromToken(req.headers.authorization);
  console.log('Admin middleware - Extracted user:', user);
  
  if (!user) {
    console.log('Admin middleware - No user found');
    return res.status(403).json({ error: 'Admin access required - No user found' });
  }
  
  if (!isAdmin(user)) {
    console.log('Admin middleware - User is not admin. Role:', user.role);
    return res.status(403).json({ error: 'Admin access required - User role: ' + user.role });
  }
  
  console.log('Admin middleware - User is admin, proceeding');
  req.user = user;
  next();
};

// Admin Slot Configs CRUD (placed after adminMiddleware)
router.get('/admin/slots', adminMiddleware, async (req, res) => {
  const list = await db.query.slotConfigs.findMany({ orderBy: [slotConfigs.duration, slotConfigs.slotNumber] as any });
  res.json(list);
});

router.put('/admin/slots/:id', adminMiddleware, async (req, res) => {
  const { startTime, endTime, pointsIfCorrect, penaltyIfWrong } = req.body;
  await db.update(slotConfigs)
    .set({ startTime, endTime, pointsIfCorrect, penaltyIfWrong })
    .where(eq(slotConfigs.id, req.params.id as any));
  res.json({ success: true });
});

router.post('/admin/slots', adminMiddleware, async (req, res) => {
  const { duration, slotNumber, startTime, endTime, pointsIfCorrect, penaltyIfWrong } = req.body;
  const [row] = await db.insert(slotConfigs).values({ duration, slotNumber, startTime, endTime, pointsIfCorrect, penaltyIfWrong }).returning();
  res.json(row);
});

// Middleware to check if user's email is verified
const emailVerifiedMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const user = requireUser(req);
    
    // For Firebase users, check if email is verified from the token
    if (user.email && user.userId) {
      try {
        // Get user info from Firebase Admin to check email verification
        const firebaseUser = await getAdminAuth().getUser(user.userId);
        if (!firebaseUser.emailVerified) {
          return res.status(403).json({ error: 'Email verification required. Please verify your email before accessing this feature.' });
        }
        next();
        return;
      } catch (firebaseError) {
        console.log('Failed to get Firebase user, falling back to database check');
      }
    }
    
    // Fallback to database check for JWT users
    const dbUser = await getUserById(user.userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!dbUser.emailVerified) {
      return res.status(403).json({ error: 'Email verification required. Please verify your email before accessing this feature.' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify email status' });
  }
};

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== AUTHENTICATION ROUTES =====

// Register
router.post('/auth/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Validate input
    if (!req.body.username || !req.body.email || !req.body.password) {
      console.log('Missing required fields:', { 
        username: !!req.body.username, 
        email: !!req.body.email, 
        password: !!req.body.password 
      });
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    console.log('Calling registerUser function...');
    const result = await registerUser(req.body);
    console.log('Registration successful:', result);
    res.json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' });
  }
});

// Verify email
router.post('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyEmail(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Email verification failed' });
  }
});

// Verify email via GET (for email links)
router.get('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    const result = await verifyEmail(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Email verification failed' });
  }
});

// Resend verification email with cooldown
router.post('/auth/resend-verification', authMiddleware, async (req, res) => {
  try {
    const user = await requireUserWithProfile(req);
    
    // Check if user is already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }
    
    // Check cooldown (5 minutes)
    const lastVerification = await db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.userId, user.id),
      orderBy: [desc(emailVerifications.createdAt)],
    });
    
    if (lastVerification && lastVerification.createdAt && Date.now() - lastVerification.createdAt.getTime() < 5 * 60 * 1000) {
      const remainingTime = Math.ceil((5 * 60 * 1000 - (Date.now() - lastVerification.createdAt.getTime())) / 1000 / 60);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} minutes before requesting another verification email`,
        cooldownRemaining: remainingTime * 60 * 1000
      });
    }
    
    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Delete old verification records
    await db.delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));
    
    // Create new verification record
    await db.insert(emailVerifications).values({
      userId: user.id,
      email: user.email,
      token: verificationToken,
      expiresAt,
    });
    
    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);
    
    res.json({ 
      message: 'Verification email sent successfully',
      cooldown: 5 * 60 * 1000 // 5 minutes in milliseconds
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resend verification email' });
  }
});

// Google OAuth login
router.post('/auth/google', async (req, res) => {
  try {
    const { idToken, email, displayName, photoURL } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify the Google ID token with Firebase Admin
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.email) {
      return res.status(400).json({ error: 'Email not found in Google token' });
    }

    // Check if user exists
    let existingUser;
    try {
      existingUser = await getUserByEmail(decodedToken.email);
    } catch (error) {
      // User doesn't exist, create one
    }

    let user;
    if (existingUser) {
      // Update existing user with Google info
      user = await db.update(users)
        .set({
          emailVerified: true, // Google users are automatically verified
        })
        .where(eq(users.id, existingUser.id))
        .returning()
        .then(rows => rows[0]);
    } else {
      // Create new user from Google info
      const [newUser] = await db.insert(users).values({
        email: decodedToken.email,
        username: displayName || decodedToken.email.split('@')[0],
        password: '', // Google users don't need password
        emailVerified: true, // Google users are automatically verified
      }).returning();
      user = newUser;
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Get or create user profile
    let profile;
    try {
      profile = await getUserProfile(user.id);
    } catch (error) {
      // Create profile if it doesn't exist
      const [newProfile] = await db.insert(userProfiles).values({
        userId: user.id,
      }).returning();
      profile = newProfile;
    }

    res.json({
      user,
      profile,
      token,
      message: 'Google login successful'
    });
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Google authentication failed' 
    });
  }
});

// Request password reset
router.post('/auth/request-reset', async (req, res) => {
  try {
    const result = await requestPasswordReset(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset request failed' });
  }
});

// Reset password
router.post('/auth/reset-password', async (req, res) => {
  try {
    const result = await resetPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset failed' });
  }
});

// Resend verification email
router.post('/auth/resend-verification', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(requireUser(req).userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete old verification tokens for this user
    await db.delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    // Create new verification token
    await db.insert(emailVerifications).values({
      userId: user.id,
      email: user.email,
      token: verificationToken,
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resend verification email' });
  }
});

// ===== USER ROUTES =====

// Get current user data (including email verification status)
router.get('/user/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(requireUser(req).userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user data' });
  }
});

// Get current user profile
router.get('/user/profile', authMiddleware, emailVerifiedMiddleware, async (req, res) => {
  try {
    const profile = await getUserProfile(requireUser(req).userId, requireUser(req).userId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get profile' });
  }
});

// Update user profile
router.put('/user/profile', authMiddleware, emailVerifiedMiddleware, async (req, res) => {
  try {
    const result = await updateUserProfile(requireUser(req).userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update profile' });
  }
});

// Change password
router.post('/user/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user from database
    const user = await getUserById(requireUser(req).userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    
    // Update password in database
    await db.update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, requireUser(req).userId));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to change password' });
  }
});

// Change email (triggers re-verification)
router.post('/user/change-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    
    if (!newEmail || !password) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if new email is already taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, newEmail),
    });
    
    if (existingUser && existingUser.id !== requireUser(req).userId) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    // Get user from database
    const user = await getUserById(requireUser(req).userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update email and reset verification status
    await db.update(users)
      .set({ 
        email: newEmail,
        emailVerified: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Delete old verification records
    await db.delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new verification record
    await db.insert(emailVerifications).values({
      userId: user.id,
      email: newEmail,
      token: verificationToken,
      expiresAt,
    });

    // Send verification email to new address
    await sendVerificationEmail(newEmail, verificationToken);

    res.json({ 
      message: 'Email changed successfully. Please check your new email for verification.',
      emailChanged: true
    });
  } catch (error) {
    console.error('Email change error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to change email' });
  }
});

// Get user profile by username
router.get('/user/:username', optionalAuthMiddleware, async (req, res) => {
  try {
    const profile = await getUserProfileByUsername(req.params.username, req.user?.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user profile' });
  }
});

// Get user stats
router.get('/user/:username/stats', async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const stats = await getUserStats(user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user stats' });
  }
});

// ===== FOLLOWING ROUTES =====

// Follow user
router.post('/user/:username/follow', authMiddleware, async (req, res) => {
  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const result = await followUser(requireUser(req).userId, targetUser.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to follow user' });
  }
});

// Unfollow user
router.delete('/user/:username/follow', authMiddleware, async (req, res) => {
  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const result = await unfollowUser(requireUser(req).userId, targetUser.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to unfollow user' });
  }
});

// Get following list
router.get('/user/:username/following', async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const following = await getFollowing(user.id, 50, 0);
    res.json(following);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get following list' });
  }
});

// Get followers list
router.get('/user/:username/followers', async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const followers = await getFollowers(user.id, 50, 0);
    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get followers list' });
  }
});

// ===== PREDICTION ROUTES =====

// Create prediction
router.post('/predictions', authMiddleware, emailVerifiedMiddleware, async (req, res) => {
  try {
    console.log('Creating prediction with payload:', {
      userId: requireUser(req).userId,
      body: req.body
    });
    
    const result = await createPrediction({
      userId: requireUser(req).userId,
      ...req.body,
    });
    
    console.log('Prediction created successfully:', result.id);
    res.json(result);
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to create prediction',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Get user predictions
router.get('/predictions', authMiddleware, emailVerifiedMiddleware, async (req, res) => {
  try {
    const userId = requireUser(req).userId;
    console.log('Getting predictions for user:', userId);
    const predictions = await getUserPredictions(userId);
    console.log('Predictions response (first item):', predictions[0]);
    res.json(predictions);
  } catch (error) {
    console.error('Error getting predictions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get predictions' });
  }
});

// Get user predictions (if following)
router.get('/user/:username/predictions', async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username),
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if viewer is following this user or is admin
    let canView = false;
    if (req.user?.userId) {
      // Admins can view any user's predictions
      if (req.user.role === 'admin') {
        canView = true;
      } else {
        canView = await isFollowing(req.user.userId, user.id);
      }
    }

    if (!canView) {
      return res.status(403).json({ error: 'Must follow user to view predictions' });
    }

    const predictions = await getUserPredictions(user.id);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get predictions' });
  }
});

// Get user predictions with privacy enforcement
router.get('/users/:userId/predictions', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.userId;
    const { 
      status, 
      assetSymbol, 
      duration, 
      result, 
      page = '1', 
      limit = '20',
      startDate,
      endDate
    } = req.query;

    // Check if viewer is the same user or a follower
    const isOwnProfile = viewerId === userId;
    const isFollower = !isOwnProfile && viewerId ? await isFollowing(viewerId, userId) : false;

    if (!isOwnProfile && !isFollower) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only view predictions for your own profile or users you follow'
      });
    }

    // Parse pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions = [eq(predictions.userId, userId)];

    if (status) {
      whereConditions.push(eq(predictions.status, status as any));
    }

    if (result) {
      whereConditions.push(eq(predictions.result, result as any));
    }

    if (duration) {
      whereConditions.push(eq(predictions.duration, duration as any));
    }

    if (startDate) {
      whereConditions.push(gte(predictions.timestampCreated, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(predictions.timestampCreated, new Date(endDate as string)));
    }

    // Get predictions with asset info
    const userPredictions = await db
      .select({
        id: predictions.id,
        direction: predictions.direction,
        duration: predictions.duration,
        slotNumber: predictions.slotNumber,
        slotStart: predictions.slotStart,
        slotEnd: predictions.slotEnd,
        timestampCreated: predictions.timestampCreated,
        timestampExpiration: predictions.timestampExpiration,
        status: predictions.status,
        result: predictions.result,
        pointsAwarded: predictions.pointsAwarded,
        priceStart: predictions.priceStart,
        priceEnd: predictions.priceEnd,
        evaluatedAt: predictions.evaluatedAt,
        assetId: predictions.assetId,
        assetSymbol: assets.symbol,
        assetName: assets.name,
        assetType: assets.type,
      })
      .from(predictions)
      .innerJoin(assets, eq(predictions.assetId, assets.id))
      .where(and(...whereConditions))
      .orderBy(predictions.timestampCreated)
      .limit(limitNum)
      .offset(offset);

    // Filter by asset symbol if provided
    let filteredPredictions = userPredictions;
    if (assetSymbol) {
      filteredPredictions = userPredictions.filter(pred => 
        pred.assetSymbol === assetSymbol
      );
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(predictions)
      .where(and(...whereConditions));

    const total = parseInt(totalCount[0]?.count?.toString() || '0');

    res.json({
      predictions: filteredPredictions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error fetching user predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sentiment data
router.get('/sentiment/:assetSymbol', async (req, res) => {
  try {
    const { duration = '24h' } = req.query;
    const assetSymbol = decodeURIComponent(req.params.assetSymbol);
    console.log(`API: Getting sentiment data for ${assetSymbol} with duration ${duration}`);
    
    // Log the query parameters
    console.log(`API: Query parameters:`, req.query);
    console.log(`API: Duration parameter:`, duration);
    
    const sentiment = await getSentimentData(assetSymbol, duration as any);
    console.log(`API: Sentiment data result:`, sentiment);
    
    // Transform the data to match frontend expectations
    const transformedData = {
      asset: assetSymbol,
      duration: duration,
      slots: sentiment.map(slot => ({
        slotNumber: slot.slotNumber,
        slotLabel: `Slot ${slot.slotNumber}`,
        up: slot.upCount,
        down: slot.downCount,
        total: slot.totalCount
      }))
    };
    
    console.log(`API: Transformed data:`, transformedData);
    res.json(transformedData);
  } catch (error) {
    console.error('API: Error getting sentiment data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get sentiment data' });
  }
});

// Sentiment aggregation endpoint - Enhanced with real-time updates
router.get('/sentiment/:assetSymbol/:duration', async (req, res) => {
  try {
    const { assetSymbol, duration } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    // Check if user is authenticated and verified
    let userId = null;
    if (token) {
      try {
        const decoded = extractUserFromToken(token);
        if (decoded) {
          const user = await getUserById(decoded.userId);
          if (user && user.emailVerified) {
            userId = user.id;
          }
        }
      } catch (error) {
        // Token invalid, continue as unauthenticated
      }
    }

    // Validate duration
    const validDurations = ['1h', '3h', '6h', '24h', '48h', '1w', '1m', '3m', '6m', '1y'];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // Get asset
    const asset = await db.query.assets.findFirst({
      where: eq(assets.symbol, assetSymbol),
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get sentiment data grouped by slot with enhanced aggregation
    const sentimentData = await db
      .select({
        slotNumber: predictions.slotNumber,
        direction: predictions.direction,
        count: sql<number>`count(*)`,
        slotStart: predictions.slotStart,
        slotEnd: predictions.slotEnd,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.assetId, asset.id),
          eq(predictions.duration, duration as any),
          inArray(predictions.status, ['active', 'evaluated'])
        )
      )
      .groupBy(predictions.slotNumber, predictions.direction, predictions.slotStart, predictions.slotEnd);

    // Process the data to group by slot with enhanced information
    const slotMap = new Map<number, { 
      up: number; 
      down: number; 
      total: number;
      slotStart: Date;
      slotEnd: Date;
      isActive: boolean;
      timeRemaining?: number;
    }>();

    const now = new Date();

    for (const row of sentimentData) {
      const slot = slotMap.get(row.slotNumber) || { 
        up: 0, 
        down: 0, 
        total: 0,
        slotStart: row.slotStart,
        slotEnd: row.slotEnd,
        isActive: false,
        timeRemaining: 0
      };
      
      if (row.direction === 'up') {
        slot.up = parseInt(row.count.toString());
      } else {
        slot.down = parseInt(row.count.toString());
      }
      slot.total = slot.up + slot.down;
      
      // Calculate if slot is active and time remaining
      if (now >= slot.slotStart && now <= slot.slotEnd) {
        slot.isActive = true;
        slot.timeRemaining = Math.max(0, slot.slotEnd.getTime() - now.getTime());
      }
      
      slotMap.set(row.slotNumber, slot);
    }

    // Convert to array format with enhanced slot information
    const slots = Array.from(slotMap.entries()).map(([slotNumber, data]) => ({
      slotNumber,
      slotLabel: `Slot ${slotNumber}`,
      up: data.up,
      down: data.down,
      total: data.total,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd,
      isActive: data.isActive,
      timeRemaining: data.timeRemaining
    }));

    // Sort by slot number
    slots.sort((a, b) => a.slotNumber - b.slotNumber);

    // Calculate overall sentiment metrics
    const totalUp = slots.reduce((sum, slot) => sum + slot.up, 0);
    const totalDown = slots.reduce((sum, slot) => sum + slot.down, 0);
    const totalPredictions = totalUp + totalDown;
    
    const upPercentage = totalPredictions > 0 ? Math.round((totalUp / totalPredictions) * 100) : 0;
    const downPercentage = totalPredictions > 0 ? Math.round((totalDown / totalPredictions) * 100) : 0;

    // Determine overall sentiment
    let overallSentiment = 'neutral';
    if (totalPredictions > 0) {
      if (upPercentage > 60) overallSentiment = 'bullish';
      else if (downPercentage > 60) overallSentiment = 'bearish';
      else overallSentiment = 'neutral';
    }

    const response = {
      asset: assetSymbol,
      duration,
      slots,
      summary: {
        totalPredictions,
        totalUp,
        totalDown,
        upPercentage,
        downPercentage,
        overallSentiment
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

    // Broadcast sentiment update via WebSocket for real-time updates
    if (wsService) {
      wsService.broadcastSentimentUpdate(assetSymbol, duration, response);
    }

  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SLOT ROUTES =====

// Get active slot
router.get('/slots/:duration/active', async (req, res) => {
  try {
    const slot = await getActiveSlot(req.params.duration as any);
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get active slot' });
  }
});

// Get all slots for duration
router.get('/slots/:duration', async (req, res) => {
  try {
    const slots = await getAllSlots(req.params.duration as any);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get slots' });
  }
});

// Get next slot
router.get('/slots/:duration/next', async (req, res) => {
  try {
    const slot = await getNextSlot(req.params.duration as any);
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get next slot' });
  }
});

// ===== ASSET ROUTES =====

// Get all assets
router.get('/assets', async (req, res) => {
  try {
    const assets = await getAllAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get assets' });
  }
});



// Get live asset price (real-time from APIs) - MUST come before general price route
router.get('/assets/:symbol/live-price', async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol);
    const { getLiveAssetPrice } = await import('./price-service');
    
    const price = await getLiveAssetPrice(symbol);
    if (price === null) {
      return res.status(404).json({ error: 'Asset not found or price unavailable' });
    }
    
    res.json({ 
      symbol, 
      price,
      timestamp: new Date().toISOString(),
      source: 'live'
    });
  } catch (error) {
    console.error(`Error fetching live price for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get live asset price' });
  }
});

// Get asset price (cached from database)
router.get('/assets/:symbol/price', async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol);
    const price = await getAssetPrice(symbol);
    if (!price) {
      return res.status(404).json({ error: 'Price not found' });
    }
    res.json({ symbol, price });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get asset price' });
  }
});

// Get asset price history
router.get('/assets/:symbol(*)/history', async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol);
    const { days = 30 } = req.query;
    const history = await getAssetPriceHistory(symbol, Number(days));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get price history' });
  }
});

// Debug route to catch all asset requests (removed as it was causing 404 errors)

// ===== OPINION ROUTES =====

// Get opinions for an asset
router.get('/assets/:symbol(*)/opinions', async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol);
    const { page = 1, limit = 10 } = req.query;
    
    // For now, return empty array until opinion service is implemented
    res.json({
      opinions: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get opinions' });
  }
});

// Get asset by symbol (general route - must come after all specific routes)
router.get('/assets/:symbol', async (req, res) => {
  try {
    console.log(`API: Asset route hit with params:`, req.params);
    const symbol = decodeURIComponent(req.params.symbol);
    console.log(`API: Looking for asset with symbol: ${symbol}`);
    
    const asset = await getAssetBySymbol(symbol);
    if (!asset) {
      console.log(`API: Asset not found for symbol: ${symbol}`);
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    console.log(`API: Found asset:`, { symbol: asset.symbol, name: asset.name, type: asset.type });
    res.json(asset);
  } catch (error) {
    console.error('API: Error fetching asset:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get asset' });
  }
});

// Create opinion for an asset
router.post('/assets/:symbol(*)/opinions', authMiddleware, async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol);
    const { sentiment, comment } = req.body;
    
    // For now, return success until opinion service is implemented
    res.json({ 
      success: true, 
      message: 'Opinion created successfully',
      opinion: {
        id: 'temp-id',
        symbol,
        sentiment,
        comment,
        userId: requireUser(req).userId,
        createdAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create opinion' });
  }
});

// Test price service debugging
router.get('/test/price-debug/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const { getLiveAssetPrice, getAssetBySymbol } = await import('./price-service');
    
    console.log(`Testing price service for symbol: ${symbol}`);
    
    // Test asset lookup
    const asset = await getAssetBySymbol(symbol);
    console.log('Asset lookup result:', asset);
    
    if (!asset) {
      return res.json({ error: 'Asset not found', symbol });
    }
    
    // Test live price
    const price = await getLiveAssetPrice(symbol);
    console.log('Live price result:', price);
    
    res.json({
      symbol,
      asset,
      price,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Price debug error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test ExchangeRate.host API
router.get('/test/exchangerate', async (req, res) => {
  try {
    const { base = 'EUR', quote = 'USD' } = req.query;
    const apiKey = process.env.EXCHANGERATE_API_KEY || '9782fcfa7c065df33f4f2ebacc986e4e';
    
    const apiUrl = apiKey 
      ? `https://api.exchangerate.host/live?access_key=${apiKey}&base=${base}&currencies=${quote}`
      : `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Trend-App/1.0',
      },

    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'ExchangeRate.host API error', 
        status: response.status,
        statusText: response.statusText 
      });
    }

    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ 
        error: 'ExchangeRate.host API error', 
        details: data.error 
      });
    }

    // Handle both convert and latest endpoints
    const responseData = apiKey && data.result 
      ? {
          success: true,
          from: data.query?.from,
          to: data.query?.to,
          amount: data.query?.amount,
          result: data.result,
          date: data.date,
          apiKeyUsed: true
        }
      : {
          success: true,
          base: data.base,
          date: data.date,
          rates: data.rates,
          apiKeyUsed: false
        };

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to test ExchangeRate.host API' 
    });
  }
});

// Manually update forex prices
router.post('/admin/update-forex', adminMiddleware, async (req, res) => {
  try {
    await updateForexPrices();
    res.json({ success: true, message: 'Forex prices updated successfully' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update forex prices' 
    });
  }
});

// ===== LEADERBOARD ROUTES =====

// Get monthly leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { month, includeAdmins } = req.query;
    const monthParam = month as string || 'previous';
    const includeAdminsParam = includeAdmins === 'false' ? false : true;
    
    let leaderboardData: any[] = [];
    
    if (monthParam === 'current') {
      leaderboardData = await getCurrentMonthLeaderboard();
    } else if (monthParam === 'previous') {
      leaderboardData = await getMonthlyLeaderboard(undefined);
    } else {
      // Validate month format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(monthParam)) {
        return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
      }
      leaderboardData = await getMonthlyLeaderboard(monthParam);
    }
    
    // Apply admin filtering if requested
    if (!includeAdminsParam && leaderboardData.length > 0) {
      // Get user roles for admin filtering
      const userIds = leaderboardData.map(entry => entry.userId);
      const usersData = await db.query.users.findMany({
        where: inArray(users.id, userIds),
      });
      const userMap = new Map(usersData.map(user => [user.id, user]));
      
      leaderboardData = leaderboardData.filter(entry => {
        const user = userMap.get(entry.userId);
        return user && user.role !== 'admin';
      });
    }
    
    // If still no data, fall back to current month leaderboard
    if (leaderboardData.length === 0) {
      console.log('No data found for requested month, falling back to current month');
      leaderboardData = await getCurrentMonthLeaderboard();
      
      // Apply admin filtering again if needed
      if (!includeAdminsParam && leaderboardData.length > 0) {
        const userIds = leaderboardData.map(entry => entry.userId);
        const usersData = await db.query.users.findMany({
          where: inArray(users.id, userIds),
        });
        const userMap = new Map(usersData.map(user => [user.id, user]));
        
        leaderboardData = leaderboardData.filter(entry => {
          const user = userMap.get(entry.userId);
          return user && user.role !== 'admin';
        });
      }
    }
    
    res.json({
      month: monthParam,
      includeAdmins: includeAdminsParam,
      data: leaderboardData,
      total: leaderboardData.length,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Berlin'
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current month leaderboard (live scores)
router.get('/leaderboard/current', async (req, res) => {
  try {
    const { includeAdmins } = req.query;
    const includeAdminsParam = includeAdmins === 'false' ? false : true;
    
    const leaderboardData = await getCurrentMonthLeaderboard();
    
    // Apply admin filtering if requested
    let filteredData = leaderboardData;
    if (!includeAdminsParam) {
      // Get user roles for admin filtering
      const userIds = leaderboardData.map(entry => entry.userId);
      const usersData = await db.query.users.findMany({
        where: inArray(users.id, userIds),
      });
      const userMap = new Map(usersData.map(user => [user.id, user]));
      
      filteredData = leaderboardData.filter(entry => {
        const user = userMap.get(entry.userId);
        return user && user.role !== 'admin';
      });
    }
    
    res.json({
      month: 'current',
      includeAdmins: includeAdminsParam,
      data: filteredData,
      total: filteredData.length,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Berlin'
    });
    
  } catch (error) {
    console.error('Error fetching current month leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's current month stats
router.get('/leaderboard/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = extractUserFromToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userStats = await getUserCurrentMonthStats(decoded.userId);
    if (!userStats) {
      return res.status(404).json({ error: 'User stats not found' });
    }

    res.json({
      ...userStats,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Berlin'
    });
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's badges
router.get('/users/:userId/badges', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const { getUserBadges } = await import('./badge-service');
    const badges = await getUserBadges(userId);
    
    res.json(badges);
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard statistics
router.get('/leaderboard/stats', async (req, res) => {
  try {
    const stats = await getLeaderboardStats();
    
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Berlin'
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current month countdown
router.get('/leaderboard/countdown', async (req, res) => {
  try {
    const countdown = getCurrentMonthCountdown();
    
    res.json({
      ...countdown,
      timestamp: new Date().toISOString(),
      timezone: 'Europe/Berlin'
    });
    
  } catch (error) {
    console.error('Error fetching countdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ADMIN ROUTES =====

// Get admin stats
router.get('/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get admin stats' });
  }
});

// Get admin dashboard overview
router.get('/admin/dashboard', adminMiddleware, async (req, res) => {
  try {
    const stats = await getAdminStats();
    const leaderboardStats = await getMonthlyLeaderboardStats();
    const topAssets = await getTopAssetsByVolume();
    const activeSlots = await getActiveSlots();
    
    res.json({
      stats,
      leaderboardStats,
      topAssets,
      activeSlots
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get dashboard data' });
  }
});

// Get all users
router.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get users' });
  }
});

// Get user details
router.get('/admin/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const user = await getUserDetails(req.params.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user details' });
  }
});

// Get user predictions (admin)
router.get('/admin/users/:userId/predictions', adminMiddleware, async (req, res) => {
  try {
    const predictions = await getUserPredictions(req.params.userId);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user predictions' });
  }
});

// Update user status
router.put('/admin/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const user = await updateUser(req.params.userId, req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update user' });
  }
});

// Verify user email (admin)
router.post('/admin/users/:userId/verify', adminMiddleware, async (req, res) => {
  try {
    const user = await verifyUserEmail(req.params.userId);
    res.json({ message: 'User email verified successfully', user });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to verify user email' });
  }
});

// Deactivate user (admin)
router.post('/admin/users/:userId/deactivate', adminMiddleware, async (req, res) => {
  try {
    const user = await deactivateUser(req.params.userId);
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to deactivate user' });
  }
});

// Activate user (admin)
router.post('/admin/users/:userId/activate', adminMiddleware, async (req, res) => {
  try {
    const user = await activateUser(req.params.userId);
    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to activate user' });
  }
});

// Get unverified users (admin)
router.get('/admin/users/unverified', adminMiddleware, async (req, res) => {
  try {
    const users = await getUnverifiedUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get unverified users' });
  }
});



// ===== ADMIN PREDICTION ENDPOINTS =====

// Get all predictions with filters (admin)
router.get('/admin/predictions', adminMiddleware, async (req, res) => {
  try {
    const { 
      status, 
      result, 
      assetSymbol, 
      duration, 
      userId,
      page = '1', 
      limit = '50',
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 200);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(predictions.status, status as any));
    }

    if (result) {
      whereConditions.push(eq(predictions.result, result as any));
    }

    if (duration) {
      whereConditions.push(eq(predictions.duration, duration as any));
    }

    if (userId) {
      whereConditions.push(eq(predictions.userId, userId as string));
    }

    if (startDate) {
      whereConditions.push(gte(predictions.timestampCreated, new Date(startDate as string)));
    }

    if (endDate) {
      whereConditions.push(lte(predictions.timestampCreated, new Date(endDate as string)));
    }

    // Get predictions with user and asset info
    const allPredictions = await db
      .select({
        id: predictions.id,
        userId: predictions.userId,
        username: users.username,
        direction: predictions.direction,
        duration: predictions.duration,
        slotNumber: predictions.slotNumber,
        slotStart: predictions.slotStart,
        slotEnd: predictions.slotEnd,
        timestampCreated: predictions.timestampCreated,
        timestampExpiration: predictions.timestampExpiration,
        status: predictions.status,
        result: predictions.result,
        pointsAwarded: predictions.pointsAwarded,
        priceStart: predictions.priceStart,
        priceEnd: predictions.priceEnd,
        evaluatedAt: predictions.evaluatedAt,
        assetSymbol: assets.symbol,
        assetName: assets.name,
        assetType: assets.type,
      })
      .from(predictions)
      .innerJoin(users, eq(predictions.userId, users.id))
      .innerJoin(assets, eq(predictions.assetId, assets.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(predictions.timestampCreated)
      .limit(limitNum)
      .offset(offset);

    // Filter by asset symbol if provided
    let filteredPredictions = allPredictions;
    if (assetSymbol) {
      filteredPredictions = allPredictions.filter(pred => 
        pred.assetSymbol === assetSymbol
      );
    }

    // Get total count
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(predictions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = parseInt(totalCount[0]?.count?.toString() || '0');

    res.json({
      predictions: filteredPredictions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error fetching admin predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually evaluate a prediction (admin)
router.post('/admin/predictions/:id/evaluate', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { result, pointsAwarded, priceStart, priceEnd } = req.body;

    // Validate required fields
    if (!result || !['correct', 'incorrect', 'pending'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result value' });
    }

    // Get the prediction
    const prediction = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, id))
      .limit(1);

    if (prediction.length === 0) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const pred = prediction[0];

    // Update prediction
    await db
      .update(predictions)
      .set({
        status: 'evaluated',
        result,
        pointsAwarded: pointsAwarded || 0,
        priceStart: priceStart ? priceStart.toString() : pred.priceStart,
        priceEnd: priceEnd ? priceEnd.toString() : pred.priceEnd,
        evaluatedAt: new Date()
      })
      .where(eq(predictions.id, id));

    // Update user profile if points changed
    if (pointsAwarded !== undefined && pointsAwarded !== pred.pointsAwarded) {
      const pointsDiff = pointsAwarded - (pred.pointsAwarded || 0);
      
      await db
        .update(userProfiles)
        .set({
          monthlyScore: sql`${userProfiles.monthlyScore} + ${pointsDiff}`,
          totalScore: sql`${userProfiles.totalScore} + ${pointsDiff}`,
          totalPredictions: sql`${userProfiles.totalPredictions} + 1`,
          correctPredictions: sql`${userProfiles.correctPredictions} + ${result === 'correct' ? 1 : 0}`
        })
        .where(eq(userProfiles.userId, pred.userId));
    }

    res.json({ 
      message: 'Prediction evaluated successfully',
      predictionId: id,
      result,
      pointsAwarded
    });

  } catch (error) {
    console.error('Error evaluating prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger price recalculation for an asset (admin)
router.post('/admin/prices/recalc', adminMiddleware, async (req, res) => {
  try {
    const { assetSymbol, assetType } = req.body;

    if (!assetSymbol || !assetType) {
      return res.status(400).json({ error: 'Asset symbol and type are required' });
    }

    // Get asset
    const asset = await db
      .select()
      .from(assets)
      .where(eq(assets.symbol, assetSymbol))
      .limit(1);

    if (asset.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Trigger price update
    await updateForexPrices();

    res.json({ 
      message: 'Price recalculation triggered successfully',
      assetSymbol,
      assetType
    });

  } catch (error) {
    console.error('Error triggering price recalculation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger leaderboard recalculation (admin)
router.post('/admin/leaderboard/recalc', adminMiddleware, async (req, res) => {
  try {
    const { monthYear } = req.body;

    // Import the leaderboard archiver function
    const { triggerMonthlyArchive } = await import('./workers/leaderboardArchiver.js');
    
    // Trigger archive
    await triggerMonthlyArchive(monthYear);

    res.json({ 
      message: 'Leaderboard recalculation triggered successfully',
      monthYear: monthYear || 'previous month'
    });

  } catch (error) {
    console.error('Error triggering leaderboard recalculation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all assets (admin)
router.get('/admin/assets', adminMiddleware, async (req, res) => {
  try {
    const assets = await getAllAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get assets' });
  }
});

// Update asset price (admin)
router.put('/admin/assets/:assetId/price', adminMiddleware, async (req, res) => {
  try {
    const { price } = req.body;
    if (!price || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    const asset = await updateAssetPrice(req.params.assetId, Number(price));
    res.json({ message: 'Asset price updated successfully', asset });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update asset price' });
  }
});

// Add asset
router.post('/admin/assets', adminMiddleware, async (req, res) => {
  try {
    const assets = await addAsset(req.body);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add asset' });
  }
});

// Get asset price history (admin)
router.get('/admin/assets/:assetId/prices', adminMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const prices = await getAdminAssetPriceHistory(req.params.assetId);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get price history' });
  }
});

// Get all price feeds with filters
router.get('/admin/prices', adminMiddleware, async (req, res) => {
  try {
    const { asset, source, startDate, endDate } = req.query;
    const prices = await getAllPricesWithFilters({
      asset: asset as string,
      source: source as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get prices' });
  }
});

// Get leaderboard data
router.get('/admin/leaderboard', adminMiddleware, async (req, res) => {
  try {
    const data = await getMonthlyLeaderboardStats();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get leaderboard data' });
  }
});

// Get badge data
router.get('/admin/badges', adminMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const data = await getBadgeData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get badge data' });
  }
});

// Trigger price update
router.post('/admin/prices/update', adminMiddleware, async (req, res) => {
  try {
    const result = await triggerPriceUpdate();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to trigger price update' });
  }
});

// Trigger badge backfill for existing users
router.post('/admin/badges/backfill', adminMiddleware, async (req, res) => {
  try {
    const { backfillBadgesForExistingUsers } = await import('./badge-service');
    const result = await backfillBadgesForExistingUsers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to trigger badge backfill' });
  }
});

// Get badge statistics
router.get('/admin/badges/stats', adminMiddleware, async (req, res) => {
  try {
    const { getBadgeStatistics } = await import('./badge-service');
    const stats = await getBadgeStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get badge statistics' });
  }
});

// Get system health
router.get('/admin/health', adminMiddleware, async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get system health' });
  }
});

// ===== UTILITY ROUTES =====

// Search users
router.get('/search/users', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const users = await searchUsers(q as string, Number(limit), Number(offset));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to search users' });
  }
});

// Get users by rank
router.get('/users/ranked', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const users = await getUsersByRank(Number(limit), Number(offset));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get ranked users' });
  }
});

// Initialize system (run once)
router.post('/init', async (req, res) => {
  try {
    await Promise.all([
      initializeSlotConfigs(),
      initializeDefaultAssets(),
    ]);
    res.json({ message: 'System initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initialize system' });
  }
});

// Evaluate expired predictions (cron job endpoint)
router.post('/cron/evaluate-predictions', async (req, res) => {
  try {
    await evaluateExpiredPredictions();
    res.json({ message: 'Predictions evaluated successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to evaluate predictions' });
  }
});

export default router;
