import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useState } from "react";
import AppHeader from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Award, Calendar, Star, Trophy, User2, BarChart2, TrendingUp, Check, AlertTriangle, Users, Mail, Edit, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { UserProfile, Prediction, UserBadge, MonthlyScore } from "@shared/schema";
import ProfileEditForm from "@/components/profile-edit-form";

interface PredictionWithAsset extends Prediction {
  asset: {
    name: string;
    symbol: string;
    type: string;
  };
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  // Fetch user predictions
  const { data: userPredictions, isLoading: predictionsLoading } = useQuery<PredictionWithAsset[]>({
    queryKey: ["/api/predictions"],
    enabled: !!user,
  });

  // Fetch user badges
  const { data: userBadges, isLoading: badgesLoading } = useQuery<UserBadge[]>({
    queryKey: ["/api/leaderboard/user/badges"],
    enabled: !!user,
  });

  // Fetch monthly scores
  const { data: monthlyScores, isLoading: scoresLoading } = useQuery<MonthlyScore[]>({
    queryKey: ["/api/leaderboard/user/scores"],
    enabled: !!user,
  });

  // Fetch current month stats
  const { data: currentMonthStats, isLoading: statsLoading } = useQuery<{ rank?: number }>({
    queryKey: ["/api/leaderboard/user"],
    enabled: !!user,
  });
  
  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  const isEmailVerified = user.emailVerified;
  const activePredictions = userPredictions?.filter(p => p.status === "active").length || 0;
  const evaluatedPredictions = userPredictions?.filter(p => p.status === "evaluated").length || 0;
  const correctPredictions = userPredictions?.filter(p => p.result === "correct").length || 0;
  const accuracyPercentage = evaluatedPredictions > 0 ? (correctPredictions / evaluatedPredictions) * 100 : 0;
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="space-y-6 md:col-span-1">
            {isEditing ? (
              <ProfileEditForm
                currentBio={userProfile?.bio || null}
                currentAvatar={userProfile?.avatar || null}
                username={user.username}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                      {userProfile?.avatar ? (
                        <img src={userProfile.avatar} alt={user.username} className="h-full w-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-primary text-3xl text-primary-foreground">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <CardTitle className="text-xl">{user.username}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Joined {profileLoading ? '...' : new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </CardDescription>
                    {isEmailVerified && (
                      <Badge variant="outline" className="mt-2 bg-primary/10">
                        <Check className="h-3 w-3 mr-1" /> Email Verified
                      </Badge>
                    )}
                    {user.role === "admin" && (
                      <Badge variant="outline" className="mt-2 bg-red-500/10 text-red-500">
                        <Star className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="mt-4"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Bio */}
                    {userProfile?.bio && (
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
                      </div>
                    )}
                    {/* Email Verification Status */}
                    {!isEmailVerified && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center text-sm text-yellow-800">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Email not verified
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                          Verify your email to make predictions
                        </p>
                      </div>
                    )}

                    {/* Monthly Score */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">Monthly Score</div>
                        <div className="text-sm font-bold">
                          {profileLoading ? <Skeleton className="h-4 w-12" /> : userProfile?.monthlyScore || 0}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current month: {currentMonthStats?.rank ? `Rank #${currentMonthStats.rank}` : 'Unranked'}
                      </div>
                    </div>

                  {/* Total Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Total Score</div>
                      <div className="text-sm font-bold">
                        {profileLoading ? <Skeleton className="h-4 w-12" /> : userProfile?.totalScore || 0}
                      </div>
                    </div>
                  </div>
                  
                  {/* Prediction Accuracy */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Prediction Accuracy</div>
                      <div className="text-sm font-bold">
                        {predictionsLoading ? <Skeleton className="h-4 w-12" /> : `${accuracyPercentage.toFixed(1)}%`}
                      </div>
                    </div>
                    <Progress value={accuracyPercentage} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <Trophy className="h-5 w-5 mb-1 text-primary" />
                      <div className="text-xl font-bold">
                        {profileLoading ? <Skeleton className="h-6 w-8" /> : userProfile?.lastMonthRank || '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">Last Month Rank</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                      <Activity className="h-5 w-5 mb-1 text-primary" />
                      <div className="text-xl font-bold">
                        {profileLoading ? <Skeleton className="h-6 w-8" /> : userProfile?.totalPredictions || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Predictions</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Social Stats */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Social</div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-2 text-blue-500" />
                        Followers
                      </div>
                      <div className="text-sm font-medium">
                        {profileLoading ? '...' : userProfile?.followersCount || 0}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm">
                        <User2 className="h-4 w-4 mr-2 text-green-500" />
                        Following
                      </div>
                      <div className="text-sm font-medium">
                        {profileLoading ? '...' : userProfile?.followingCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Account</div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Badge Display */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Achievement Badges
              </CardTitle>
              <CardDescription>
                Badges earned for being a top predictor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {badgesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : userBadges && userBadges.length > 0 ? (
                <div className="space-y-2">
                  {userBadges.map((badge) => (
                    <Badge key={badge.id} variant="outline" className="w-full justify-start">
                      {badge.badgeType === "1st_place" && "🥇"}
                      {badge.badgeType === "2nd_place" && "🥈"}
                      {badge.badgeType === "3rd_place" && "🥉"}
                      {badge.badgeType === "4th_place" && "🎖️"}
                      {badge.monthYear} - {badge.totalScore} points
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No badges earned yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Predictions History */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Prediction History</CardTitle>
                  <CardDescription>Your past and active predictions</CardDescription>
                </div>
                {activePredictions > 0 && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                    {activePredictions} Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-6 w-full grid grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="evaluated">Evaluated</TabsTrigger>
                  <TabsTrigger value="correct">Correct</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4">
                  {predictionsLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : userPredictions && userPredictions.length > 0 ? (
                    userPredictions.map(prediction => (
                      <PredictionCard key={prediction.id} prediction={prediction} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No predictions yet. Start making predictions to see your history here.
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="active" className="space-y-4">
                  {predictionsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : userPredictions && userPredictions.length > 0 ? (
                    userPredictions
                      .filter(p => p.status === "active")
                      .map(prediction => (
                        <PredictionCard key={prediction.id} prediction={prediction} />
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No active predictions
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="evaluated" className="space-y-4">
                  {predictionsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : userPredictions && userPredictions.length > 0 ? (
                    userPredictions
                      .filter(p => p.status === "evaluated")
                      .map(prediction => (
                        <PredictionCard key={prediction.id} prediction={prediction} />
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No evaluated predictions
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="correct" className="space-y-4">
                  {predictionsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : userPredictions && userPredictions.length > 0 ? (
                    userPredictions
                      .filter(p => p.status === "evaluated" && p.result === "correct")
                      .map(prediction => (
                        <PredictionCard key={prediction.id} prediction={prediction} />
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No correct predictions yet
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Score History */}
        {monthlyScores && monthlyScores.length > 0 && (
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Score History</CardTitle>
                <CardDescription>Your performance over the past months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {monthlyScores.map((score) => (
                    <div key={score.id} className="text-center p-3 border rounded-lg">
                      <div className="text-sm font-medium">{score.monthYear}</div>
                      <div className="text-lg font-bold text-primary">{score.score}</div>
                      <div className="text-xs text-muted-foreground">Rank #{score.rank}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </main>
  </div>
);
}

function PredictionCard({ prediction }: { prediction: PredictionWithAsset }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Active</Badge>;
      case "evaluated":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Evaluated</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "correct":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">
          <Check className="h-3 w-3 mr-1" /> Correct
        </Badge>;
      case "incorrect":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">
          <AlertTriangle className="h-3 w-3 mr-1" /> Incorrect
        </Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center">
          <div className="mr-3 p-2 rounded-full bg-muted flex-shrink-0">
            {getDirectionIcon(prediction.direction)}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{prediction.asset?.name || 'N/A'} ({prediction.asset?.symbol || 'N/A'})</div>
            <div className="text-sm text-muted-foreground">
              {new Date(prediction.timestampCreated || Date.now()).toLocaleDateString()} • {prediction.duration} • Slot {prediction.slotNumber}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-medium">Direction</div>
            <div className="flex items-center justify-end">
              {getDirectionIcon(prediction.direction)}
              <span className="ml-1 text-sm capitalize">{prediction.direction}</span>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-medium">Status</div>
            {getStatusBadge(prediction.status)}
          </div>

          {prediction.status === "evaluated" && (
            <>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium">Result</div>
                {getResultBadge(prediction.result)}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium">Points</div>
                <div className={`text-sm font-bold ${(prediction.pointsAwarded || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(prediction.pointsAwarded || 0) >= 0 ? '+' : ''}{prediction.pointsAwarded || 0}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}