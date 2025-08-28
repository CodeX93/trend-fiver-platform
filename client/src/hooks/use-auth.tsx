import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { UserProfile } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { registerWithEmailAndPassword, sendPasswordReset, loginWithEmailAndPassword, logout as firebaseLogout, onAuthStateChange } from "../lib/firebase-auth";
import { auth } from "../lib/firebase";

// Client-side User type (simplified from schema)
interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
}

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<void, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<void, Error, RegisterData>;
  verifyEmailMutation: UseMutationResult<{ message: string }, Error, { token: string }>;
  requestPasswordResetMutation: UseMutationResult<{ message: string }, Error, { email: string }>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, ResetPasswordData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
};

type ResetPasswordData = {
  token: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Firebase authentication state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Listen to Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // User is signed in
        const userData: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email!,
          emailVerified: firebaseUser.emailVerified,
          role: 'user' as const,
        };
        
        setUser(userData);
        setProfile(null); // You can create a profile later if needed
        setError(null);
      } else {
        // User is signed out
        setUser(null);
        setProfile(null);
        setError(null);
      }
      
      setIsLoading(false);
    });
    
          // Cleanup subscription on unmount
      return () => unsubscribe();
    }, []);
    


  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Use Firebase for login
        await loginWithEmailAndPassword(
          credentials.email, 
          credentials.password
        );
        // Note: User state is automatically updated by Firebase auth listener
      } catch (error: any) {
        console.error('Firebase login error:', error);
        throw new Error(error.message || 'Login failed');
      }
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      // Note: User state is automatically updated by Firebase auth listener
      // Redirect to home page after successful login
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      try {
        // Use Firebase for registration
        await registerWithEmailAndPassword(
          credentials.email, 
          credentials.password, 
          credentials.username
        );
        // Note: User state is automatically updated by Firebase auth listener
      } catch (error: any) {
        console.error('Firebase registration error:', error);
        throw new Error(error.message || 'Registration failed');
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Welcome! Please check your email to verify your account.",
      });
      
      // Note: Firebase handles email verification automatically
      // Users will receive a verification email from Firebase
      // User state is automatically updated by Firebase auth listener
      // Redirect to home page after successful registration
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", { token });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Email verification failed');
      }
      return await res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({
        title: "Email verified",
        description: data.message,
      });
      // Refresh user data to update emailVerified status
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Email verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestPasswordResetMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      try {
        // Use Firebase for password reset
        await sendPasswordReset(email);
        return { message: 'Password reset email sent successfully. Please check your inbox.' };
      } catch (error: any) {
        console.error('Firebase password reset error:', error);
        throw new Error(error.message || 'Password reset request failed');
      }
    },
    onSuccess: (data: { message: string }) => {
      toast({
        title: "Password reset requested",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Password reset failed');
      }
      return await res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({
        title: "Password reset successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Use Firebase for logout
        await firebaseLogout();
        // Clear all query cache
        queryClient.clear();
      } catch (error: any) {
        console.error('Firebase logout error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/profile"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        profile: profile ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        verifyEmailMutation,
        requestPasswordResetMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
