import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}

// Register new user with email verification
export async function registerWithEmailAndPassword(
  email: string, 
  password: string, 
  username?: string
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    // Update display name if provided
    if (username && userCredential.user) {
      // Note: Firebase doesn't allow updating displayName immediately after creation
      // You might need to handle this differently or update it later
    }
    
    return userCredential;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Login user
export async function loginWithEmailAndPassword(
  email: string, 
  password: string
): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      // Sign out the user if email is not verified
      await signOut(auth);
      throw new Error('Please verify your email before logging in. Check your inbox for a verification link.');
    }
    
    return userCredential;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Google OAuth provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Sign in with Google popup
export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful:', result.user);
    // Google users are automatically verified
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Sign in with Google redirect (fallback for mobile)
export async function signInWithGoogleRedirect(): Promise<void> {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error('Google redirect sign-in error:', error);
    throw error;
  }
}

// Get redirect result (call this on page load)
export async function getGoogleRedirectResult(): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error('Google redirect result error:', error);
    throw error;
  }
}

// Send email verification
export async function sendVerificationEmail(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    await sendEmailVerification(user);
  } catch (error) {
    console.error('Send verification email error:', error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

// Sign out user
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Get current user
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Convert Firebase user to our AuthUser interface
export function convertFirebaseUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    emailVerified: firebaseUser.emailVerified,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

// Check if user is authenticated and email is verified
export function isAuthenticatedAndVerified(): boolean {
  const user = auth.currentUser;
  return user !== null && user.emailVerified;
}

// Check if user is authenticated (regardless of email verification)
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

// Get current user's ID token for backend authentication
export async function getIdToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
} 