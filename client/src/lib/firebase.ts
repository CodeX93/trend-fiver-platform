import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
// Uses environment variables if provided, otherwise falls back to the supplied project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9YwUZlFZSKuBytc4N7TIWmEY8wGdwkik",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trend-e49f8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trend-e49f8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trend-e49f8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "587174083064",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:587174083064:web:f0e573c0801eedb47ffe0d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-VM7H9NCK35",
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