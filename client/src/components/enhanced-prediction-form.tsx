import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Clock, Lock, TrendingUp, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { useLanguage } from '../hooks/use-language';
import { EnhancedSlotDisplay } from './enhanced-slot-display';

const predictionSchema = z.object({
  assetSymbol: z.string().min(1, 'Asset is required'),
  duration: z.string().min(1, 'Duration is required'),
  direction: z.enum(['up', 'down'], { required_error: 'Direction is required' }),
  amount: z.number().min(0.01, 'Amount must be at least 0.01'),
});

type PredictionFormData = z.infer<typeof predictionSchema>;

interface EnhancedPredictionFormProps {
  assetSymbol?: string;
  onSuccess?: () => void;
}

export function EnhancedPredictionForm({ assetSymbol, onSuccess }: EnhancedPredictionFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('1h');

  const form = useForm<PredictionFormData>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      assetSymbol: assetSymbol || '',
      duration: '1h',
      direction: 'up',
      amount: 1.00,
    },
  });
  
  console.log('Form initialized with:', {
    assetSymbol,
    formValues: form.getValues(),
    selectedSlot,
    selectedDuration
  });

  const createPredictionMutation = useMutation({
    mutationFn: async (data: PredictionFormData & { slotNumber: number }) => {
      console.log('Creating prediction with data:', data);
      console.log('Selected slot for mutation:', selectedSlot);
      
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          ...data,
          slotNumber: selectedSlot.slotNumber ?? 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Prediction creation failed:', error);
        throw new Error(error.error || 'Failed to create prediction');
      }
      
      const result = await response.json();
      console.log('Prediction created successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Prediction creation succeeded');
      toast({
        title: 'Success!',
        description: 'Your prediction has been submitted successfully.',
      });
      
      // Refresh predictions and slots
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['slots', selectedDuration] });
      
      // Reset form and selection
      form.reset();
      setSelectedSlot(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Prediction creation failed with error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit prediction',
        variant: 'destructive',
      });
    },
  });

    const onSubmit = (data: PredictionFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Selected slot:', selectedSlot);
    
    if (!selectedSlot || !selectedSlot.slotNumber) {
      toast({
        title: 'No Slot Selected',
        description: 'Please select a valid slot before submitting your prediction.',
        variant: 'destructive',
      });
      return;
    }

    // Check if slot is locked
    console.log('Checking if slot is locked:', {
      timeRemaining: selectedSlot.timeRemaining,
      isLocked: selectedSlot.timeRemaining <= 300000
    });
    
    if (selectedSlot.timeRemaining <= 300000) { // 5 minutes before start
      toast({
        title: 'Slot Locked',
        description: 'This slot is locked. Please select an open slot.',
        variant: 'destructive',
      });
      return;
    }

    const mutationData = {
      ...data,
      slotNumber: selectedSlot.slotNumber,
    };
    console.log('Calling mutation with data:', mutationData);
    createPredictionMutation.mutate(mutationData);
  };

  const handleDurationChange = (duration: string) => {
    setSelectedDuration(duration);
    setSelectedSlot(null); // Reset slot selection when duration changes
    form.setValue('duration', duration);
  };

  const handleSlotSelect = (slot: any) => {
    console.log('Slot selected in form:', slot);
    setSelectedSlot(slot);
  };

  const getDurationOptions = () => [
    { value: '1h', label: '1 Hour' },
    { value: '3h', label: '3 Hours' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '1 Day' },
    { value: '48h', label: '2 Days' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
  ];

  const getAssetOptions = () => [
    { value: 'bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'cardano', label: 'Cardano (ADA)' },
    { value: 'solana', label: 'Solana (SOL)' },
    { value: 'polkadot', label: 'Polkadot (DOT)' },
    { value: 'AAPL', label: 'Apple Inc. (AAPL)' },
    { value: 'MSFT', label: 'Microsoft (MSFT)' },
    { value: 'GOOGL', label: 'Alphabet (GOOGL)' },
    { value: 'AMZN', label: 'Amazon (AMZN)' },
    { value: 'TSLA', label: 'Tesla (TSLA)' },
    { value: 'EUR/USD', label: 'EUR/USD' },
    { value: 'GBP/USD', label: 'GBP/USD' },
    { value: 'USD/JPY', label: 'USD/JPY' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Prediction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Make Prediction</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Asset Selection */}
            <div className="space-y-2">
              <Label htmlFor="assetSymbol">Asset</Label>
              <Select
                value={form.watch('assetSymbol')}
                onValueChange={(value) => form.setValue('assetSymbol', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {getAssetOptions().map((asset) => (
                    <SelectItem key={asset.value} value={asset.value}>
                      {asset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.assetSymbol && (
                <p className="text-sm text-red-600">{form.formState.errors.assetSymbol.message}</p>
              )}
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={selectedDuration}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {getDurationOptions().map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Direction Selection */}
            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={form.watch('direction') === 'up' ? 'default' : 'outline'}
                  onClick={() => form.setValue('direction', 'up')}
                  className="flex-1"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Up
                </Button>
                <Button
                  type="button"
                  variant={form.watch('direction') === 'down' ? 'default' : 'outline'}
                  onClick={() => form.setValue('direction', 'down')}
                  className="flex-1"
                >
                  <TrendingUp className="h-4 w-4 mr-2 rotate-180" />
                  Down
                </Button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('amount', { valueAsNumber: true })}
                placeholder="Enter amount"
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Selected Slot Info */}
            {(() => {
              console.log('Rendering selected slot info:', selectedSlot);
              return selectedSlot && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Selected Slot</span>
                    <Badge variant={(selectedSlot.isActive ?? false) ? "default" : "secondary"}>
                      Slot {selectedSlot.slotNumber ?? 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Time: {(() => {
                      try {
                        const startDate = new Date(selectedSlot.start);
                        const endDate = new Date(selectedSlot.end);
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                          return 'Invalid Date';
                        }
                        return `${startDate.toLocaleString('en-GB', { timeZone: 'Europe/Berlin' })} - ${endDate.toLocaleString('en-GB', { timeZone: 'Europe/Berlin' })}`;
                      } catch (error) {
                        return 'Invalid Date';
                      }
                    })()}</div>
                    <div>Points: {selectedSlot.pointsIfCorrect || 0}</div>
                    <div>Status: {!selectedSlot.timeRemaining || selectedSlot.timeRemaining <= 300000 ? 'Locked' : 'Open'}</div>
                  </div>
                </CardContent>
              </Card>
            );
            })()}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!selectedSlot || createPredictionMutation.isPending}
            >
              {createPredictionMutation.isPending ? (
                'Submitting...'
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Submit Prediction
                </>
              )}
            </Button>

            {/* Warning if no slot selected */}
            {!selectedSlot && (
              <div className="flex items-center space-x-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Please select a slot below before submitting</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Slot Selection */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Select Slot</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSlotDisplay
              duration={selectedDuration}
              onSlotSelect={handleSlotSelect}
              selectedSlot={selectedSlot}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
