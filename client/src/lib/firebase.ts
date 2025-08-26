import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
// Uses environment variables if provided, otherwise falls back to the supplied project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDPg-DEeXutdt_IM9yulxout23hXuSCtQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trend-fiver-platform.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trend-fiver-platform",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trend-fiver-platform.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "613728497767",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:613728497767:web:ac8fb50c8bbd400c9824c2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XP6E3GNWTC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Connect to auth emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app; 