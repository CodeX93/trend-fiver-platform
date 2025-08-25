import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import AppHeader from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Trophy, Medal, User2, Star, Calendar, Award, Shield, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MonthlyLeaderboard, UserBadge } from "@shared/schema";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Fetch monthly leaderboard data
  const { data: leaderboardData, isLoading } = useQuery<MonthlyLeaderboard[]>({
    queryKey: ["/api/leaderboard", selectedMonth || "previous"],
    queryFn: async () => {
      const month = selectedMonth || "previous";
      const response = await fetch(`/api/leaderboard?month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      return response.json();
    },
  });

  // Fetch current month leaderboard
  const { data: currentMonthData } = useQuery<MonthlyLeaderboard[]>({
    queryKey: ["/api/leaderboard/current"],
    queryFn: async () => {
      const response = await fetch('/api/leaderboard/current');
      if (!response.ok) {
        throw new Error('Failed to fetch current month data');
      }
      return response.json();
    },
  });

  // Fetch user's current month stats
  const { data: userStats } = useQuery({
    queryKey: ["/api/leaderboard/user"],
    enabled: !!user,
  });

  // Fetch leaderboard stats
  const { data: leaderboardStats } = useQuery({
    queryKey: ["/api/leaderboard/stats"],
  });
  
  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  const getRankBadge = (rank: number) => {
    if (rank >= 1 && rank <= 4) {
      const colors = {
        1: "text-yellow-500", // Gold
        2: "text-gray-400", // Silver
        3: "text-amber-600", // Bronze
        4: "text-blue-500", // 4th place
      };
      
      const icons = {
        1: "🥇",
        2: "🥈", 
        3: "🥉",
        4: "🎖️",
      };
      
      return (
        <div className="flex items-center">
          <span className="text-2xl mr-2">{icons[rank as keyof typeof icons]}</span>
          <span className={`font-bold ${colors[rank as keyof typeof colors]}`}>#{rank}</span>
        </div>
      );
    }
    
    return <span className="text-sm font-medium">#{rank}</span>;
  };

  const getMonthLabel = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getAccuracyPercentage = (correct: number, total: number) => {
    if (total === 0) return 0;
    return (correct / total) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Monthly Leaderboard
            </h1>
            <p className="text-muted-foreground">
              Top 30 predictors from the previous month
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-primary" />
                Previous Month Results
              </CardTitle>
              <CardDescription>
                Final rankings from the previous month with permanent badges for Top 4
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : leaderboardData && leaderboardData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Predictor</TableHead>
                        <TableHead className="text-right">Total Score</TableHead>
                        <TableHead className="text-right">Predictions</TableHead>
                        <TableHead className="text-right">Accuracy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardData.map((predictor) => (
                        <TableRow key={predictor.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center justify-center">
                              {getRankBadge(predictor.rank)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User2 className="h-5 w-5 mr-2 text-muted-foreground" />
                              <Link href={`/user/${predictor.username}`} className="font-medium hover:text-primary transition-colors">
                                {predictor.username}
                              </Link>
                              {predictor.rank <= 4 && (
                                <Badge variant="secondary" className="ml-2">
                                  {predictor.rank === 1 && "🥇 Champion"}
                                  {predictor.rank === 2 && "🥈 Runner-up"}
                                  {predictor.rank === 3 && "🥉 Bronze"}
                                  {predictor.rank === 4 && "🎖️ Top 4"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                              <span className="font-medium">{predictor.totalScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {predictor.correctPredictions} / {predictor.totalPredictions}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Star className="h-4 w-4 mr-1 text-yellow-500" />
                              <span className="font-medium">
                                {predictor.accuracyPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No leaderboard data available for this month</p>
                  <p className="text-sm">Leaderboards are finalized at the end of each month</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Month Progress */}
          {currentMonthData && currentMonthData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  Current Month Progress
                </CardTitle>
                <CardDescription>
                  Live rankings for the current month (updates in real-time)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Predictor</TableHead>
                        <TableHead className="text-right">Monthly Score</TableHead>
                        <TableHead className="text-right">Predictions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(currentMonthData || []).slice(0, 10).map((predictor) => (
                        <TableRow key={predictor.id}>
                          <TableCell className="font-medium">
                            <span className="text-sm font-medium">#{predictor.rank}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User2 className="h-5 w-5 mr-2 text-muted-foreground" />
                              <Link href={`/user/${predictor.username}`} className="font-medium hover:text-primary transition-colors">
                                {predictor.username}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                              <span className="font-medium">{predictor.totalScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {predictor.totalPredictions}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>Showing top 10 of current month. Final rankings will be available at month end.</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="bg-muted rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold mb-2">How the Leaderboard Works</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Users earn points based on correct predictions and slot timing</li>
                  <li>Earlier slots offer higher rewards but greater risk</li>
                  <li>Monthly leaderboards are finalized on the 1st of each month</li>
                  <li>Top 4 users receive permanent badges for their achievement</li>
                  <li className="font-medium text-foreground">Scoring System:</li>
                  <ul className="list-circle list-inside ml-5 space-y-1">
                    <li>Correct prediction: +slot points</li>
                    <li>Incorrect prediction: -50% of slot points (minimum -1)</li>
                    <li>Earlier slots = higher potential rewards</li>
                  </ul>
                </ul>
              </div>
              <div className="bg-card rounded-md p-4 border shadow-sm flex flex-col items-center md:min-w-[180px]">
                <h4 className="font-medium mb-2">Your Current Status</h4>
                {userStats ? (
                  <>
                    <div className="text-4xl font-bold mb-1 text-primary">
                      {userStats.rank ? `#${userStats.rank}` : "Unranked"}
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      {userStats.score || 0} points this month
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {userStats.totalPredictions || 0} predictions
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold mb-1 text-muted-foreground">
                      --
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Make predictions to appear on the leaderboard
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboard Stats */}
          {leaderboardStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                  Leaderboard Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{leaderboardStats.totalUsers || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{leaderboardStats.totalPredictions || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Predictions</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{leaderboardStats.averageAccuracy || 0}%</div>
                    <div className="text-sm text-muted-foreground">Avg Accuracy</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{leaderboardStats.topScore || 0}</div>
                    <div className="text-sm text-muted-foreground">Top Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}