import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, Lock, Unlock, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../hooks/use-language';

interface Interval {
  intervalNumber: number;
  start: string;
  end: string;
  points: number;
  label: string;
}

interface Slot {
  slotNumber?: number;
  start: Date | string;
  end: Date | string;
  isActive?: boolean;
  timeRemaining?: number;
  pointsIfCorrect?: number;
  penaltyIfWrong?: number;
  intervals?: Interval[];
}

interface LockStatus {
  isLocked: boolean;
  timeUntilLock: number;
  timeUntilStart: number;
  timeUntilUnlock: number;
  lockStartTime: Date;
  slotStartTime: Date;
}

interface EnhancedSlotDisplayProps {
  duration: string;
  onSlotSelect?: (slot: Slot) => void;
  selectedSlot?: Slot | null;
}

export function EnhancedSlotDisplay({ duration, onSlotSelect, selectedSlot }: EnhancedSlotDisplayProps) {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { data: slots, isLoading, error } = useQuery({
    queryKey: ['slots', duration],
    queryFn: async () => {
      const response = await fetch(`/api/slots/${duration}`);
      if (!response.ok) throw new Error('Failed to fetch slots');
      const data = await response.json();
      console.log('Slots data received:', data);
      console.log('First slot structure:', data[0]);
      return data as Slot[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatTimeRemaining = (milliseconds: number): string => {
    try {
      console.log('formatTimeRemaining called with:', milliseconds, typeof milliseconds);
      
      if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
        console.warn('Invalid milliseconds value:', milliseconds);
        return 'Invalid Time';
      }
      
      if (milliseconds <= 0) return '00:00:00';
      
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      const result = days > 0 
        ? `${days}d ${hours % 24}h ${minutes % 60}m`
        : hours > 0 
        ? `${hours}h ${minutes % 60}m ${seconds % 60}s`
        : minutes > 0 
        ? `${minutes}m ${seconds % 60}s`
        : `${seconds}s`;
      
      console.log('formatTimeRemaining result:', result);
      return result;
    } catch (error) {
      console.error('Error in formatTimeRemaining:', error, milliseconds);
      return 'Error';
    }
  };

  const formatCESTTime = (date: Date | string): string => {
    try {
      console.log('formatCESTTime called with:', date, typeof date);
      
      if (!date) {
        console.warn('formatCESTTime: date is falsy:', date);
        return 'No Date';
      }
      
      const dateObj = date instanceof Date ? date : new Date(date);
      console.log('dateObj created:', dateObj, 'isValid:', !isNaN(dateObj.getTime()));
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('formatCESTTime: Invalid date object:', dateObj);
        return 'Invalid Date';
      }
      
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(dateObj);
      
      console.log('formatCESTTime result:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const getDurationLabel = (duration: string): string => {
    const labels: Record<string, string> = {
      '1h': '1 Hour',
      '3h': '3 Hours',
      '6h': '6 Hours',
      '24h': '1 Day',
      '48h': '2 Days',
      '1w': '1 Week',
      '1m': '1 Month',
      '3m': '3 Months',
      '6m': '6 Months',
      '1y': '1 Year'
    };
    return labels[duration] || duration;
  };

  const getDurationColor = (duration: string): string => {
    const colors: Record<string, string> = {
      '1h': 'bg-blue-100 text-blue-800',
      '3h': 'bg-green-100 text-green-800',
      '6h': 'bg-yellow-100 text-yellow-800',
      '24h': 'bg-purple-100 text-purple-800',
      '48h': 'bg-indigo-100 text-indigo-800',
      '1w': 'bg-pink-100 text-pink-800',
      '1m': 'bg-red-100 text-red-800',
      '3m': 'bg-orange-100 text-orange-800',
      '6m': 'bg-teal-100 text-teal-800',
      '1y': 'bg-gray-100 text-gray-800'
    };
    return colors[duration] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 text-center">
            Error loading slots: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No slots available for {duration}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Slots</h3>
        <Badge className={getDurationColor(duration)}>
          {getDurationLabel(duration)}
        </Badge>
      </div>

      {(() => {
        console.log('All slots before filtering:', slots);
        const validSlots = slots.filter(slot => {
          const isValid = slot.start && slot.end && slot.slotNumber !== undefined;
          if (!isValid) {
            console.warn('Invalid slot filtered out:', slot);
          }
          return isValid;
        });
        console.log('Valid slots after filtering:', validSlots);
        return validSlots.map((slot) => {
        const isSelected = selectedSlot?.slotNumber === slot.slotNumber;
        console.log('Slot selection check:', {
          slotNumber: slot.slotNumber,
          selectedSlotNumber: selectedSlot?.slotNumber,
          isSelected
        });
        const isLocked = !slot.timeRemaining || slot.timeRemaining <= 0 || (slot.timeRemaining <= 300000); // 5 minutes before start
        console.log('Slot lock status:', {
          slotNumber: slot.slotNumber,
          timeRemaining: slot.timeRemaining,
          isLocked
        });
        
        return (
          <Card 
            key={slot.slotNumber ?? 'unknown'} 
            className={`transition-all duration-200 ${
              isSelected 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:shadow-md'
            } ${isLocked ? 'opacity-75' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-base">
                    Slot {slot.slotNumber ?? 'Unknown'}
                  </CardTitle>
                  <Badge variant={(slot.isActive ?? false) ? "default" : "secondary"}>
                    {(slot.isActive ?? false) ? "Active" : "Upcoming"}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isLocked ? (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <Lock className="h-3 w-3" />
                      <span>Locked</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Unlock className="h-3 w-3" />
                      <span>Open</span>
                    </Badge>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    {slot.pointsIfCorrect || 0} pts
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Slot Time Window */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Time Window (CEST)</span>
                  </div>
                  <span className="text-muted-foreground">
                    {(() => {
                      console.log('Formatting start date:', slot.start, typeof slot.start);
                      console.log('Formatting end date:', slot.end, typeof slot.end);
                      return `${formatCESTTime(slot.start)} - ${formatCESTTime(slot.end)}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Live Countdown */}
              {slot.timeRemaining && slot.timeRemaining > 0 && (
                <div className="bg-primary/10 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {(slot.isActive ?? false) ? "Ends in:" : "Starts in:"}
                    </span>
                    <span className="text-lg font-mono font-bold text-primary">
                      {(() => {
                        try {
                          if (typeof slot.timeRemaining !== 'number' || isNaN(slot.timeRemaining)) {
                            console.warn('Invalid timeRemaining:', slot.timeRemaining);
                            return 'Invalid Time';
                          }
                          return formatTimeRemaining(slot.timeRemaining);
                        } catch (error) {
                          console.error('Error formatting time remaining:', error);
                          return 'Error';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Partitioned Intervals */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Intervals & Points
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    console.log('Slot intervals:', {
                      slotNumber: slot.slotNumber,
                      intervals: slot.intervals,
                      isArray: Array.isArray(slot.intervals)
                    });
                    return slot.intervals && Array.isArray(slot.intervals) ? slot.intervals.map((interval) => (
                    <div 
                      key={interval.intervalNumber}
                      className="bg-muted/50 p-2 rounded text-xs"
                    >
                      <div className="font-medium text-center text-primary">
                        {interval.points || 0} pts
                      </div>
                      <div className="text-center text-muted-foreground">
                        {interval.label || 'Unknown'}
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-muted-foreground text-center col-span-2">
                      No intervals available
                    </div>
                  );
                  })()}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    console.log('Slot selected:', slot);
                    onSlotSelect?.(slot);
                  }}
                  disabled={isLocked}
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Locked
                    </>
                  ) : isSelected ? (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Select Slot
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      });
      })()}
    </div>
  );
}

