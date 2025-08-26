import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/use-auth';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from './ui/button';
import { BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCw } from 'lucide-react';

interface SentimentData {
  slotNumber: number;
  slotLabel: string;
  up: number;
  down: number;
  total: number;
}

interface SentimentResponse {
  asset: string;
  duration: string;
  slots: SentimentData[];
}

interface SentimentChartProps {
  assetSymbol: string;
  duration: string;
  className?: string;
  onDurationChange?: (duration: string) => void;
}

const SentimentChart: React.FC<SentimentChartProps> = ({ 
  assetSymbol, 
  duration, 
  className = '', 
  onDurationChange 
}) => {
  const { user } = useAuth();
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sentiment/${encodeURIComponent(assetSymbol)}?duration=${duration}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in and verify your email to view sentiment data');
        } else if (response.status === 404) {
          setError('Asset not found');
        } else {
          setError(`Failed to fetch sentiment data: ${response.status} ${response.statusText}`);
        }
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON:', contentType);
        setError('Server returned invalid response format');
        return;
      }

      const data: SentimentResponse = await response.json();
      
      // Validate the response data
      if (!data || !Array.isArray(data.slots)) {
        console.error('Invalid response data:', data);
        setError('Invalid response data from server');
        return;
      }

      setSentimentData(data.slots);
    } catch (err) {
      console.error('Error fetching sentiment data:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error - please check your connection');
      } else {
        setError('Failed to fetch sentiment data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.emailVerified) {
      fetchSentimentData();
    }
  }, [assetSymbol, duration, user, token]);

  // Refresh data every 5 minutes
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const interval = setInterval(fetchSentimentData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, token]);

  // Calculate total sentiment across all slots
  const totalUp = sentimentData.reduce((sum, slot) => sum + slot.up, 0);
  const totalDown = sentimentData.reduce((sum, slot) => sum + slot.down, 0);
  const totalPredictions = totalUp + totalDown;

  // Calculate percentages
  const upPercentage = totalPredictions > 0 ? Math.round((totalUp / totalPredictions) * 100) : 0;
  const downPercentage = totalPredictions > 0 ? Math.round((totalDown / totalPredictions) * 100) : 0;

  // Prepare data for donut chart
  const chartData = [
    { name: 'Up', value: totalUp, percentage: upPercentage, color: '#10b981' },
    { name: 'Down', value: totalDown, percentage: downPercentage, color: '#ef4444' }
  ].filter(item => item.value > 0); // Only show segments with data

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">
            {data.value} users ({data.payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Market Sentiment
            <Badge variant="secondary">Login Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Please log in to view sentiment data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user.emailVerified) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Market Sentiment
            <Badge variant="secondary">Verification Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Please verify your email to view sentiment data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Market Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading sentiment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Market Sentiment
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchSentimentData}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalPredictions === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Market Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            </div>
            <p className="font-medium">No sentiment data available</p>
            <p className="text-sm mt-1">No predictions have been made for {assetSymbol} in the {duration} timeframe yet.</p>
            <p className="text-xs mt-2 text-muted-foreground">Try selecting a different duration or check back later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header with controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Market Sentiment - {assetSymbol}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>Duration:</span>
                {onDurationChange ? (
                  <Select value={duration} onValueChange={onDurationChange}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1h', '3h', '6h', '24h', '48h', '1w', '1m', '3m', '6m', '1y'].map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{duration}</Badge>
                )}
                <Badge variant={user?.emailVerified ? "default" : "secondary"} className="ml-2">
                  {user?.emailVerified ? "Live" : "Offline"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSentimentData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Side-by-side cards with progress bars */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Up Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Up</span>
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {upPercentage}%
                </div>
                <div className="text-sm text-green-600 mb-3">
                  ({totalUp} users)
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Down Card */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">Down</span>
                </div>
                <div className="text-2xl font-bold text-red-700 mb-1">
                  {downPercentage}%
                </div>
                <div className="text-sm text-red-600 mb-3">
                  ({totalDown} users)
                </div>
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${upPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-gray-800">
                  {upPercentage}%
                </div>
                <div className="text-sm font-semibold text-green-600">
                  UP
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Up {upPercentage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">Down {downPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {totalUp}
              </div>
              <div className="text-xs text-gray-600">Up Predictions</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {totalDown}
              </div>
              <div className="text-xs text-gray-600">Down Predictions</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {totalPredictions}
              </div>
              <div className="text-xs text-gray-600">Total Predictions</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2">
            Data refreshes every 5 minutes • Showing {sentimentData.length} time slots
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentChart; 