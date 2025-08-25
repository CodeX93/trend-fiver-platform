import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation
const FROM_EMAIL = process.env.FROM_EMAIL;
const BASE_URL = process.env.BASE_URL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// Fail fast for production if required environment variables are missing
if (process.env.NODE_ENV === 'production') {
  if (!FROM_EMAIL) {
    throw new Error('FROM_EMAIL environment variable is required for production');
  }
  if (!BASE_URL) {
    throw new Error('BASE_URL environment variable is required for production');
  }
}

// Use defaults only for development
const safeFromEmail = FROM_EMAIL || 'noreply@trend-app.com';
const safeBaseUrl = BASE_URL || 'https://natural-pest-production.up.railway.app';

// Create transporter for Gmail SMTP
let transporter: nodemailer.Transporter | null = null;

// Initialize email transporter
async function initializeEmailTransporter() {
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS,
        },
        secure: true, // Use SSL
        port: 465, // Gmail SMTP port
      });
      
      // Verify transporter configuration
      await new Promise((resolve, reject) => {
        transporter!.verify((error, success) => {
          if (error) {
            console.error('❌ Email transporter verification failed:', error);
            transporter = null;
            reject(error);
          } else {
            console.log('✅ Email transporter is ready to send emails');
            resolve(success);
          }
        });
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      transporter = null;
      return false;
    }
  } else {
    console.log('📧 Gmail credentials not configured. Email verification will use console output.');
    console.log('📧 To enable email sending, set GMAIL_USER and GMAIL_PASS environment variables.');
    return false;
  }
}

// Initialize email transporter on startup
initializeEmailTransporter();

// Generate verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate password reset token
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${safeBaseUrl}/auth?verify=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">Welcome to Trend App!</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Financial Asset Sentiment Platform</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Thank you for registering with Trend App! To complete your registration and start making predictions, 
            please verify your email address by clicking the button below:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,123,255,0.3);">
            ✅ Verify Email Address
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
            <strong>Or copy and paste this link into your browser:</strong>
          </p>
          <p style="word-break: break-all; color: #007bff; margin: 0; font-size: 14px; font-family: monospace;">
            ${verificationUrl}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            <strong>Important:</strong>
          </p>
          <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>This link will expire in 24 hours</li>
            <li>You must verify your email to make predictions</li>
            <li>If you didn't create an account, you can safely ignore this email</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated email from Trend App. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    // Try to send email if transporter is available
    if (transporter) {
      const mailOptions = {
        from: `"Trend App" <${safeFromEmail}>`,
        to: email,
        subject: 'Verify Your Email - Trend App',
        html: emailContent,
        text: `Welcome to Trend App!\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
      };

      await transporter.sendMail(mailOptions);
      
      console.log('✅ Verification email sent successfully to:', email);
      return { success: true, emailSent: true };
    }
    
    // Fallback for when email service is not configured
    console.log('📧 === EMAIL VERIFICATION LINK ===');
    console.log('📧 Email would be sent to:', email);
    console.log('🔗 Verification URL:', verificationUrl);
    console.log('📧 ================================');
    console.log('📧 For development/testing:');
    console.log('📧 1. Copy the verification URL above');
    console.log('📧 2. Paste it in your browser to verify your email');
    console.log('📧 3. Or click the link directly if you have access to the console');
    console.log('📧 ================================');
    console.log('⚠️  IMPORTANT: Email verification is required to make predictions!');
    console.log('📧 ================================');
    
    return { success: true, verificationUrl, emailSent: false };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    
    // Fallback to console output if email sending fails
    console.log('📧 === FALLBACK EMAIL VERIFICATION ===');
    console.log('📧 Email sending failed, but here is the verification link:');
    console.log('📧 Email:', email);
    console.log('🔗 Verification URL:', verificationUrl);
    console.log('📧 ======================================');
    
    return { success: true, verificationUrl, emailSent: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${safeBaseUrl}/auth?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">Password Reset Request</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Trend App - Financial Asset Sentiment Platform</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            You requested a password reset for your Trend App account. To reset your password, 
            please click the button below:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(220,53,69,0.3);">
            🔒 Reset Password
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
            <strong>Or copy and paste this link into your browser:</strong>
          </p>
          <p style="word-break: break-all; color: #dc3545; margin: 0; font-size: 14px; font-family: monospace;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            <strong>Important:</strong>
          </p>
          <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>This link will expire in 24 hours</li>
            <li>If you didn't request a password reset, you can safely ignore this email</li>
            <li>Your password will remain unchanged if you don't click the link</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated email from Trend App. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    // Try to send email if transporter is available
    if (transporter) {
      const mailOptions = {
        from: `"Trend App" <${safeFromEmail}>`,
        to: email,
        subject: 'Password Reset - Trend App',
        html: emailContent,
        text: `Password Reset Request\n\nYou requested a password reset for your Trend App account. To reset your password, please click this link:\n${resetUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
      };

      await transporter.sendMail(mailOptions);
      
      console.log('✅ Password reset email sent successfully to:', email);
      return { success: true, emailSent: true };
    }
    
    // Fallback for when email service is not configured
    console.log('📧 === PASSWORD RESET LINK ===');
    console.log('📧 Email would be sent to:', email);
    console.log('🔗 Reset URL:', resetUrl);
    console.log('📧 ============================');
    console.log('📧 For development/testing:');
    console.log('📧 1. Copy the reset URL above');
    console.log('📧 2. Paste it in your browser to reset your password');
    console.log('📧 3. Or click the link directly if you have access to the console');
    console.log('📧 ============================');
    
    return { success: true, resetUrl, emailSent: false };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    
    // Fallback to console output if email sending fails
    console.log('📧 === FALLBACK PASSWORD RESET ===');
    console.log('📧 Email sending failed, but here is the reset link:');
    console.log('📧 Email:', email);
    console.log('🔗 Reset URL:', resetUrl);
    console.log('📧 ====================================');
    
    return { success: true, resetUrl, emailSent: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}