import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { useAuth } from '../hooks/use-auth';
import { ChevronLeft, ChevronRight, Filter, TrendingUp, TrendingDown } from 'lucide-react';

interface Prediction {
  id: string;
  direction: 'up' | 'down';
  duration: string;
  slotNumber: number;
  slotStart: string;
  slotEnd: string;
  timestampCreated: string;
  timestampExpiration: string;
  status: 'active' | 'expired' | 'evaluated';
  result: 'pending' | 'correct' | 'incorrect';
  pointsAwarded: number | null;
  priceStart: number | null;
  priceEnd: number | null;
  evaluatedAt: string | null;
  assetSymbol: string;
  assetName: string;
  assetType: string;
}

interface PredictionHistoryResponse {
  predictions: Prediction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PredictionHistoryProps {
  userId: string;
  isOwnProfile: boolean;
  className?: string;
}

const PredictionHistory: React.FC<PredictionHistoryProps> = ({ 
  userId, 
  isOwnProfile, 
  className = '' 
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    result: '',
    duration: '',
    assetSymbol: '',
  });

  const { token } = useAuth();

  const fetchPredictions = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });

      const response = await fetch(`/api/users/${userId}/predictions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You can only view predictions for your own profile or users you follow');
        } else {
          setError('Failed to fetch predictions');
        }
        return;
      }

      const data: PredictionHistoryResponse = await response.json();
      setPredictions(data.predictions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [userId, token]);

  useEffect(() => {
    fetchPredictions(1); // Reset to first page when filters change
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page: number) => {
    fetchPredictions(page);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'evaluated':
        return <Badge variant="outline">Evaluated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'correct':
        return <Badge variant="default" className="bg-green-500">Correct</Badge>;
      case 'incorrect':
        return <Badge variant="destructive">Incorrect</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <Button 
              onClick={() => fetchPredictions()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Prediction History
          {!isOwnProfile && (
            <Badge variant="secondary">Following Required</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.result} onValueChange={(value) => handleFilterChange('result', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Results</SelectItem>
              <SelectItem value="correct">Correct</SelectItem>
              <SelectItem value="incorrect">Incorrect</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Durations</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="3h">3 Hours</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="48h">48 Hours</SelectItem>
              <SelectItem value="1w">1 Week</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Asset Symbol"
            value={filters.assetSymbol}
            onChange={(e) => handleFilterChange('assetSymbol', e.target.value)}
          />
        </div>

        {/* Predictions List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading predictions...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No predictions found
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDirectionIcon(prediction.direction)}
                    <span className="font-semibold">{prediction.assetSymbol}</span>
                    <span className="text-sm text-gray-500">({prediction.assetName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(prediction.status)}
                    {prediction.result !== 'pending' && getResultBadge(prediction.result)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-1 font-medium">{prediction.duration}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Slot:</span>
                    <span className="ml-1 font-medium">{prediction.slotNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-1 font-medium">{formatDate(prediction.timestampCreated)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Points:</span>
                    <span className={`ml-1 font-medium ${prediction.pointsAwarded && prediction.pointsAwarded > 0 ? 'text-green-600' : prediction.pointsAwarded && prediction.pointsAwarded < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {prediction.pointsAwarded || 0}
                    </span>
                  </div>
                </div>

                {prediction.status === 'evaluated' && (
                  <div className="mt-2 pt-2 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Price Start:</span>
                      <span className="ml-1 font-medium">${prediction.priceStart?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Price End:</span>
                      <span className="ml-1 font-medium">${prediction.priceEnd?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Evaluated:</span>
                      <span className="ml-1 font-medium">
                        {prediction.evaluatedAt ? formatDate(prediction.evaluatedAt) : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} predictions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionHistory; 