import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { queryClient } from "@/lib/queryClient";
import AppHeader from "@/components/app-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, User2, CoinsIcon, CirclePlus, Edit, Trash2, Check, X, Filter, RefreshCcw, Search, BarChart3, TrendingUp, AlertTriangle, Settings, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Asset, User, Prediction } from "@shared/schema";

interface PredictionWithDetails extends Prediction {
  username?: string;
  email?: string;
  assetName?: string;
  assetSymbol?: string;
  asset?: {
    name: string;
    symbol: string;
    type: string;
  };
}

interface AdminStats {
  totalUsers: number;
  totalPredictions: number;
  totalAssets: number;
  topAssets: Array<{ symbol: string; predictionCount: number }>;
}

interface UserWithProfile extends User {
  profile?: {
    monthlyScore: number;
    totalScore: number;
    totalPredictions: number;
    correctPredictions: number;
    lastMonthRank?: number;
    followersCount: number;
    followingCount: number;
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assetFilter, setAssetFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string | null>(null);
  const [userHistoryDialogOpen, setUserHistoryDialogOpen] = useState(false);
  const { data: slotConfigsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery<any[]>({
    queryKey: ["/api/admin/slots"],
    enabled: activeTab === 'slots',
  });
  const updateSlotMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/slots/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => refetchSlots()
  });



