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
import { Lock, Trophy, Medal, User2, Star, Calendar, Award, Shield, TrendingUp, TrendingDown, BarChart3, Filter, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MonthlyLeaderboard, UserBadge } from "@shared/schema";
import { MonthCountdown } from "@/components/month-countdown";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [includeAdmins, setIncludeAdmins] = useState<boolean>(true);
  
  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Fetch monthly leaderboard data (type updated to match new backend response)
  const { data: leaderboardData, isLoading } = useQuery<{
    month: string; includeAdmins: boolean; data: Array<MonthlyLeaderboard & { isAdmin?: boolean; badges: string[] }>; total: number; timestamp: string; timezone: string;
  }>({
    queryKey: ["/api/leaderboard", selectedMonth || "previous", includeAdmins],
    queryFn: async () => {
      const month = selectedMonth || "previous";
      const response = await fetch(`/api/leaderboard?month=${month}&includeAdmins=${includeAdmins}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      return response.json();
    },
  });

  // Fetch current month leaderboard (type updated to match new backend response)
  const { data: currentMonthData } = useQuery<{
    month: string; includeAdmins: boolean; data: Array<MonthlyLeaderboard & { isAdmin?: boolean; badges: string[] }>; total: number; timestamp: string; timezone: string;
  }>({
    queryKey: ["/api/leaderboard/current", includeAdmins],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/current?includeAdmins=${includeAdmins}`);
      if (!response.ok) {
        throw new Error('Failed to fetch current month data');
      }
      return response.json();
    },
  });

  // Fetch user's current month stats
  const { data: userStats } = useQuery<{
    currentRank: number;
    monthlyScore: number;
    totalPredictions: number;
    accuracyPercentage: number;
    isAdmin: boolean;
  }>({
    queryKey: ["/api/leaderboard/user"],
    enabled: !!user,
  });

  // Fetch leaderboard stats
  const { data: leaderboardStats } = useQuery<{
    currentMonth: { participants: number; monthYear: string };
    previousMonth: { participants: number; monthYear: string };
  }>({
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

  const formatTimestamp = (timestamp: string, timezone: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">🏆 Leaderboard</h1>
          <p className="text-center text-muted-foreground">
            Compete with traders worldwide and climb the ranks
          </p>
        </div>

        {/* Month Countdown */}
        <div className="mb-6">
          <MonthCountdown />
        </div>

        {/* Admin Filter Toggle */}
        <div className="mb-6 flex items-center justify-center space-x-2">
          <Switch
            id="include-admins"
            checked={includeAdmins}
            onCheckedChange={setIncludeAdmins}
          />
          <Label htmlFor="include-admins" className="text-sm">
            {includeAdmins ? 'Include Admins' : 'Exclude Admins'}
          </Label>
          <Badge variant="outline" className="ml-2">
            {includeAdmins ? 'All Users' : 'Regular Users Only'}
          </Badge>
        </div>

        {/* Month Selection */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-2">
            <Button
              variant={selectedMonth === "" ? "default" : "outline"}
              onClick={() => setSelectedMonth("")}
            >
              Previous Month
            </Button>
            <Button
              variant={selectedMonth === "current" ? "default" : "outline"}
              onClick={() => setSelectedMonth("current")}
            >
              Current Month
            </Button>
            <Button
              variant={selectedMonth === currentMonth ? "default" : "outline"}
              onClick={() => setSelectedMonth(currentMonth)}
            >
              {getMonthLabel(currentMonth)}
            </Button>
          </div>
        </div>

        {/* Leaderboard Stats */}
        {leaderboardStats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Month Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboardStats.currentMonth?.participants || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {leaderboardStats.currentMonth?.monthYear || 'Current Month'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Previous Month Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboardStats.previousMonth?.participants || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {leaderboardStats.previousMonth?.monthYear || 'Previous Month'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Stats */}
        {userStats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User2 className="h-5 w-5" />
                Your Current Month Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.currentRank || 'Unranked'}</div>
                  <div className="text-xs text-muted-foreground">Current Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{userStats.monthlyScore || 0}</div>
                  <div className="text-xs text-muted-foreground">Monthly Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userStats.totalPredictions || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Predictions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {userStats.accuracyPercentage ? userStats.accuracyPercentage.toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              </div>
              {userStats.isAdmin && (
                <div className="mt-3 flex justify-center">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Admin User
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly Rankings</TabsTrigger>
            <TabsTrigger value="current">Live Current Month</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {selectedMonth === "" ? "Previous Month" : selectedMonth === "current" ? "Current Month" : getMonthLabel(selectedMonth)} Leaderboard
                </CardTitle>
                <CardDescription>
                  {leaderboardData && (
                    <div className="flex items-center justify-between">
                      <span>Top {leaderboardData.total} participants</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Timezone: {leaderboardData.timezone || 'Europe/Berlin'}</span>
                        {leaderboardData.timestamp && (
                          <span>Updated: {formatTimestamp(leaderboardData.timestamp, leaderboardData.timezone)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>

                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : leaderboardData?.data ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Predictions</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Badges</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardData.data.map((entry) => (
                        <TableRow key={entry.userId}>
                          <TableCell>{getRankBadge(entry.rank)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.username}</span>
                              {entry.isAdmin && (
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                  <Crown className="h-3 w-3" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{entry.totalScore}</TableCell>
                          <TableCell>{entry.totalPredictions}</TableCell>
                          <TableCell>{entry.accuracyPercentage ? parseFloat(entry.accuracyPercentage.toString()).toFixed(1) : '0.0'}%</TableCell>
                                                     <TableCell>
                             <div className="flex gap-1">
                               {entry.badges?.map((badge, index) => (
                                 <Badge key={index} variant="outline" className="text-xs">
                                   {badge}
                                 </Badge>
                               )) || <span className="text-muted-foreground">No badges</span>}
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-4">
                      <strong>No leaderboard data available</strong>
                    </div>
                    <div className="text-sm">
                      <p>This could be because:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>No users have made predictions yet</li>
                        <li>The month hasn't ended (for previous month data)</li>
                        <li>There's an issue with data fetching</li>
                      </ul>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      className="mt-4"
                    >
                      Refresh Page
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Live Current Month Rankings
                </CardTitle>
                <CardDescription>
                  {currentMonthData && (
                    <div className="flex items-center justify-between">
                      <span>Live scores updated in real-time</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Timezone: {currentMonthData.timezone || 'Europe/Berlin'}</span>
                        {currentMonthData.timestamp && (
                          <span>Updated: {formatTimestamp(currentMonthData.timestamp, currentMonthData.timezone)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentMonthData?.data ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Predictions</TableHead>
                        <TableHead>Accuracy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthData.data.map((entry) => (
                        <TableRow key={entry.userId}>
                          <TableCell>{getRankBadge(entry.rank)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.username}</span>
                                                             {entry.isAdmin && (
                                 <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                   <Crown className="h-3 w-3" />
                                   Admin
                                 </Badge>
                               )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{entry.totalScore}</TableCell>
                          <TableCell>{entry.totalPredictions}</TableCell>
                          <TableCell>{entry.accuracyPercentage ? parseFloat(entry.accuracyPercentage.toString()).toFixed(1) : '0.0'}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No current month data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}