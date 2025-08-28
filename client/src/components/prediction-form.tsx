import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, Star, Lock } from "lucide-react";

interface PredictionFormProps {
  assetId: string;
  assetSymbol: string;
  assetName: string;
  selectedDuration?: string;
  onDurationChange?: (duration: string) => void;
}

const predictionSchema = z.object({
  direction: z.enum(["up", "down"]),
  duration: z.enum(["1h", "3h", "6h", "24h", "48h", "1w", "1m", "3m", "6m", "1y"]),
});

type PredictionFormData = z.infer<typeof predictionSchema>;

interface SlotInfo {
  slotNumber: number;
  startTime: string;
  endTime: string;
  pointsIfCorrect: number;
  penaltyIfWrong: number;
  isActive: boolean;
  isValid: boolean; // true if current or future slot
  timeRemaining?: number; // in milliseconds (matching backend)
  lockStatus?: {
    isLocked: boolean;
    timeUntilStart: number;
    timeUntilUnlock: number;
  };
}

interface SlotUpdate {
  type: 'slot_update';
  duration: string; // Support all duration types
  currentSlot: number;
  timeRemaining: number;
  nextSlotStart: number;
}

export default function PredictionForm({ assetId, assetSymbol, assetName, selectedDuration: propSelectedDuration, onDurationChange }: PredictionFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [internalSelectedDuration, setInternalSelectedDuration] = useState<string>("24h");
  const [activeSlot, setActiveSlot] = useState<SlotInfo | null>(null);
  const [realTimeCountdown, setRealTimeCountdown] = useState<number | null>(null);

  // Use prop duration if provided, otherwise use internal state
  const selectedDuration = propSelectedDuration || internalSelectedDuration;
  const setSelectedDuration = onDurationChange || setInternalSelectedDuration;

  // Debug logging for authentication
  useEffect(() => {
    console.log('🔐 PredictionForm - Authentication state:', {
      user: user ? 'Authenticated' : 'Not authenticated',
      userId: user?.id,
      email: user?.email,
      emailVerified: user?.emailVerified
    });
  }, [user]);

  const form = useForm<PredictionFormData>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      direction: "up",
      duration: "24h",
    },
  });



  // Fetch active slot information
  const { data: slotData, isLoading: isLoadingSlot, error: slotError } = useQuery<SlotInfo>({
    queryKey: [`/api/slots/${selectedDuration}/active`],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch all slots for the selected duration
  const { data: allSlots, isLoading: isLoadingAllSlots, error: allSlotsError } = useQuery<SlotInfo[]>({
    queryKey: [`/api/slots/${selectedDuration}`],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (slotData) {
      setActiveSlot(slotData);
    }
  }, [slotData]);

  // Debug logging
  useEffect(() => {
    console.log('All slots data:', allSlots);
    console.log('Selected duration:', selectedDuration);
    console.log('Slot error:', allSlotsError);
    console.log('Active slot data:', slotData);
    console.log('Active slot error:', slotError);
  }, [allSlots, selectedDuration, allSlotsError, slotData, slotError]);

  // Real-time countdown timer
  useEffect(() => {
    if (!activeSlot || !activeSlot.isActive) {
      setRealTimeCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const endTime = new Date(activeSlot.endTime);
      const timeRemaining = endTime.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setRealTimeCountdown(0);
        // Refetch slot data when countdown reaches zero
        queryClient.invalidateQueries({ queryKey: [`/api/slots/${selectedDuration}/active`] });
      } else {
        setRealTimeCountdown(timeRemaining);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [activeSlot, selectedDuration, queryClient]);

  const mutation = useMutation({
    mutationFn: async (data: PredictionFormData) => {
      console.log('🔐 PredictionForm - mutationFn called with data:', data);
      
      if (!activeSlot) {
        throw new Error("No active slot available");
      }

      const payload = {
        assetSymbol,
        direction: data.direction,
        duration: data.duration,
      };

      console.log('🔐 PredictionForm - Making API request with payload:', payload);
      const res = await apiRequest("POST", "/api/predictions", payload);
      console.log('🔐 PredictionForm - API response received:', res.status, res.statusText);
      
      return res.json();
    },
    onSuccess: () => {
      console.log('🔐 PredictionForm - Prediction submitted successfully');
      toast({
        title: "Prediction submitted",
        description: "Your prediction has been successfully submitted.",
      });
      form.reset();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/sentiment/${assetSymbol}`] });
      
      // Invalidate admin queries to update prediction counts
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predictions"] });
    },
    onError: (error: Error) => {
      console.error('🔐 PredictionForm - Prediction submission failed:', error);
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PredictionFormData) => {
    // Debug logging for submission
    console.log('🔐 PredictionForm - onSubmit called:', {
      user: user ? 'Authenticated' : 'Not authenticated',
      userId: user?.id,
      email: user?.email,
      emailVerified: user?.emailVerified,
      formData: data
    });

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to make predictions.",
        variant: "destructive",
      });
      return;
    }

    if (!user.emailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email before making predictions.",
        variant: "destructive",
      });
      return;
    }

    if (!activeSlot?.isActive) {
      toast({
        title: "Slot not active",
        description: "No active slot available for predictions.",
        variant: "destructive",
      });
      return;
    }

    // Check if slot is locked
    if (activeSlot.lockStatus?.isLocked) {
      toast({
        title: "Slot locked",
        description: `Predictions are disabled ${activeSlot.lockStatus.timeUntilStart > 0 ? 
          `until slot starts in ${Math.ceil(activeSlot.lockStatus.timeUntilStart / 60000)} minutes` : 
          'for this slot'}.`,
        variant: "destructive",
      });
      return;
    }

    console.log('🔐 PredictionForm - Submitting prediction...');
    mutation.mutate(data);
  };

  const handleDurationChange = (duration: string) => {
    setSelectedDuration(duration);
    form.setValue("duration", duration as "1h" | "3h" | "6h" | "24h" | "48h" | "1w" | "1m" | "3m" | "6m" | "1y");
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case "1h":
        return "1 Hour";
      case "3h":
        return "3 Hours";
      case "6h":
        return "6 Hours";
      case "24h":
        return "24 Hours";
      case "48h":
        return "48 Hours";
      case "1w":
        return "1 Week";
      case "1m":
        return "1 Month";
      case "3m":
        return "3 Months";
      case "6m":
        return "6 Months";
      case "1y":
        return "1 Year";
      default:
        return duration;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "00:00:00";
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoadingSlot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading slot information...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Make a Prediction
        </CardTitle>
        <CardDescription>
          Predict the direction of {assetName} ({assetSymbol}) for the selected duration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration Selection - Responsive Grid */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Duration</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {(["1h", "3h", "6h", "24h", "48h", "1w", "1m", "3m", "6m", "1y"] as const).map((duration) => (
              <Button
                key={duration}
                type="button"
                variant={selectedDuration === duration ? "default" : "outline"}
                size="sm"
                onClick={() => handleDurationChange(duration)}
                className="text-xs sm:text-sm"
              >
                {getDurationLabel(duration)}
              </Button>
            ))}
          </div>
        </div>

        {/* Active Slot Information - Enhanced */}
        {activeSlot && (
          <Alert className={
            activeSlot.isActive && activeSlot.isValid !== false 
              ? "border-green-200 bg-green-50" 
              : "border-red-200 bg-red-50"
          }>
            <div className="flex items-start gap-3">
              {activeSlot.isActive && activeSlot.isValid !== false ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-semibold">
                      Slot {activeSlot.slotNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {activeSlot.startTime} - {activeSlot.endTime}
                    </span>
                    {activeSlot.lockStatus?.isLocked && (
                      <Badge variant="destructive" className="ml-2">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  {activeSlot.isActive && (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">
                        {realTimeCountdown !== null 
                          ? formatTimeRemaining(realTimeCountdown)
                          : activeSlot.timeRemaining
                        }
                      </span>
                    </div>
                  )}
                </AlertDescription>
                {activeSlot.isValid === false ? (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Slot expired:</span> Predictions are only allowed for current and future slots.
                  </div>
                ) : activeSlot.lockStatus?.isLocked ? (
                  <div className="text-sm text-orange-600">
                    <span className="font-medium">Slot locked:</span> Predictions are disabled {activeSlot.lockStatus.timeUntilStart > 0 ? 
                      `until slot starts in ${Math.ceil(activeSlot.lockStatus.timeUntilStart / 60000)} minutes` : 
                      'for this slot'}. Please wait for the slot to unlock.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">+{activeSlot.pointsIfCorrect} points</span>
                        <span className="text-muted-foreground">if correct</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">-{activeSlot.penaltyIfWrong} points</span>
                        <span className="text-muted-foreground">if wrong</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <div className="font-medium mb-1">Accuracy Bonus:</div>
                      <div className="space-y-1">
                        <div>• +10 points for exact match (within 0.1%)</div>
                        <div>• +5 points for high accuracy (within 0.5%)</div>
                        <div>• +2 points for acceptable range (within 1%)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Prediction Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Direction</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="up" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium">Up</div>
                            <div className="text-xs text-muted-foreground">Price will increase</div>
                          </div>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="down" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2 cursor-pointer">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <div>
                            <div className="font-medium">Down</div>
                            <div className="text-xs text-muted-foreground">Price will decrease</div>
                          </div>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={mutation.isPending || !activeSlot?.isActive || activeSlot?.isValid === false || activeSlot?.lockStatus?.isLocked}
              className="w-full"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : activeSlot?.lockStatus?.isLocked ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Slot Locked
                </>
              ) : (
                <>
                  {getDirectionIcon(form.watch("direction"))}
                  Submit Prediction
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Slot Information - Responsive Grid */}
        {isLoadingAllSlots ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Loading slots for {getDurationLabel(selectedDuration)}...</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : allSlots && Array.isArray(allSlots) && allSlots.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">All Slots for {getDurationLabel(selectedDuration)}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {allSlots.filter(slot => slot && typeof slot === 'object').map((slot) => {
                const isValidSlot = slot.isValid !== false; // Handle undefined as valid for backward compatibility
                const isCurrentSlot = slot.isActive;
                
                const isLocked = slot.lockStatus?.isLocked;
                
                return (
                  <div
                    key={slot.slotNumber || Math.random()}
                    className={`p-3 rounded-lg border text-xs transition-colors ${
                      !isValidSlot 
                        ? "border-red-200 bg-red-50 opacity-50 cursor-not-allowed" 
                        : isLocked
                          ? "border-orange-200 bg-orange-50 opacity-75 cursor-not-allowed"
                          : isCurrentSlot 
                            ? "border-green-200 bg-green-50 shadow-sm ring-2 ring-green-100" 
                            : "border-blue-200 bg-blue-50 hover:border-blue-300"
                    }`}
                    title={
                      !isValidSlot ? "Past slot - predictions not allowed" :
                      isLocked ? "Slot locked - predictions disabled" :
                      undefined
                    }
                  >
                    <div className="font-semibold text-center mb-1 flex items-center justify-center gap-1">
                      Slot {slot.slotNumber || 'N/A'}
                      {isCurrentSlot && <span className="text-green-600">•</span>}
                      {isLocked && <span className="text-orange-600">🔒</span>}
                      {!isValidSlot && <span className="text-red-600">✕</span>}
                    </div>
                    <div className={`text-center mb-2 ${!isValidSlot ? "text-gray-400" : "text-gray-600"}`}>
                      {slot.startTime || 'N/A'}-{slot.endTime || 'N/A'}
                    </div>
                    <div className="text-center space-y-1">
                      <div>
                        <span className={`font-semibold ${!isValidSlot ? "text-gray-400" : "text-green-600"}`}>
                          +{slot.pointsIfCorrect || 0}
                        </span>
                      </div>
                      {slot.penaltyIfWrong && (
                        <div>
                          <span className={`text-xs ${!isValidSlot ? "text-gray-400" : "text-red-500"}`}>
                            -{slot.penaltyIfWrong}
                          </span>
                        </div>
                      )}
                      {isCurrentSlot && slot.timeRemaining && (
                        <div className="text-xs text-green-600 font-mono">
                          {formatTimeRemaining(slot.timeRemaining)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : allSlotsError ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-600">Error loading slots for {getDurationLabel(selectedDuration)}</h4>
            <p className="text-xs text-muted-foreground">Error: {allSlotsError.message || 'Failed to load slots'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">No slots available for {getDurationLabel(selectedDuration)}</h4>
            <p className="text-xs text-muted-foreground">Please try a different duration or check back later.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 