  // If user is not admin, redirect to home
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Fetch admin dashboard stats
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/stats", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch admin stats`);
      }
      
      return response.json();
    },
  });

  // Fetch all assets
  const { data: assets, isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["/api/admin/assets"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/assets", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch assets`);
      }
      
      return response.json();
    },
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch users`);
      }
      
      const data = await response.json();
      console.log('Admin users API response:', data);
      console.log('Sample user data:', data.slice(0, 2));
      
      return data;
    },
  });

  // Fetch all predictions
  const { data: predictions, isLoading: predictionsLoading } = useQuery<PredictionWithDetails[]>({
    queryKey: ["/api/admin/predictions"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/predictions", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch predictions`);
      }
      
      const data = await response.json();
      console.log('Admin predictions API response:', data);
      
      // The API returns { predictions: [...], pagination: {...} }
      // But we need just the predictions array
      if (data && typeof data === 'object' && Array.isArray(data.predictions)) {
        return data.predictions;
      }
      
      // Fallback: if it's already an array, return as-is
      if (Array.isArray(data)) {
        return data;
      }
      
      console.warn('Unexpected predictions data format:', data);
      return [];
    },
  });

  // Fetch user predictions for history
  const { data: userPredictions, isLoading: userPredictionsLoading } = useQuery<PredictionWithDetails[]>({
    queryKey: ["/api/admin/users", selectedUserForHistory, "predictions"],
    enabled: !!selectedUserForHistory,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch(`/api/admin/users/${selectedUserForHistory}/predictions`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch user predictions`);
      }
      
      return response.json();
    },
  });

  // Add asset mutation
  const addAssetMutation = useMutation({
    mutationFn: async (data: { name: string; symbol: string; type: string; apiSource: string }) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to add asset`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assets"] });
      toast({
        title: "Asset added successfully",
        description: "The new asset has been added to the platform.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to add asset",
        description: "There was an error adding the asset. Please try again.",
      });
    }
  });

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      console.log('Updating user:', userId, 'with updates:', updates);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update user`);
      }
      
      const result = await response.json();
      console.log('Update successful:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated successfully",
        description: "The user's status has been updated.",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        variant: "destructive",
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "There was an error updating the user. Please try again.",
      });
    }
  });

  // Trigger price update mutation
  const triggerPriceUpdateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/prices/update", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to trigger price update`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Price Update Successful",
        description: data.success ? `Updated ${data.assetsUpdated || 'all'} assets in ${data.duration || 'successfully'}` : "Asset prices updated",
      });
      // Refresh asset data
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to trigger price update",
        description: "There was an error triggering the price update.",
      });
    }
  });

  // Badge backfill mutation
  const badgeBackfillMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/admin/badges/backfill", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to trigger badge backfill`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Badge Backfill Successful",
        description: `Awarded ${data.totalBadgesAwarded} badges to ${data.usersWithNewBadges} users`,
      });
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to trigger badge backfill",
        description: "There was an error triggering the badge backfill.",
      });
    }
  });

  // Filter assets based on type and search query
  const filteredAssets = (assets || []).filter(asset => {
    if (!asset || typeof asset !== 'object') return false;
    const matchesType = assetFilter === "all" || (asset.type && asset.type === assetFilter);
    const matchesSearch = searchQuery === "" || 
      (asset.name && typeof asset.name === 'string' && asset.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.symbol && typeof asset.symbol === 'string' && asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Filter users based on status and search query
  const filteredUsers = (users || []).filter(user => {
    if (!user || typeof user !== 'object') return false;
    const matchesStatus = userFilter === "all" || 
      (userFilter === "verified" && user.emailVerified) ||
      (userFilter === "unverified" && !user.emailVerified) ||
      (userFilter === "admin" && user.role === "admin");
    const matchesSearch = searchQuery === "" || 
      (user.username && typeof user.username === 'string' && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const newAsset = {
      name: formData.get("name") as string,
      symbol: formData.get("symbol") as string,
      type: formData.get("type") as string,
      apiSource: formData.get("apiSource") as string,
    };
    
    addAssetMutation.mutate(newAsset);
    form.reset();
  };

  const handleUpdateUserStatus = (userId: string, emailVerified: boolean) => {
    updateUserStatusMutation.mutate({ userId, updates: { emailVerified } });
  };

  const handleToggleUserActive = (userId: string, isActive: boolean) => {
    updateUserStatusMutation.mutate({ userId, updates: { isActive } });
  };

  const handleViewUserHistory = (userId: string) => {
    setSelectedUserForHistory(userId);
    setUserHistoryDialogOpen(true);
  };

  const handleBadgeBackfill = () => {
    badgeBackfillMutation.mutate();
  };



  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/assets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
    toast({
      title: "Data refreshed",
      description: "The latest data has been loaded.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
                <Shield className="h-8 w-8 mr-2 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage users, assets, and monitor system performance
              </p>
            </div>
            <Button variant="outline" onClick={refreshData} className="flex items-center">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="dashboard" className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard v2
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center">
                  <User2 className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center">
                  <CoinsIcon className="h-4 w-4 mr-2" />
                  Assets
                </TabsTrigger>
                <TabsTrigger value="predictions" className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Predictions
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  System
                </TabsTrigger>
                <TabsTrigger value="slots" className="flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Slots
                </TabsTrigger>
              </TabsList>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <User2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? <Skeleton className="h-8 w-16" /> : adminStats?.totalUsers || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? <Skeleton className="h-8 w-16" /> : adminStats?.totalPredictions || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Price Update</CardTitle>
                      <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Manual trigger</div>
                        <Button 
                          size="sm" 
                          onClick={() => triggerPriceUpdateMutation.mutate()}
                          disabled={triggerPriceUpdateMutation.isPending}
                          className="w-full"
                        >
                          {triggerPriceUpdateMutation.isPending ? (
                            <>
                              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update Prices'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Badge Backfill</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Award badges to existing users</div>
                        <Button 
                          size="sm" 
                          onClick={() => handleBadgeBackfill()}
                          disabled={badgeBackfillMutation.isPending}
                          className="w-full"
                        >
                          {badgeBackfillMutation.isPending ? (
                            <>
                              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Backfill Badges'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                      <CoinsIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? <Skeleton className="h-8 w-16" /> : adminStats?.totalAssets || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Status</CardTitle>
                      <Check className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">Online</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Assets */}
                {adminStats?.topAssets && adminStats.topAssets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Assets by Predictions</CardTitle>
                      <CardDescription>Most predicted assets this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(Array.isArray(adminStats.topAssets) ? adminStats.topAssets : []).map((asset, index) => (
                          <div key={asset.symbol} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm font-medium mr-2">#{index + 1}</span>
                              <span className="font-medium">{asset.symbol}</span>
                            </div>
                            <Badge variant="outline">{asset.predictionCount} predictions</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Slots Tab */}
              <TabsContent value="slots">
                <Card>
                  <CardHeader>
                    <CardTitle>Slot Configurations</CardTitle>
                    <CardDescription>Edit slot start/end labels and points</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {slotsLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Duration</TableHead>
                            <TableHead>Slot</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>End</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Penalty</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(Array.isArray(slotConfigsData) ? slotConfigsData : []).map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.duration}</TableCell>
                              <TableCell>{row.slotNumber}</TableCell>
                              <TableCell>
                                <Input defaultValue={row.startTime} onBlur={(e) => updateSlotMutation.mutate({ id: row.id, startTime: e.target.value })} />
                              </TableCell>
                              <TableCell>
                                <Input defaultValue={row.endTime} onBlur={(e) => updateSlotMutation.mutate({ id: row.id, endTime: e.target.value })} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" defaultValue={row.pointsIfCorrect} onBlur={(e) => updateSlotMutation.mutate({ id: row.id, pointsIfCorrect: parseInt(e.target.value, 10) })} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" defaultValue={row.penaltyIfWrong} onBlur={(e) => updateSlotMutation.mutate({ id: row.id, penaltyIfWrong: parseInt(e.target.value, 10) })} />
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => refetchSlots()}>Refresh</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>
                          Manage users and their account status
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter users" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="verified">Verified Only</SelectItem>
                            <SelectItem value="unverified">Unverified Only</SelectItem>
                            <SelectItem value="admin">Admins Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 relative">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input 
                          placeholder="Search users..." 
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {usersLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Rank</TableHead>
                              <TableHead>Predictions</TableHead>
                              <TableHead>Followers</TableHead>
                              <TableHead>Following</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                                  No users found matching your filters.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredUsers?.filter(user => user && typeof user === 'object').map((user) => (
                                <TableRow key={user.id || Math.random()}>
                                  <TableCell className="font-medium">{user.username || 'N/A'}</TableCell>
                                  <TableCell>{user.email || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge variant={user.role === "admin" ? "default" : "outline"}>
                                      {user.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      {user.emailVerified ? (
                                        <Badge className="bg-green-500 text-xs">Verified</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Unverified</Badge>
                                      )}
                                      {(user.isActive ?? true) ? (
                                        <Badge className="bg-blue-500 text-xs">Active</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{user.profile?.totalScore || 0}</TableCell>
                                  <TableCell>{user.profile?.lastMonthRank ? `#${user.profile.lastMonthRank}` : 'N/A'}</TableCell>
                                  <TableCell>{user.profile?.totalPredictions || 0}</TableCell>
                                  <TableCell>{user.profile?.followersCount || 0}</TableCell>
                                  <TableCell>{user.profile?.followingCount || 0}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant={user.emailVerified ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => handleUpdateUserStatus(user.id, !user.emailVerified)}
                                        disabled={updateUserStatusMutation.isPending}
                                      >
                                        {user.emailVerified ? (
                                          <>
                                            <X className="h-4 w-4 mr-1" />
                                            Unverify
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Verify
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant={(user.isActive ?? true) ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => handleToggleUserActive(user.id, !(user.isActive ?? true))}
                                        disabled={updateUserStatusMutation.isPending}
                                      >
                                        {(user.isActive ?? true) ? (
                                          <>
                                            <X className="h-4 w-4 mr-1" />
                                            Deactivate
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Activate
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewUserHistory(user.id)}
                                      >
                                        <BarChart3 className="h-4 w-4 mr-1" />
                                        History
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredUsers?.length || 0} of {users?.length || 0} users
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Assets Tab */}
              <TabsContent value="assets">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Asset Management</CardTitle>
                        <CardDescription>
                          Manage the assets available on the platform
                        </CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="flex items-center">
                            <CirclePlus className="h-4 w-4 mr-2" />
                            Add Asset
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Asset</DialogTitle>
                            <DialogDescription>
                              Enter the details for the new asset to add to the platform.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddAsset}>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" name="name" className="col-span-3" required />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="symbol" className="text-right">Symbol</Label>
                                <Input id="symbol" name="symbol" className="col-span-3" required />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Type</Label>
                                <Select name="type" defaultValue="crypto">
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                                    <SelectItem value="stock">Stock</SelectItem>
                                    <SelectItem value="forex">Forex</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="apiSource" className="text-right">API Source</Label>
                                <Select name="apiSource" defaultValue="coingecko">
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select API source" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="coingecko">CoinGecko</SelectItem>
                                    <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                                    <SelectItem value="exchangerate">ExchangeRate.host</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button type="submit" disabled={addAssetMutation.isPending}>
                                {addAssetMutation.isPending ? "Adding..." : "Add Asset"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={assetFilter} onValueChange={setAssetFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="crypto">Cryptocurrencies</SelectItem>
                            <SelectItem value="stock">Stocks</SelectItem>
                            <SelectItem value="forex">Forex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 relative">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input 
                          placeholder="Search assets..." 
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {assetsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>API Source</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAssets?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                  No assets found matching your filters.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredAssets?.filter(asset => asset && typeof asset === 'object').map((asset) => (
                                <TableRow key={asset.id || Math.random()}>
                                  <TableCell className="font-medium">{asset.name || 'N/A'}</TableCell>
                                  <TableCell>{asset.symbol || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {asset.type || 'unknown'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{asset.apiSource || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge variant={asset.isActive ? "default" : "secondary"}>
                                      {asset.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredAssets?.length || 0} of {assets?.length || 0} assets
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Predictions Tab */}
              <TabsContent value="predictions">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Prediction Management</CardTitle>
                        <CardDescription>
                          Monitor and manage user predictions
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {predictionsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Asset</TableHead>
                              <TableHead>Direction</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>Points</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(Array.isArray(predictions) ? predictions : []).slice(0, 20).map((prediction) => (
                              <TableRow key={prediction.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{prediction.username || 'No username'}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ID: {prediction.userId.substring(0, 8)}...
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{prediction.assetSymbol || prediction.assetName || prediction.assetId}</TableCell>
                                <TableCell>
                                  <Badge variant={prediction.direction === "up" ? "default" : "secondary"}>
                                    {prediction.direction}
                                  </Badge>
                                </TableCell>
                                <TableCell>{prediction.duration}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    prediction.status === "active" ? "default" :
                                    prediction.status === "evaluated" ? "secondary" : "outline"
                                  }>
                                    {prediction.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {prediction.result && (
                                    <Badge variant={
                                      prediction.result === "correct" ? "default" :
                                      prediction.result === "incorrect" ? "destructive" : "outline"
                                    }>
                                      {prediction.result}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>{prediction.pointsAwarded || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      Showing latest 20 predictions of {predictions?.length || 0} total
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Database className="h-5 w-5 mr-2" />
                        System Health
                      </CardTitle>
                      <CardDescription>
                        Monitor system performance and status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Database Status</span>
                          <Badge className="bg-green-500">Connected</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">API Services</span>
                          <Badge className="bg-green-500">Online</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Background Jobs</span>
                          <Badge className="bg-green-500">Running</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        System Actions
                      </CardTitle>
                      <CardDescription>
                        Perform system maintenance tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button 
                          onClick={() => triggerPriceUpdateMutation.mutate()}
                          disabled={triggerPriceUpdateMutation.isPending}
                          className="w-full"
                        >
                          {triggerPriceUpdateMutation.isPending ? "Updating..." : "Trigger Price Update"}
                        </Button>
                        <Button variant="outline" className="w-full">
                          Evaluate Expired Predictions
                        </Button>
                                                 <Button variant="outline" className="w-full">
                           Process Monthly Leaderboard
                         </Button>
                         
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* User History Dialog */}
      <Dialog open={userHistoryDialogOpen} onOpenChange={setUserHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Prediction History</DialogTitle>
            <DialogDescription>
              View detailed prediction history for the selected user
            </DialogDescription>
          </DialogHeader>
          
          {userPredictionsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : userPredictions && userPredictions.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {userPredictions.length} predictions
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(userPredictions) ? userPredictions : []).map((prediction) => (
                      <TableRow key={prediction.id}>
                        <TableCell className="font-medium">{prediction.asset?.symbol || prediction.asset?.name || prediction.assetId}</TableCell>
                        <TableCell>
                          <Badge variant={prediction.direction === 'up' ? 'default' : 'secondary'}>
                            {prediction.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{prediction.duration}</TableCell>
                        <TableCell>{prediction.slotNumber}</TableCell>
                        <TableCell>
                          <Badge variant={
                            prediction.status === "active" ? "default" :
                            prediction.status === "evaluated" ? "secondary" : "outline"
                          }>
                            {prediction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {prediction.result && (
                            <Badge variant={
                              prediction.result === "correct" ? "default" :
                              prediction.result === "incorrect" ? "destructive" : "outline"
                            }>
                              {prediction.result}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{prediction.pointsAwarded || 0}</TableCell>
                        <TableCell>
                          {prediction.createdAt ? new Date(prediction.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No predictions found for this user</p>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}