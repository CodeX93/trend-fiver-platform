import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, Calendar } from 'lucide-react';

interface CountdownData {
  isExpired: boolean;
  message: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  endDate: string;
}

export function MonthCountdown() {
  const [countdown, setCountdown] = useState<CountdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountdown = async () => {
    try {
      const response = await fetch('/api/leaderboard/countdown');
      if (!response.ok) {
        throw new Error(`Failed to fetch countdown: ${response.status} ${response.statusText}`);
      }
      
      // Check if response has content
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      // Try to parse JSON
      let data: CountdownData;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
      
      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: expected object');
      }
      
      if (typeof data.isExpired !== 'boolean' || typeof data.message !== 'string') {
        throw new Error('Invalid response format: missing required fields');
      }
      
      setCountdown(data);
    } catch (err) {
      console.error('Error fetching countdown:', err);
      setError(err instanceof Error ? err.message : 'Failed to load countdown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountdown();
    
    // Update countdown every 30 seconds instead of every second
    const interval = setInterval(fetchCountdown, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (data: CountdownData) => {
    if (data.isExpired) {
      return "Month has ended";
    }
    
    const { days, hours, minutes, seconds } = data;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Month Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !countdown) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Month Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            {error || 'Countdown unavailable'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (countdown.isExpired) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Month Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Calendar className="h-4 w-4" />
            <span>{countdown.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Current Month Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="font-mono">{formatTimeRemaining(countdown)}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Ends: {new Date(countdown.endDate).toLocaleDateString('en-US', {
            timeZone: 'Europe/Rome',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </div>
      </CardContent>
    </Card>
  );
} 