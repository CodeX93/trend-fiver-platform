import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

export default function EmailVerificationStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const isEmailVerified = user?.emailVerified || false;
  
  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/resend-verification');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resend verification email');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('email_verification.resend_success_title'),
        description: t('email_verification.resend_success_desc'),
        variant: "default",
      });
      
      // Show cooldown info if provided
      if (data.cooldown) {
        const cooldownMinutes = Math.ceil(data.cooldown / 1000 / 60);
        toast({
          title: "Cooldown Active",
          description: `You can request another verification email in ${cooldownMinutes} minutes`,
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      // Handle cooldown errors specifically
      if (error.message.includes('Please wait')) {
        const match = error.message.match(/(\d+) minutes/);
        if (match) {
          toast({
            title: "Cooldown Active",
            description: t('email_verification.cooldown_message', { minutes: match[1] }),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('email_verification.resend_error_title'),
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t('email_verification.resend_error_title'),
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
  
  // Se l'utente non ha un'email registrata, non mostriamo nulla
  if (!user?.email) {
    return null;
  }
  
  return (
    <div className="mb-6">
      {!isEmailVerified && (
        <Alert className="mb-4 bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('email_verification.unverified_title')}</AlertTitle>
          <AlertDescription>
            {t('email_verification.unverified_desc')}
          </AlertDescription>
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('email_verification.sending')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('email_verification.resend_button')}
                </>
              )}
            </Button>
          </div>
        </Alert>
      )}
      
      {isEmailVerified && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t('email_verification.verified_title')}</AlertTitle>
          <AlertDescription>
            {t('email_verification.verified_desc')}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center">
        <span className="mr-2">{t('email_verification.status_label')}</span>
        {isEmailVerified ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t('email_verification.verified')}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">
            <AlertCircle className="mr-1 h-3 w-3" />
            {t('email_verification.unverified')}
          </Badge>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {user.email}
        </div>
      </div>
    </div>
  );
}