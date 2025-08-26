import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from './db';
import { users, userProfiles, emailVerifications, passwordResets } from '../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationToken, generatePasswordResetToken } from './email-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const newPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Generate verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Register new user
export async function registerUser(input: RegisterInput) {
  const { username, email, password } = input;
  
  console.log('Starting registration for:', { username, email });

  // Check if user already exists
  console.log('Checking for existing user...');
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    throw new Error('User with this email or username already exists');
  }
  
  console.log('No existing user found, proceeding with registration...');

  // Hash password
  console.log('Hashing password...');
  const hashedPassword = await hashPassword(password);
  console.log('Password hashed successfully');

  // Create user
  console.log('Creating user in database...');
  const [user] = await db.insert(users).values({
    username,
    email,
    password: hashedPassword,
  }).returning();
  console.log('User created successfully:', user.id);

  // Create user profile
  console.log('Creating user profile...');
  await db.insert(userProfiles).values({
    userId: user.id,
  });
  console.log('User profile created successfully');

  // Generate verification token
  console.log('Generating verification token...');
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  console.log('Verification token generated:', verificationToken);

  console.log('Creating email verification record...');
  await db.insert(emailVerifications).values({
    userId: user.id,
    email: user.email,
    token: verificationToken,
    expiresAt,
  });
  console.log('Email verification record created successfully');

  // Send verification email (don't fail registration if email fails)
  try {
    await sendVerificationEmail(user.email, verificationToken);
    console.log(`Verification email sent to ${user.email}`);
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Don't fail the registration, just log the error
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
    },
    message: 'Registration successful. Please check your email to verify your account.',
  };
}

// Login user
export async function loginUser(input: LoginInput) {
  const { email, password } = input;

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new Error('Please verify your email before logging in');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
    token,
  };
}

// Verify email
export async function verifyEmail(token: string) {
  const verification = await db.query.emailVerifications.findFirst({
    where: and(
      eq(emailVerifications.token, token),
      eq(emailVerifications.verified, false),
      eq(emailVerifications.expiresAt, new Date(), '>')
    ),
  });

  if (!verification) {
    throw new Error('Invalid or expired verification token');
  }

  // Update user email verification status
  await db.update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verification.userId));

  // Mark verification as used
  await db.update(emailVerifications)
    .set({ verified: true })
    .where(eq(emailVerifications.id, verification.id));

  return { message: 'Email verified successfully' };
}

// Request password reset
export async function requestPasswordReset(input: ResetPasswordInput) {
  const { email } = input;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // Don't reveal if user exists or not
    return { message: 'If an account with this email exists, a password reset link has been sent.' };
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing reset tokens for this user
  await db.delete(passwordResets)
    .where(eq(passwordResets.userId, user.id));

  // Create new reset token
  await db.insert(passwordResets).values({
    userId: user.id,
    token: resetToken,
    expiresAt,
  });

  // Send reset email
  await sendPasswordResetEmail(user.email, resetToken);

  return { message: 'If an account with this email exists, a password reset link has been sent.' };
}

// Reset password with token
export async function resetPassword(input: NewPasswordInput) {
  const { token, password } = input;

  const resetRecord = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.token, token),
      eq(passwordResets.used, false),
      eq(passwordResets.expiresAt, new Date(), '>')
    ),
  });

  if (!resetRecord) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const hashedPassword = await hashPassword(password);

  // Update user password
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, resetRecord.userId));

  // Mark reset token as used
  await db.update(passwordResets)
    .set({ used: true })
    .where(eq(passwordResets.id, resetRecord.id));

  return { message: 'Password reset successfully' };
}

// Get user by ID
export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: user.password, // Include password for password change functionality
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// Middleware to extract user from token
export function extractUserFromToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

// Check if user is admin
export function isAdmin(user: JWTPayload | null): boolean {
  return user?.role === 'admin';
}

// Check if user is authenticated
export function isAuthenticated(user: JWTPayload | null): boolean {
  return !!user;
}
