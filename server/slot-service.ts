import { db } from './db';
import { slotConfigs } from '../shared/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { 
  getCurrentActiveSlot, 
  getSlotForDate, 
  getPointsForSlot, 
  isSlotValid, 
  getValidSlotsForDuration,
  type DurationKey 
} from './lib/slots';

export interface SlotInfo {
  slotNumber: number;
  startTime: string;
  endTime: string;
  pointsIfCorrect: number;
  penaltyIfWrong: number;
  isActive: boolean;
  timeRemaining?: number; // in milliseconds
}

export interface ActiveSlot {
  slotNumber: number;
  startTime: Date;
  endTime: Date;
  pointsIfCorrect: number;
  penaltyIfWrong: number;
  timeRemaining: number;
}

// Slot configuration based on the new specification table
// Duration → Interval → Points earliest→latest
const SLOT_CONFIGURATIONS = {
  '1h': {
    intervals: 4,
    intervalDuration: 15, // minutes (4×15 min)
    points: [10, 5, 2, 1]
  },
  '3h': {
    intervals: 6,
    intervalDuration: 30, // minutes (6×30 min)
    points: [20, 15, 10, 5, 2, 1]
  },
  '6h': {
    intervals: 6,
    intervalDuration: 60, // minutes (6×1 hour)
    points: [30, 20, 15, 10, 5, 1]
  },
  '24h': {
    intervals: 8,
    intervalDuration: 180, // minutes (8×3 hours)
    points: [40, 30, 20, 15, 10, 5, 2, 1]
  },
  '48h': {
    intervals: 8,
    intervalDuration: 360, // minutes (8×6 hours)
    points: [50, 40, 30, 20, 15, 10, 5, 1]
  },
  '1w': {
    intervals: 7,
    intervalDuration: 1440, // minutes (7×1 day)
    points: [60, 50, 40, 30, 20, 10, 5]
  },
  '1m': {
    intervals: 4,
    intervalDuration: 10080, // minutes (4×1 week)
    points: [80, 60, 40, 20]
  },
  '3m': {
    intervals: 3,
    intervalDuration: 43200, // minutes (3×1 month)
    points: [100, 60, 30]
  },
  '6m': {
    intervals: 6,
    intervalDuration: 43200, // minutes (6×1 month)
    points: [120, 100, 80, 60, 40, 20]
  },
  '1y': {
    intervals: 4,
    intervalDuration: 129600, // minutes (4×3 months)
    points: [150, 100, 50, 20]
  }
};

