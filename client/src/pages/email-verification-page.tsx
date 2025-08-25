import { useEffect, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Mail } from "lucide-react";
import AppHeader from "@/components/app-header";

export default function EmailVerificationPage() {
  const [location] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Extract token from URL
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. Please check your email for the correct link.');
          return;
        }

        // Call the verification API
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now make predictions.');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.error || 'Email verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [location]);

  const handleGoHome = () => {
    setRedirectTo('/');
  };

  const handleGoToProfile = () => {
    setRedirectTo('/profile');
  };

  if (redirectTo) {
    return <Redirect to={redirectTo} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {status === 'success' && <Check className="h-8 w-8 text-green-500" />}
              {status === 'error' && <X className="h-8 w-8 text-red-500" />}
            </div>
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Please wait while we verify your email address.'}
              {status === 'success' && 'Your email has been successfully verified.'}
              {status === 'error' && 'We encountered an issue verifying your email.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
            
            {status === 'success' && (
              <div className="space-y-3">
                <Button onClick={handleGoToProfile} className="w-full">
                  Go to Profile
                </Button>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  Go to Home
                </Button>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-3">
                <Button onClick={handleGoHome} className="w-full">
                  Go to Home
                </Button>
                <p className="text-xs text-muted-foreground">
                  If you continue to have issues, please contact support or try registering again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 