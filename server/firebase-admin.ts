import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // For development - use default credentials with project ID
    if (process.env.FIREBASE_PROJECT_ID) {
      console.log(`🔥 Initializing Firebase Admin with project: ${process.env.FIREBASE_PROJECT_ID}`);
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // Fallback to default credentials
      console.log('⚠️  Using default Firebase credentials. Set FIREBASE_PROJECT_ID for production.');
      initializeApp();
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export { getAdminAuth };
