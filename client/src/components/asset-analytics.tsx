import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CalendarDays, TrendingUp, TrendingDown, Users, BarChart2, PieChart as PieChartIcon } from "lucide-react";

// Types for analytics data
type SentimentDistribution = {
  name: string;
  value: number;
  color: string;
};

type SentimentHistory = {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
};

type PredictionAccuracy = {
  range: string;
  count: number;
  isActive: boolean;
};

interface AssetAnalyticsProps {
  assetId: number;
  assetSymbol: string;
}

export default function AssetAnalytics({ assetId, assetSymbol }: AssetAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("month");
  
  // This will be replaced with real API calls later
  const { data: sentimentDistribution, isLoading: isLoadingSentiment } = useQuery<SentimentDistribution[]>({
    queryKey: ["asset-sentiment-distribution", assetId, timeRange],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Return mock data for now
      return [
        { name: "Positive", value: 65, color: "#22c55e" },
        { name: "Neutral", value: 20, color: "#64748b" },
        { name: "Negative", value: 15, color: "#ef4444" },
      ];
    },
  });
  
  const { data: sentimentHistory, isLoading: isLoadingHistory } = useQuery<SentimentHistory[]>({
    queryKey: ["asset-sentiment-history", assetId, timeRange],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data for sentiment history
      const data = [];
      
      // Generate data based on selected time range
      const daysToGenerate = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
      const today = new Date();
      
      for (let i = daysToGenerate - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate random but somewhat consistent data
        const seed = (date.getDate() + assetId) % 100;
        const total = 100;
        const positive = 40 + (seed % 30);
        const negative = 10 + (seed % 20);
        const neutral = total - positive - negative;
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          positive,
          negative,
          neutral,
        });
      }
      
      return data;
    },
  });
  
  const { data: predictionAccuracy, isLoading: isLoadingAccuracy } = useQuery<PredictionAccuracy[]>({
    queryKey: ["asset-prediction-accuracy", assetId, timeRange],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Return mock data for prediction accuracy
      return [
        { range: "<1%", count: 30, isActive: true },
        { range: "1-3%", count: 45, isActive: true },
        { range: "3-5%", count: 25, isActive: false },
        { range: "5-10%", count: 15, isActive: false },
        { range: ">10%", count: 5, isActive: false },
      ];
    },
  });

  return (
    <Card className="flex-grow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <BarChart2 className="h-5 w-5 mr-2 text-primary" />
          Analytics for {assetSymbol}
        </CardTitle>
        <CardDescription>
          Visualize sentiment trends and prediction accuracy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sentiment" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="sentiment" className="flex items-center">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Sentiment
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Accuracy
            </TabsTrigger>
          </TabsList>
          
          <div className="flex justify-end mb-4">
            <div className="flex items-center space-x-1 rounded-md border bg-muted p-1 text-muted-foreground">
              <button
                onClick={() => setTimeRange("week")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  timeRange === "week" ? "bg-background text-foreground shadow-sm" : ""
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange("month")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  timeRange === "month" ? "bg-background text-foreground shadow-sm" : ""
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange("quarter")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  timeRange === "quarter" ? "bg-background text-foreground shadow-sm" : ""
                }`}
              >
                Quarter
              </button>
            </div>
          </div>
          
          <TabsContent value="sentiment" className="space-y-4">
            {isLoadingSentiment ? (
              <div className="h-80 flex items-center justify-center">
                <Skeleton className="h-64 w-64 rounded-full" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mt-4">
              <p className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2" />
                {timeRange === "week" ? "Past 7 days" : timeRange === "month" ? "Past 30 days" : "Past 90 days"} sentiment distribution
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {isLoadingHistory ? (
              <div className="h-80 w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="neutral" stroke="#64748b" strokeWidth={2} />
                    <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mt-4">
              <p className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Sentiment trend over time (values in percentage)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="accuracy" className="space-y-4">
            {isLoadingAccuracy ? (
              <div className="h-80 w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={predictionAccuracy || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Number of Predictions" fill="#3b82f6">
                      {predictionAccuracy?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isActive ? "#22c55e" : "#64748b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mt-4 space-y-2">
              <p className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Prediction accuracy by percentage range (green = accurate)
              </p>
              <p>
                Predictions are considered accurate when the actual market movement is within the predicted range.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}