// Initialize default slot configurations
export async function initializeSlotConfigs() {
  const existingConfigs = await db.query.slotConfigs.findMany();
  
  if (existingConfigs.length > 0) {
    return; // Already initialized
  }

  const allSlots = [];

  // Generate slots for each duration
  for (const [duration, config] of Object.entries(SLOT_CONFIGURATIONS)) {
    for (let i = 0; i < config.intervals; i++) {
      const slotNumber = i + 1;
      const pointsIfCorrect = config.points[i];
      const penaltyIfWrong = Math.max(1, Math.floor(pointsIfCorrect / 2));

      // Calculate start and end times for the slot
      let startTime: string;
      let endTime: string;

      if (duration === '1h') {
        // 4 slots of 15 minutes each
        const startMinutes = i * 15;
        const endMinutes = (i + 1) * 15 - 1;
        startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
        endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      } else if (duration === '3h') {
        // 6 slots of 30 minutes each
        const startMinutes = i * 30;
        const endMinutes = (i + 1) * 30 - 1;
        startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
        endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      } else if (duration === '6h') {
        // 6 slots of 1 hour each
        startTime = `${i.toString().padStart(2, '0')}:00`;
        endTime = `${i.toString().padStart(2, '0')}:59`;
      } else if (duration === '24h') {
        // 8 slots of 3 hours each
        const startHour = i * 3;
        const endHour = (i + 1) * 3 - 1;
        startTime = `${startHour.toString().padStart(2, '0')}:00`;
        endTime = `${endHour.toString().padStart(2, '0')}:59`;
      } else if (duration === '48h') {
        // 8 slots of 6 hours each
        const startHour = i * 6;
        const endHour = (i + 1) * 6 - 1;
        startTime = `${startHour.toString().padStart(2, '0')}:00`;
        endTime = `${endHour.toString().padStart(2, '0')}:59`;
      } else if (duration === '1w') {
        // 7 slots of 1 day each
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        startTime = days[i];
        endTime = days[i];
      } else if (duration === '1m') {
        // 4 slots of 1 week each
        startTime = `Week ${i + 1}`;
        endTime = `Week ${i + 1}`;
      } else if (duration === '3m') {
        // 3 slots of 1 month each
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        startTime = monthNames[i];
        endTime = monthNames[i];
      } else if (duration === '6m') {
        // 6 slots of 1 month each
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        startTime = monthNames[i];
        endTime = monthNames[i];
      } else if (duration === '1y') {
        // 4 slots of 3 months each (quarters)
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        startTime = quarters[i];
        endTime = quarters[i];
      } else {
        // Fallback
        startTime = `Slot ${i + 1}`;
        endTime = `Slot ${i + 1}`;
      }

      allSlots.push({
        duration: duration as any,
        slotNumber,
        startTime,
        endTime,
        pointsIfCorrect,
        penaltyIfWrong
      });
    }
  }

  await db.insert(slotConfigs).values(allSlots);
}

// Get current CEST time
export function getCurrentCESTTime(): Date {
  const now = new Date();
  const cestOffset = 2; // CEST is UTC+2
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (cestOffset * 3600000));
}

// Parse time string to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Get current slot number for a duration
export function getCurrentSlot(duration: string): number {
  const now = new Date();
  const currentTime = now.getTime();
  
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  if (!config) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const slotDuration = config.intervalDuration * 60 * 1000; // Convert to milliseconds
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const timeSinceStartOfDay = currentTime - startOfDay;
  
  const slotNumber = Math.floor(timeSinceStartOfDay / slotDuration) + 1;
  return Math.min(slotNumber, config.intervals);
}

