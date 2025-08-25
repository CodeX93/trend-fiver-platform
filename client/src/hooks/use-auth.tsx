import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, UserProfile } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User; profile: UserProfile; token: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: User; profile: UserProfile; token: string }, Error, RegisterData>;
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
  
  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Invalidate queries to refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    }
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem('authToken'),
  });

  const {
    data: profile,
  } = useQuery<UserProfile | undefined, Error>({
    queryKey: ["/api/user/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed');
      }
      const data = await res.json();
      
      // Store the JWT token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
    },
    onSuccess: (data: { user: User; profile: UserProfile; token: string }) => {
      queryClient.setQueryData(["/api/user/profile"], data.user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.username}!`,
      });
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
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      const data = await res.json();
      
      // Store the JWT token in localStorage if auto-verified
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
    },
    onSuccess: (data: { user: User; profile: UserProfile; token: string }) => {
      if (data.token) {
        queryClient.setQueryData(["/api/user/profile"], data.user);
      }
      toast({
        title: "Registration successful",
        description: data.token 
          ? `Welcome, ${data.user.username}!` 
          : `Welcome, ${data.user.username}! Please check your email to verify your account.`,
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
      const res = await apiRequest("POST", "/api/auth/request-reset", { email });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Password reset request failed');
      }
      return await res.json();
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
      // Remove the JWT token from localStorage
      localStorage.removeItem('authToken');
      // Clear all query cache
      queryClient.clear();
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
