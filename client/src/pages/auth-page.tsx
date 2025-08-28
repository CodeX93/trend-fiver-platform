import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Mail, Lock, Eye, EyeOff, Key } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase-auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const newPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
type NewPasswordData = z.infer<typeof newPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, verifyEmailMutation, requestPasswordResetMutation, resetPasswordMutation } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isResetRequested, setIsResetRequested] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await signInWithGoogle();
      
      // Get the ID token from Firebase
      const idToken = await result.user.getIdToken();
      
      // Send token to your backend
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          idToken,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to authenticate with backend');
      }
      
      const data = await response.json();
      
      // Store the backend JWT in the standard key used by the app
      localStorage.setItem('authToken', data.token);
      window.location.reload(); // Simple refresh to update auth state
      
      toast({
        title: "Google login successful",
        description: `Welcome, ${result.user.displayName || result.user.email}!`,
      });
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Google login failed",
        description: error.message || "An error occurred during Google sign-in",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  // Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // New password form
  const newPasswordForm = useForm<NewPasswordData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  const onResetPasswordSubmit = (data: ResetPasswordData) => {
    requestPasswordResetMutation.mutate(data, {
      onSuccess: () => {
        setIsResetRequested(true);
        toast({
          title: "Reset email sent",
          description: "Check your email for password reset instructions.",
        });
      },
    });
  };

  const onNewPasswordSubmit = (data: NewPasswordData) => {
    const { confirmPassword, ...resetData } = data;
    resetPasswordMutation.mutate(resetData, {
      onSuccess: () => {
        setActiveTab("login");
        setIsResetRequested(false);
        setResetToken("");
        toast({
          title: "Password reset successful",
          description: "You can now log in with your new password.",
        });
      },
    });
  };

  // Check for reset token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const verifyToken = urlParams.get('verify');

  if (verifyToken) {
    verifyEmailMutation.mutate({ token: verifyToken });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Verifying your email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (token && !isResetRequested) {
    setResetToken(token);
    setActiveTab("new-password");
  }

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Login/Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Trend</CardTitle>
            <CardDescription className="text-center">
              Sign in to track financial asset sentiment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
                <TabsTrigger value="reset-password">Reset Password</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter your password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    {/* Google Sign-in Button */}
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in with Google...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setActiveTab("reset-password")}
                        className="text-sm"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                    
                    {/* Email verification reminder */}
                    <Alert className="mt-4">
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Can't log in? Make sure you've verified your email address. 
                        Check your inbox for the verification link.
                      </AlertDescription>
                    </Alert>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email address" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Choose a password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="Confirm your password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    {/* Email verification info */}
                    <Alert className="mt-4">
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        After creating your account, you'll receive a verification email. 
                        Please check your inbox and click the verification link to activate your account.
                      </AlertDescription>
                    </Alert>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="reset-password">
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4 pt-4">
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </AlertDescription>
                    </Alert>
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={requestPasswordResetMutation.isPending}>
                      {requestPasswordResetMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setActiveTab("login")}
                        className="text-sm"
                      >
                        Back to login
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="new-password">
                <Form {...newPasswordForm}>
                  <form onSubmit={newPasswordForm.handleSubmit(onNewPasswordSubmit)} className="space-y-4 pt-4">
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        Enter your new password below.
                      </AlertDescription>
                    </Alert>
                    <FormField
                      control={newPasswordForm.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reset Token</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter reset token" 
                              {...field} 
                              value={resetToken || field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                setResetToken(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter new password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="Confirm new password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                      {resetPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setActiveTab("login")}
                        className="text-sm"
                      >
                        Back to login
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* App Introduction */}
      <div className="flex-1 bg-primary p-6 flex items-center justify-center text-white">
        <div className="max-w-md">
          <div className="flex items-center mb-6">
            <TrendingUp className="h-12 w-12 mr-4" />
            <h1 className="text-4xl font-bold">Trend</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            Track and Share Market Sentiment
          </h2>
          <p className="mb-6 text-primary-foreground/90">
            Welcome to Trend - the platform for sharing and discovering sentiment
            and predictions about financial assets. Join our community to track
            market sentiment for cryptocurrencies, stocks, and more.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Track Sentiment</h3>
              <p className="text-sm text-primary-foreground/80">
                See what others think about assets and their price predictions
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Share Opinions</h3>
              <p className="text-sm text-primary-foreground/80">
                Add your own predictions and sentiment analysis
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Discover Trends</h3>
              <p className="text-sm text-primary-foreground/80">
                Find popular assets and track community sentiment
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Make Better Decisions</h3>
              <p className="text-sm text-primary-foreground/80">
                Use community wisdom to inform your investment choices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
