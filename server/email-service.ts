import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

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

export async function sendVerificationEmail(email: string, token: string, language: 'en' | 'it' = 'en') {
  const verificationUrl = `${safeBaseUrl}/auth?verify=${token}`;

  // Email content in both languages
  const content = {
    en: {
      title: 'Welcome to Trend App!',
      subtitle: 'Financial Asset Sentiment Platform',
      greeting: 'Thank you for registering with Trend App! To complete your registration and start making predictions, please verify your email address by clicking the button below:',
      button: '✅ Verify Email Address',
      linkText: 'Or copy and paste this link into your browser:',
      important: 'Important:',
      bullet1: 'This link will expire in 24 hours',
      bullet2: 'You must verify your email to make predictions',
      bullet3: 'If you didn\'t create an account, you can safely ignore this email',
      footer: 'This is an automated email from Trend App. Please do not reply to this email.',
      subject: 'Verify Your Email - Trend App'
    },
    it: {
      title: 'Benvenuto su Trend App!',
      subtitle: 'Piattaforma di Sentiment per Asset Finanziari',
      greeting: 'Grazie per esserti registrato su Trend App! Per completare la registrazione e iniziare a fare previsioni, verifica il tuo indirizzo email cliccando sul pulsante qui sotto:',
      button: '✅ Verifica Indirizzo Email',
      linkText: 'Oppure copia e incolla questo link nel tuo browser:',
      important: 'Importante:',
      bullet1: 'Questo link scadrà tra 24 ore',
      bullet2: 'Devi verificare la tua email per fare previsioni',
      bullet3: 'Se non hai creato un account, puoi ignorare questa email',
      footer: 'Questa è un\'email automatica da Trend App. Non rispondere a questa email.',
      subject: 'Verifica la Tua Email - Trend App'
    }
  };

  const t = content[language];

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">${t.title}</h1>
          <p style="color: #666; margin: 10px 0 0 0;">${t.subtitle}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            ${t.greeting}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,123,255,0.3);">
            ${t.button}
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
            <strong>${t.linkText}</strong>
          </p>
          <p style="word-break: break-all; color: #007bff; margin: 0; font-size: 14px; font-family: monospace;">
            ${verificationUrl}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            <strong>${t.important}</strong>
          </p>
          <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>${t.bullet1}</li>
            <li>${t.bullet2}</li>
            <li>${t.bullet3}</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${t.footer}
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
        subject: t.subject,
        html: emailContent,
        text: language === 'it' 
          ? `Benvenuto su Trend App!\n\nVerifica il tuo indirizzo email cliccando su questo link:\n${verificationUrl}\n\nQuesto link scadrà tra 24 ore.\n\nSe non hai creato un account, puoi ignorare questa email.`
          : `Welcome to Trend App!\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
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

export async function sendPasswordResetEmail(email: string, token: string, language: 'en' | 'it' = 'en') {
  const resetUrl = `${safeBaseUrl}/auth?token=${token}`;

  // Email content in both languages
  const content = {
    en: {
      title: 'Password Reset Request',
      subtitle: 'Trend App - Financial Asset Sentiment Platform',
      greeting: 'You requested a password reset for your Trend App account. To reset your password, please click the button below:',
      button: '🔒 Reset Password',
      linkText: 'Or copy and paste this link into your browser:',
      important: 'Important:',
      bullet1: 'This link will expire in 24 hours',
      bullet2: 'If you didn\'t request a password reset, you can safely ignore this email',
      bullet3: 'Your password will remain unchanged if you don\'t click the link',
      footer: 'This is an automated email from Trend App. Please do not reply to this email.',
      subject: 'Password Reset - Trend App'
    },
    it: {
      title: 'Richiesta Reset Password',
      subtitle: 'Trend App - Piattaforma di Sentiment per Asset Finanziari',
      greeting: 'Hai richiesto un reset della password per il tuo account Trend App. Per resettare la password, clicca sul pulsante qui sotto:',
      button: '🔒 Reset Password',
      linkText: 'Oppure copia e incolla questo link nel tuo browser:',
      important: 'Importante:',
      bullet1: 'Questo link scadrà tra 24 ore',
      bullet2: 'Se non hai richiesto un reset della password, puoi ignorare questa email',
      bullet3: 'La tua password rimarrà invariata se non clicchi sul link',
      footer: 'Questa è un\'email automatica da Trend App. Non rispondere a questa email.',
      subject: 'Reset Password - Trend App'
    }
  };

  const t = content[language];

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">${t.title}</h1>
          <p style="color: #666; margin: 10px 0 0 0;">${t.subtitle}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            ${t.greeting}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(220,53,69,0.3);">
            ${t.button}
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
            <strong>${t.linkText}</strong>
          </p>
          <p style="word-break: break-all; color: #dc3545; margin: 0; font-size: 14px; font-family: monospace;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            <strong>${t.important}</strong>
          </p>
          <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>${t.bullet1}</li>
            <li>${t.bullet2}</li>
            <li>${t.bullet3}</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${t.footer}
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
        subject: t.subject,
        html: emailContent,
        text: language === 'it'
          ? `Richiesta Reset Password\n\nHai richiesto un reset della password per il tuo account Trend App. Per resettare la password, clicca su questo link:\n${resetUrl}\n\nQuesto link scadrà tra 24 ore.\n\nSe non hai richiesto un reset della password, puoi ignorare questa email.`
          : `Password Reset Request\n\nYou requested a password reset for your Trend App account. To reset your password, please click this link:\n${resetUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
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