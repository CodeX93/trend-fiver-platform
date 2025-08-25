import { useEffect, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import AppHeader from "@/components/app-header";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function PasswordResetPage() {
  const [location] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const resetPassword = async () => {
      try {
        // Extract token from URL
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const token = urlParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid reset link. Missing token.');
          return;
        }

        // Token is valid, show password reset form
        setStatus('success');
        setMessage('Enter your new password');
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while processing the reset link.');
      }
    };

    resetPassword();
  }, [location]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset successfully. You can now log in with your new password.",
      });
      setRedirectTo('/auth');
    },
    onError: (error) => {
      toast({
        title: "Password Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const urlParams = new URLSearchParams(location.split('?')[1]);
      const token = urlParams.get('token');
      
      if (!token) {
        throw new Error('Invalid reset token');
      }

      await resetPasswordMutation.mutateAsync({
        token,
        password: newPassword.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    setRedirectTo('/auth');
  };

  if (redirectTo) {
    return <Redirect to={redirectTo} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Reset Password
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Processing reset link...'}
              {status === 'success' && 'Enter your new password'}
              {status === 'error' && 'Reset link is invalid or expired'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center mb-4">
                  <X className="h-12 w-12 text-red-500" />
                </div>
                <p className="text-muted-foreground mb-4">{message}</p>
                <Button onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}

            {status === 'success' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 pr-10"
                      required
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 pr-10"
                      required
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
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoToLogin}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 