import { ReactNode } from 'react';
import { useFirebaseAuthGuard } from '@/hooks/use-firebase-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Shield, AlertCircle } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';

interface FirebaseProtectedRouteProps {
  children: ReactNode;
  requireEmailVerification?: boolean;
  fallback?: ReactNode;
}

export function FirebaseProtectedRoute({ 
  children, 
  requireEmailVerification = true,
  fallback 
}: FirebaseProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, isLoading, user } = useFirebaseAuthGuard();
  const { sendVerificationMutation, logoutMutation } = useFirebaseAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification required but not verified
  if (requireEmailVerification && !isEmailVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle>Email Verification Required</CardTitle>
            <CardDescription>
              Please verify your email address before accessing this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              We sent a verification link to <strong>{user?.email}</strong>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => sendVerificationMutation.mutate()}
                disabled={sendVerificationMutation.isPending}
              >
                {sendVerificationMutation.isPending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Check your spam folder if you don't see the email
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Higher-order component for protecting routes
export function withFirebaseAuth<P extends object>(
  Component: React.ComponentType<P>,
  requireEmailVerification = true
) {
  return function ProtectedComponent(props: P) {
    return (
      <FirebaseProtectedRoute requireEmailVerification={requireEmailVerification}>
        <Component {...props} />
      </FirebaseProtectedRoute>
    );
  };
} 