import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type VerificationProgress = {
  isVerified: boolean;
  accountAge: {
    months: number;
    isComplete: boolean;
  };
  opinionCount: {
    count: number;
    isComplete: boolean;
  };
};

export default function VerificationProgress() {
  const { toast } = useToast();
  
  const {
    data: progress,
    isLoading,
    error,
  } = useQuery<VerificationProgress, Error>({
    queryKey: ["/api/verification-progress"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-60 mt-1" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load verification progress: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!progress) {
    return null;
  }
  
  const isNewlyVerified = 
    progress.isVerified && 
    progress.accountAge.isComplete && 
    progress.opinionCount.isComplete;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Advisor Verification Status
          {progress.isVerified && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              Verified Advisor
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Verified advisors have verified their email address and made at least 15 predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isNewlyVerified && (
            <Alert className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Congratulations!</AlertTitle>
              <AlertDescription>
                You are now a verified advisor! Your insights will be highlighted across the platform.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email Verification</span>
              </div>
              <span className="text-sm">
                {progress.accountAge.isComplete ? 'Verified' : 'Not verified'}
                {progress.accountAge.isComplete && (
                  <CheckCircle className="inline-block ml-1 h-4 w-4 text-green-600" />
                )}
              </span>
            </div>
            <Progress 
              value={progress.accountAge.isComplete ? 100 : 0} 
              className={progress.accountAge.isComplete ? "bg-green-100" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Predictions Made</span>
              </div>
              <span className="text-sm">
                {progress.opinionCount.count} / 15 predictions
                {progress.opinionCount.isComplete && (
                  <CheckCircle className="inline-block ml-1 h-4 w-4 text-green-600" />
                )}
              </span>
            </div>
            <Progress 
              value={Math.min((progress.opinionCount.count / 15) * 100, 100)}
              className={progress.opinionCount.isComplete ? "bg-green-100" : ""}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}