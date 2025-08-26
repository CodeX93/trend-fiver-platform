import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, AlertCircle } from "lucide-react";

const emailChangeSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
});

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

export default function EmailChangeForm() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
  });

  const emailChangeMutation = useMutation({
    mutationFn: async (data: EmailChangeFormData) => {
      const res = await apiRequest('POST', '/api/user/change-email', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to change email');
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      reset();
      toast({
        title: t('email_verification.change_email_success'),
        description: t('email_verification.email_changed'),
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('email_verification.change_email_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailChangeFormData) => {
    emailChangeMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('email_verification.change_email_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 text-green-700 border-green-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('email_verification.email_changed')}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => setIsSuccess(false)} 
            variant="outline" 
            className="mt-4"
          >
            Change Another Email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('email_verification.change_email_title')}
        </CardTitle>
        <CardDescription>
          Change your email address. You will need to verify the new email before you can make predictions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">{t('email_verification.new_email_label')}</Label>
            <Input
              id="newEmail"
              type="email"
              {...register("newEmail")}
              placeholder="Enter new email address"
              className={errors.newEmail ? "border-red-500" : ""}
            />
            {errors.newEmail && (
              <p className="text-sm text-red-500">{errors.newEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('email_verification.current_password_label')}</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register("currentPassword")}
              placeholder="Enter current password"
              className={errors.currentPassword ? "border-red-500" : ""}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={emailChangeMutation.isPending}
            className="w-full"
          >
            {emailChangeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {t('email_verification.change_email_button')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
