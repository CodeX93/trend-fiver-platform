import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  registerWithEmailAndPassword, 
  loginWithEmailAndPassword, 
  logout, 
  sendVerificationEmail,
  sendPasswordReset,
  onAuthStateChange,
  getCurrentUser,
  convertFirebaseUser,
  isAuthenticatedAndVerified,
  isAuthenticated,
  signInWithGoogle,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
  AuthUser
} from "@/lib/firebase-auth";
import { useToast } from "@/hooks/use-toast";

interface FirebaseAuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  registerMutation: ReturnType<typeof useMutation>;
  loginMutation: ReturnType<typeof useMutation>;
  googleLoginMutation: ReturnType<typeof useMutation>;
  logoutMutation: ReturnType<typeof useMutation>;
  sendVerificationMutation: ReturnType<typeof useMutation>;
  sendPasswordResetMutation: ReturnType<typeof useMutation>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const authUser = convertFirebaseUser(firebaseUser);
        setUser(authUser);
        
        // Store Firebase user info in localStorage for backend integration
        localStorage.setItem('firebaseUser', JSON.stringify(authUser));
      } else {
        setUser(null);
        localStorage.removeItem('firebaseUser');
        localStorage.removeItem('authToken'); // Clear backend token too
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password, username }: { email: string; password: string; username?: string }) => {
      const userCredential = await registerWithEmailAndPassword(email, password, username);
      return convertFirebaseUser(userCredential.user);
    },
    onSuccess: (user) => {
      toast({
        title: "Registration successful",
        description: "Please check your email to verify your account before logging in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const userCredential = await loginWithEmailAndPassword(email, password);
      return convertFirebaseUser(userCredential.user);
    },
    onSuccess: (user) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName || user.email}!`,
      });
      
      // Invalidate queries to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Google OAuth login mutation
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const userCredential = await signInWithGoogle();
      return convertFirebaseUser(userCredential.user);
    },
    onSuccess: (user) => {
      toast({
        title: "Google login successful",
        description: `Welcome, ${user.displayName || user.email}!`,
      });
      
      // Invalidate queries to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Clear all queries
      queryClient.clear();
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send verification email mutation
  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      await sendVerificationEmail();
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send password reset mutation
  const sendPasswordResetMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      await sendPasswordReset(email);
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: "Please check your inbox for the password reset link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send password reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const value: FirebaseAuthContextType = {
    user,
    isLoading,
    isEmailVerified: user?.emailVerified || false,
    registerMutation,
    loginMutation,
    googleLoginMutation,
    logoutMutation,
    sendVerificationMutation,
    sendPasswordResetMutation,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}

// Utility functions
export function useFirebaseAuthGuard() {
  const { user, isEmailVerified, isLoading } = useFirebaseAuth();
  
  return {
    isAuthenticated: !!user,
    isEmailVerified,
    isLoading,
    user,
  };
} 