// Get slot start and end times for a specific slot
export function getSlotTimes(duration: string, slotNumber: number): { start: Date; end: Date } {
  const now = getCurrentCESTTime();
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  
  if (!config) {
    return { start: now, end: now };
  }

  if (duration === '1h') {
    // 4 slots of 15 minutes each
    const startMinutes = (slotNumber - 1) * 15;
    const endMinutes = slotNumber * 15 - 1;
    
    const start = new Date(now);
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    
    const end = new Date(now);
    end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 59, 999);
    
    return { start, end };
  } else if (duration === '3h') {
    // 6 slots of 30 minutes each
    const startMinutes = (slotNumber - 1) * 30;
    const endMinutes = slotNumber * 30 - 1;
    
    const start = new Date(now);
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    
    const end = new Date(now);
    end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 59, 999);
    
    return { start, end };
  } else if (duration === '6h') {
    // 6 slots of 1 hour each
    const startHour = slotNumber - 1;
    const endHour = slotNumber - 1;
    
    const start = new Date(now);
    start.setHours(startHour, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(endHour, 59, 59, 999);
    
    return { start, end };
  } else if (duration === '24h') {
    // 8 slots of 3 hours each
    const startHour = (slotNumber - 1) * 3;
    const endHour = slotNumber * 3 - 1;
    
    const start = new Date(now);
    start.setHours(startHour, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(endHour, 59, 59, 999);
    
    return { start, end };
  } else if (duration === '48h') {
    // 8 slots of 6 hours each
    const startHour = (slotNumber - 1) * 6;
    const endHour = slotNumber * 6 - 1;
    
    const start = new Date(now);
    start.setHours(startHour, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(endHour, 59, 59, 999);
    
    return { start, end };
  } else if (duration === '1w') {
    // 7 slots of 1 day each
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() + slotNumber - 1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    
    return { start, end };
  } else if (duration === '1m') {
    // 4 slots of 1 week each
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setDate((slotNumber - 1) * 7 + 1);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(-1);
    
    return { start, end };
  } else if (duration === '3m' || duration === '6m') {
    // 3/6 slots of 1 month each
    const start = new Date(now.getFullYear(), slotNumber - 1, 1);
    
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);
    
    return { start, end };
  } else if (duration === '1y') {
    // 4 slots of 3 months each (quarters)
    const startMonth = (slotNumber - 1) * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    end.setMilliseconds(-1);
    
    return { start, end };
  }
  
  return { start: now, end: now };
}

// Get active slot information
export async function getActiveSlot(duration: string): Promise<ActiveSlot | null> {
  const currentSlotNumber = getCurrentSlot(duration);
  const slotTimes = getSlotTimes(duration, currentSlotNumber);
  
  const slotConfig = await db.query.slotConfigs.findFirst({
    where: and(
      eq(slotConfigs.duration, duration as "1h" | "3h" | "6h" | "24h" | "48h" | "1w" | "1m" | "3m" | "6m" | "1y"),
      eq(slotConfigs.slotNumber, currentSlotNumber)
    ),
  });
  
  if (!slotConfig) {
    return null;
  }
  
  const now = getCurrentCESTTime();
  const timeRemaining = slotTimes.end.getTime() - now.getTime();
  
  return {
    slotNumber: slotConfig.slotNumber,
    startTime: slotTimes.start,
    endTime: slotTimes.end,
    pointsIfCorrect: slotConfig.pointsIfCorrect,
    penaltyIfWrong: slotConfig.penaltyIfWrong,
    timeRemaining: Math.max(0, timeRemaining),
  };
}

// Get all slots for a duration
export async function getAllSlots(duration: string): Promise<SlotInfo[]> {
  const slots = await db.query.slotConfigs.findMany({
    where: eq(slotConfigs.duration, duration as "1h" | "3h" | "6h" | "24h" | "48h" | "1w" | "1m" | "3m" | "6m" | "1y"),
    orderBy: [asc(slotConfigs.slotNumber)],
  });

  const currentSlotNumber = getCurrentSlot(duration);
  
  return slots.map(config => ({
    slotNumber: config.slotNumber,
    startTime: config.startTime,
    endTime: config.endTime,
    pointsIfCorrect: config.pointsIfCorrect,
    penaltyIfWrong: config.penaltyIfWrong,
    isActive: config.slotNumber === currentSlotNumber,
  }));
}

// Check if a slot is active
export function isSlotActive(duration: string, slotNumber: number): boolean {
  const currentSlot = getCurrentSlot(duration);
  return currentSlot === slotNumber;
}

// Check if a slot is upcoming
export function isSlotUpcoming(duration: string, slotNumber: number): boolean {
  const currentSlot = getCurrentSlot(duration);
  return slotNumber > currentSlot;
}

// Check if a slot is expired
export function isSlotExpired(duration: string, slotNumber: number): boolean {
  const currentSlot = getCurrentSlot(duration);
  return slotNumber < currentSlot;
}

// Get next slot for a duration
export async function getNextSlot(duration: string): Promise<ActiveSlot | null> {
  const currentSlotNumber = getCurrentSlot(duration);
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  
  if (!config) {
    return null;
  }

  const nextSlotNumber = currentSlotNumber === config.intervals ? 1 : currentSlotNumber + 1;
  const slotTimes = getSlotTimes(duration, nextSlotNumber);
  
  const slotConfig = await db.query.slotConfigs.findFirst({
    where: and(
      eq(slotConfigs.duration, duration as "1h" | "3h" | "6h" | "24h" | "48h" | "1w" | "1m" | "3m" | "6m" | "1y"),
      eq(slotConfigs.slotNumber, nextSlotNumber)
    ),
  });
  
  if (!slotConfig) {
    return null;
  }
  
  const now = getCurrentCESTTime();
  const timeUntilNext = slotTimes.start.getTime() - now.getTime();
  
  return {
    slotNumber: slotConfig.slotNumber,
    startTime: slotTimes.start,
    endTime: slotTimes.end,
    pointsIfCorrect: slotConfig.pointsIfCorrect,
    penaltyIfWrong: slotConfig.penaltyIfWrong,
    timeRemaining: Math.max(0, timeUntilNext),
  };
}

// Format time remaining in human readable format
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// ===== ENHANCED SLOT FUNCTIONS USING LUXON UTILITIES =====

export interface EnhancedSlotInfo {
  slotNumber: number;
  startTime: string; // Berlin timezone formatted
  endTime: string; // Berlin timezone formatted
  pointsIfCorrect: number;
  penaltyIfWrong: number;
  isActive: boolean;
  isValid: boolean; // true if current or future slot
  timeRemaining?: number; // in milliseconds
}

// Get enhanced active slot with validation and points
export async function getEnhancedActiveSlot(duration: DurationKey): Promise<EnhancedSlotInfo | null> {
  try {
    const activeSlot = getCurrentActiveSlot(duration);
    const points = getPointsForSlot(duration, activeSlot.slotNumber);
    const penalty = Math.max(1, Math.floor(points / 2));
    
    // Calculate time remaining
    const now = new Date();
    const timeRemaining = Math.max(0, activeSlot.slotEnd.toJSDate().getTime() - now.getTime());
    
    return {
      slotNumber: activeSlot.slotNumber,
      startTime: activeSlot.slotStart.toFormat('HH:mm'),
      endTime: activeSlot.slotEnd.plus({ milliseconds: 1 }).toFormat('HH:mm'),
      pointsIfCorrect: points,
      penaltyIfWrong: penalty,
      isActive: timeRemaining > 0,
      isValid: true, // Current slot is always valid
      timeRemaining,
    };
  } catch (error) {
    console.error('Error getting enhanced active slot:', error);
    return null;
  }
}

// Get all valid slots for duration with enhanced info
export async function getEnhancedValidSlots(duration: DurationKey): Promise<EnhancedSlotInfo[]> {
  try {
    const validSlots = getValidSlotsForDuration(duration);
    const currentSlot = getCurrentActiveSlot(duration);
    
    return validSlots.map(slot => {
      const points = getPointsForSlot(duration, slot.slotNumber);
      const penalty = Math.max(1, Math.floor(points / 2));
      const isCurrentSlot = slot.slotNumber === currentSlot.slotNumber;
      
      let timeRemaining: number | undefined;
      if (isCurrentSlot) {
        const now = new Date();
        timeRemaining = Math.max(0, slot.slotEnd.toJSDate().getTime() - now.getTime());
      }
      
      return {
        slotNumber: slot.slotNumber,
        startTime: slot.slotStart.toFormat('HH:mm'),
        endTime: slot.slotEnd.plus({ milliseconds: 1 }).toFormat('HH:mm'),
        pointsIfCorrect: points,
        penaltyIfWrong: penalty,
        isActive: isCurrentSlot && (timeRemaining ?? 0) > 0,
        isValid: true, // All returned slots are valid
        timeRemaining,
      };
    });
  } catch (error) {
    console.error('Error getting enhanced valid slots:', error);
    return [];
  }
}

// Validate slot selection for predictions
export function validateSlotSelection(duration: DurationKey, slotNumber: number): {
  isValid: boolean;
  reason?: string;
} {
  try {
    // Check if slot number is within range
    const points = getPointsForSlot(duration, slotNumber);
    if (!points) {
      return { isValid: false, reason: `Invalid slot number ${slotNumber} for duration ${duration}` };
    }
    
    // Check if slot is current or future
    if (!isSlotValid(duration, slotNumber)) {
      return { isValid: false, reason: 'Cannot select past slots. Only current and future slots are allowed.' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: error instanceof Error ? error.message : 'Unknown validation error' };
  }
} 