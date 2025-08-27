import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, Lock, Unlock, Info } from 'lucide-react';
import AppHeader from '@/components/app-header';
import { EnhancedPredictionForm } from '@/components/enhanced-prediction-form';
import { EnhancedSlotDisplay } from '@/components/enhanced-slot-display';

export default function PredictionPage() {
  const [, params] = useRoute('/predict/:assetSymbol');
  const assetSymbol = params?.assetSymbol;
  const [selectedDuration, setSelectedDuration] = useState<string>('1h');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  const { data: asset, isLoading: isLoadingAsset } = useQuery({
    queryKey: ['asset', assetSymbol],
    queryFn: async () => {
      const response = await fetch(`/api/assets/${assetSymbol}`);
      if (!response.ok) throw new Error('Failed to fetch asset');
      return response.json();
    },
    enabled: !!assetSymbol,
  });

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot);
  };

  const getDurationOptions = () => [
    { value: '1h', label: '1 Hour', description: '4 × 15 min intervals' },
    { value: '3h', label: '3 Hours', description: '6 × 30 min intervals' },
    { value: '6h', label: '6 Hours', description: '6 × 1 hour intervals' },
    { value: '24h', label: '1 Day', description: '8 × 3 hour intervals' },
    { value: '48h', label: '2 Days', description: '8 × 6 hour intervals' },
    { value: '1w', label: '1 Week', description: '7 × 1 day intervals' },
    { value: '1m', label: '1 Month', description: '4 × 1 week intervals' },
    { value: '3m', label: '3 Months', description: '3 × 1 month intervals' },
    { value: '6m', label: '6 Months', description: '6 × 1 month intervals' },
    { value: '1y', label: '1 Year', description: '4 × 3 month intervals' },
  ];

  if (isLoadingAsset) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container max-w-6xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container max-w-6xl mx-auto px-4 py-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-center">Asset not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        {/* Asset Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Make Prediction: {asset.name}
              </h1>
              <p className="text-muted-foreground">
                Predict the price movement for {asset.symbol} using our enhanced slot system
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{asset.type}</Badge>
              <Badge variant={asset.isActive ? "default" : "secondary"}>
                {asset.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Duration Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Select Duration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {getDurationOptions().map((duration) => (
                <Button
                  key={duration.value}
                  variant={selectedDuration === duration.value ? "default" : "outline"}
                  onClick={() => setSelectedDuration(duration.value)}
                  className="flex flex-col h-auto py-3 px-2 text-xs"
                >
                  <span className="font-medium">{duration.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {duration.description}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="slots" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="slots">Available Slots</TabsTrigger>
            <TabsTrigger value="predict">Make Prediction</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-6">
            {/* Slot Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>How Slots Work</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong>Fixed CEST Boundaries:</strong> All slots are anchored to Europe/Rome timezone
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong>Live Countdowns:</strong> See exactly when each slot starts and ends
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong>Lock Times:</strong> Submissions close 5 minutes before slot start
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong>Partitioned Intervals:</strong> Each slot is divided into equal sub-intervals with specific points
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Slot Display */}
            <EnhancedSlotDisplay
              duration={selectedDuration}
              onSlotSelect={handleSlotSelect}
              selectedSlot={selectedSlot}
            />
          </TabsContent>

          <TabsContent value="predict" className="space-y-6">
            {/* Prediction Form */}
            <EnhancedPredictionForm
              assetSymbol={asset.symbol}
              onSuccess={() => {
                // Refresh data and switch to slots tab
                setSelectedSlot(null);
                // You could also invalidate queries here instead of reload
                window.location.reload();
              }}
            />

            {/* Selected Slot Info */}
            {selectedSlot && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Selected Slot: {selectedSlot.slotNumber}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Start Time:</span>
                      <div className="text-muted-foreground">
                        {new Date(selectedSlot.start).toLocaleString('en-GB', { 
                          timeZone: 'Europe/Berlin',
                          dateStyle: 'full',
                          timeStyle: 'long'
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">End Time:</span>
                      <div className="text-muted-foreground">
                        {new Date(selectedSlot.end).toLocaleString('en-GB', { 
                          timeZone: 'Europe/Berlin',
                          dateStyle: 'full',
                          timeStyle: 'long'
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Points Available:</span>
                      <div className="text-primary font-bold">{selectedSlot.pointsIfCorrect}</div>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <div className="flex items-center space-x-2">
                        {selectedSlot.timeRemaining <= 300000 ? (
                          <>
                            <Lock className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Locked</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Open</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
