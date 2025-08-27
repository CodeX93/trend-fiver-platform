import { db } from './db';
import { slotConfigs } from '../shared/schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { DateTime } from 'luxon';
export type DurationKey = '1h' | '3h' | '6h' | '24h' | '48h' | '1w' | '1m' | '3m' | '6m' | '1y';

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

// Lock state configuration - prevent predictions X minutes before slot start
export const LOCK_BEFORE_START_MINUTES = 5; // Lock 5 minutes before slot starts

// NEW: Check if a slot is locked (within LOCK_BEFORE_START_MINUTES of start)
export function isSlotLocked(duration: DurationKey, slotNumber: number): boolean {
  const now = DateTime.now().setZone('Europe/Berlin');
  const slotBoundaries = getFixedCESTBoundaries(duration);
  
  // Check if we're within the lock window
  const lockTime = DateTime.fromJSDate(slotBoundaries.start).minus({ minutes: LOCK_BEFORE_START_MINUTES });
  return now >= lockTime && now < DateTime.fromJSDate(slotBoundaries.start);
}

// NEW: Get lock status for a slot
export function getSlotLockStatus(duration: DurationKey, slotNumber: number): {
  isLocked: boolean;
  timeUntilLock: number; // milliseconds until lock starts
  timeUntilStart: number; // milliseconds until slot starts
  timeUntilUnlock: number; // milliseconds until slot unlocks (starts)
  lockStartTime: Date;
  slotStartTime: Date;
} {
  const now = DateTime.now().setZone('Europe/Berlin');
  const slotBoundaries = getFixedCESTBoundaries(duration);
  const lockStartTime = DateTime.fromJSDate(slotBoundaries.start).minus({ minutes: LOCK_BEFORE_START_MINUTES });
  
  const timeUntilLock = Math.max(0, lockStartTime.diff(now).toMillis());
  const timeUntilStart = Math.max(0, DateTime.fromJSDate(slotBoundaries.start).diff(now).toMillis());
  const timeUntilUnlock = timeUntilStart; // Slot unlocks when it starts
  const isLocked = now >= lockStartTime && now < DateTime.fromJSDate(slotBoundaries.start);
  
  return {
    isLocked,
    timeUntilLock,
    timeUntilStart,
    timeUntilUnlock,
    lockStartTime: lockStartTime.toJSDate(),
    slotStartTime: slotBoundaries.start
  };
}

// Get current CEST time using proper timezone library
export function getCurrentCESTTime(): Date {
  return DateTime.now().setZone('Europe/Berlin').toJSDate();
}

// NEW: Fixed CEST boundary calculations for slot anchoring
export function getFixedCESTBoundaries(duration: DurationKey, referenceDate?: Date): {
  start: Date;
  end: Date;
  slotNumber: number;
} {
  const now = referenceDate ? DateTime.fromJSDate(referenceDate).setZone('Europe/Berlin') : DateTime.now().setZone('Europe/Berlin');
  
  let start: DateTime;
  let end: DateTime;
  let slotNumber: number;
  
  switch (duration) {
    case '1h':
      // Hourly: start at exact hour boundaries (00:00, 01:00, 02:00, etc.)
      start = now.startOf('hour');
      end = start.plus({ hours: 1 });
      slotNumber = Math.floor(now.minute / 60) + 1;
      break;
      
    case '3h':
      // 3-hour: start at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
      const hour3 = Math.floor(now.hour / 3) * 3;
      start = now.set({ hour: hour3, minute: 0, second: 0, millisecond: 0 });
      end = start.plus({ hours: 3 });
      slotNumber = Math.floor(now.hour / 3) + 1;
      break;
      
    case '6h':
      // 6-hour: start at 00:00, 06:00, 12:00, 18:00
      const hour6 = Math.floor(now.hour / 6) * 6;
      start = now.set({ hour: hour6, minute: 0, second: 0, millisecond: 0 });
      end = start.plus({ hours: 6 });
      slotNumber = Math.floor(now.hour / 6) + 1;
      break;
      
    case '24h':
      // Daily: start at 00:00 each day
      start = now.startOf('day');
      end = start.plus({ days: 1 });
      slotNumber = now.ordinal; // Day of year
      break;
      
    case '48h':
      // 48-hour: start every other day at 00:00
      const day48 = Math.floor(now.ordinal / 2) * 2;
      start = now.startOf('year').plus({ days: day48 - 1 });
      end = start.plus({ days: 2 });
      slotNumber = Math.floor(now.ordinal / 2) + 1;
      break;
      
    case '1w':
      // Weekly: start every Monday at 00:00
      start = now.startOf('week').plus({ days: 1 }); // Monday
      end = start.plus({ weeks: 1 });
      slotNumber = now.weekNumber;
      break;
      
    case '1m':
      // Monthly: start on day 1 at 00:00
      start = now.startOf('month');
      end = start.plus({ months: 1 });
      slotNumber = now.month;
      break;
      
    case '3m':
      // Quarterly: start on Jan 1, Apr 1, Jul 1, Oct 1 at 00:00
      const quarter = Math.floor((now.month - 1) / 3);
      const quarterMonth = quarter * 3 + 1;
      start = now.set({ month: quarterMonth, day: 1 }).startOf('day');
      end = start.plus({ months: 3 });
      slotNumber = quarter + 1;
      break;
      
    case '6m':
      // Semi-annually: start on Jan 1 and Jul 1 at 00:00
      const halfYear = Math.floor((now.month - 1) / 6);
      const halfYearMonth = halfYear * 6 + 1;
      start = now.set({ month: halfYearMonth, day: 1 }).startOf('day');
      end = start.plus({ months: 6 });
      slotNumber = halfYear + 1;
      break;
      
    case '1y':
      // Yearly: start on Jan 1 at 00:00
      start = now.startOf('year');
      end = start.plus({ years: 1 });
      slotNumber = now.year;
      break;
      
    default:
      throw new Error(`Unsupported duration: ${duration}`);
  }
  
  return {
    start: start.toJSDate(),
    end: end.toJSDate(),
    slotNumber
  };
}

// NEW: Get all slots for a duration with fixed CEST boundaries
export function getAllSlotsForDuration(duration: DurationKey, count: number = 10): Array<{
  slotNumber: number;
  start: Date;
  end: Date;
  isActive: boolean;
  timeRemaining: number;
  pointsIfCorrect: number;
  penaltyIfWrong: number;
}> {
  const now = DateTime.now().setZone('Europe/Berlin');
  const slots = [];
  
  // Get current slot
  const currentBoundaries = getFixedCESTBoundaries(duration);
  
  // Generate previous and next slots
  for (let i = -Math.floor(count / 2); i < Math.floor(count / 2); i++) {
    let referenceDate: DateTime;
    
    switch (duration) {
      case '1h':
        referenceDate = now.plus({ hours: i });
        break;
      case '3h':
        referenceDate = now.plus({ hours: i * 3 });
        break;
      case '6h':
        referenceDate = now.plus({ hours: i * 6 });
        break;
      case '24h':
        referenceDate = now.plus({ days: i });
        break;
      case '48h':
        referenceDate = now.plus({ days: i * 2 });
        break;
      case '1w':
        referenceDate = now.plus({ weeks: i });
        break;
      case '1m':
        referenceDate = now.plus({ months: i });
        break;
      case '3m':
        referenceDate = now.plus({ months: i * 3 });
        break;
      case '6m':
        referenceDate = now.plus({ months: i * 6 });
        break;
      case '1y':
        referenceDate = now.plus({ years: i });
        break;
      default:
        continue;
    }
    
    const boundaries = getFixedCESTBoundaries(duration, referenceDate.toJSDate());
    const isActive = now >= DateTime.fromJSDate(boundaries.start) && now < DateTime.fromJSDate(boundaries.end);
    const timeRemaining = Math.max(0, DateTime.fromJSDate(boundaries.end).diff(now).toMillis());
    
    // Get points for this slot based on configuration
    const config = SLOT_CONFIGURATIONS[duration];
    const intervalIndex = Math.min(boundaries.slotNumber - 1, config.points.length - 1);
    const pointsIfCorrect = config.points[intervalIndex];
    const penaltyIfWrong = Math.max(1, Math.floor(pointsIfCorrect / 2));
    
    slots.push({
      slotNumber: boundaries.slotNumber,
      start: boundaries.start,
      end: boundaries.end,
      isActive,
      timeRemaining,
      pointsIfCorrect,
      penaltyIfWrong
    });
  }
  
  // Sort by slot number
  return slots.sort((a, b) => a.slotNumber - b.slotNumber);
}

// NEW: Get partitioned intervals for a slot based on the specification
export function getPartitionedIntervals(duration: DurationKey, slotStart: Date, slotEnd: Date): Array<{
  intervalNumber: number;
  start: Date;
  end: Date;
  points: number;
  label: string;
}> {
  const config = SLOT_CONFIGURATIONS[duration];
  const intervals = [];
  
  for (let i = 0; i < config.intervals; i++) {
    const intervalStart = new Date(slotStart.getTime() + (i * config.intervalDuration * 60 * 1000));
    const intervalEnd = new Date(slotStart.getTime() + ((i + 1) * config.intervalDuration * 60 * 1000));
    
    // Ensure no gaps or overlaps
    if (i > 0) {
      intervalStart.setTime(intervals[i - 1].end.getTime());
    }
    if (i === config.intervals - 1) {
      intervalEnd.setTime(slotEnd.getTime());
    }
    
    let label: string;
    switch (duration) {
      case '1h':
        label = `${intervalStart.getHours().toString().padStart(2, '0')}:${intervalStart.getMinutes().toString().padStart(2, '0')} - ${intervalEnd.getHours().toString().padStart(2, '0')}:${intervalEnd.getMinutes().toString().padStart(2, '0')}`;
        break;
      case '3h':
        label = `${intervalStart.getHours().toString().padStart(2, '0')}:${intervalStart.getMinutes().toString().padStart(2, '0')} - ${intervalEnd.getHours().toString().padStart(2, '0')}:${intervalEnd.getMinutes().toString().padStart(2, '0')}`;
        break;
      case '6h':
        label = `${intervalStart.getHours().toString().padStart(2, '0')}:00 - ${intervalEnd.getHours().toString().padStart(2, '0')}:00`;
        break;
      case '24h':
        label = `${intervalStart.getHours().toString().padStart(2, '0')}:00 - ${intervalEnd.getHours().toString().padStart(2, '0')}:00`;
        break;
      case '48h':
        label = `${intervalStart.getHours().toString().padStart(2, '0')}:00 - ${intervalEnd.getHours().toString().padStart(2, '0')}:00`;
        break;
      case '1w':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        label = `${days[intervalStart.getDay()]} - ${days[intervalEnd.getDay()]}`;
        break;
      case '1m':
        label = `Week ${i + 1}`;
        break;
      case '3m':
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = monthNames[intervalStart.getMonth()];
        break;
      case '6m':
        const monthNames6m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = monthNames6m[intervalStart.getMonth()];
        break;
      case '1y':
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        label = quarters[i];
        break;
      default:
        label = `Interval ${i + 1}`;
    }
    
    intervals.push({
      intervalNumber: i + 1,
      start: intervalStart,
      end: intervalEnd,
      points: config.points[i],
      label
    });
  }
  
  return intervals;
}

// Get slot for a specific date
export function getSlotForDate(date: Date | string, duration: DurationKey): SlotInfo {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = DateTime.fromJSDate(targetDate).setZone('Europe/Berlin');
  
  // Get the start of the logical period based on duration
  let periodStart: DateTime;
  switch (duration) {
    case '1h':
    case '3h':
    case '6h':
    case '24h':
    case '48h':
      periodStart = now.startOf('day');
      break;
    case '1w':
      periodStart = now.startOf('week');
      break;
    case '1m':
      periodStart = now.startOf('month');
      break;
    case '3m':
    case '6m':
      const quarter = Math.floor((now.month - 1) / 3);
      periodStart = now.set({ month: quarter * 3 + 1, day: 1 }).startOf('day');
      break;
    case '1y':
      periodStart = now.startOf('year');
      break;
    default:
      periodStart = now.startOf('day');
  }
  
  // Calculate slot number based on duration
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  if (!config) {
    return {
      slotNumber: 1,
      startTime: '00:00',
      endTime: '23:59',
      pointsIfCorrect: 0,
      penaltyIfWrong: 0,
      isActive: false
    };
  }
  
  const minutesSinceStart = now.diff(periodStart, 'minutes').minutes;
  const slotIndex = Math.floor(minutesSinceStart / config.intervalDuration);
  const slotNumber = Math.min(Math.max(slotIndex + 1, 1), config.intervals);
  
  // Calculate slot times
  const slotStartMinutes = (slotNumber - 1) * config.intervalDuration;
  const slotEndMinutes = slotNumber * config.intervalDuration - 1;
  
  const slotStart = periodStart.plus({ minutes: slotStartMinutes });
  const slotEnd = periodStart.plus({ minutes: slotEndMinutes });
  
  return {
    slotNumber,
    startTime: slotStart.toFormat('HH:mm'),
    endTime: slotEnd.toFormat('HH:mm'),
    pointsIfCorrect: config.points[slotNumber - 1] || 0,
    penaltyIfWrong: Math.max(1, Math.floor((config.points[slotNumber - 1] || 0) / 2)),
    isActive: false // Will be set by caller
  };
}

// Get current active slot for a duration
export function getCurrentActiveSlot(duration: DurationKey): SlotInfo {
  return getSlotForDate(new Date(), duration);
}

// Check if a date is within an active slot
export function isWithinActiveSlot(date: Date | string, duration: DurationKey): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const slot = getSlotForDate(targetDate, duration);
  const now = DateTime.now().setZone('Europe/Berlin');
  const slotStart = DateTime.fromFormat(slot.startTime, 'HH:mm').setZone('Europe/Berlin');
  const slotEnd = DateTime.fromFormat(slot.endTime, 'HH:mm').setZone('Europe/Berlin');
  
  return now >= slotStart && now <= slotEnd;
}

// Get points for a specific slot in a duration
export function getPointsForSlot(duration: DurationKey, slotNumber: number): number {
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  if (!config || slotNumber < 1 || slotNumber > config.points.length) {
    return 0;
  }
  return config.points[slotNumber - 1];
}

// Check if a slot is valid (current or future only)
export function isSlotValid(duration: DurationKey, slotNumber: number): boolean {
  const now = DateTime.now().setZone('Europe/Berlin');
  const currentSlot = getSlotForDate(now.toJSDate(), duration);
  
  // Only allow current slot or future slots
  return slotNumber >= currentSlot.slotNumber;
}

// Get valid slots for duration
export function getValidSlotsForDuration(duration: DurationKey): SlotInfo[] {
  const now = DateTime.now().setZone('Europe/Berlin');
  const currentSlot = getSlotForDate(now.toJSDate(), duration);
  const config = SLOT_CONFIGURATIONS[duration as keyof typeof SLOT_CONFIGURATIONS];
  
  if (!config) return [];
  
  const slots: SlotInfo[] = [];
  
  // Start from current slot onwards
  for (let i = currentSlot.slotNumber - 1; i < config.intervals; i++) {
    const slotNumber = i + 1;
    const slotStartMinutes = i * config.intervalDuration;
    const slotEndMinutes = (i + 1) * config.intervalDuration - 1;
    
    const periodStart = now.startOf('day');
    const slotStart = periodStart.plus({ minutes: slotStartMinutes });
    const slotEnd = periodStart.plus({ minutes: slotEndMinutes });
    
    slots.push({
      slotNumber,
      startTime: slotStart.toFormat('HH:mm'),
      endTime: slotEnd.toFormat('HH:mm'),
      pointsIfCorrect: config.points[i] || 0,
      penaltyIfWrong: Math.max(1, Math.floor((config.points[i] || 0) / 2)),
      isActive: slotNumber === currentSlot.slotNumber
    });
  }
  
  return slots;
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
  lockStatus: {
    isLocked: boolean;
    timeUntilLock: number;
    timeUntilStart: number;
    timeUntilUnlock: number;
    lockStartTime: Date;
    slotStartTime: Date;
  };
}

// Get enhanced active slot with validation and points
export async function getEnhancedActiveSlot(duration: DurationKey): Promise<EnhancedSlotInfo | null> {
  try {
    const activeSlot = getCurrentActiveSlot(duration);
    const points = getPointsForSlot(duration, activeSlot.slotNumber);
    const penalty = Math.max(1, Math.floor(points / 2));
    
    // Calculate time remaining
    const now = new Date();
    const slotEndTime = DateTime.fromFormat(activeSlot.endTime, 'HH:mm').setZone('Europe/Berlin');
    const timeRemaining = Math.max(0, slotEndTime.toJSDate().getTime() - now.getTime());
    
    const lockStatus = getSlotLockStatus(duration, activeSlot.slotNumber);
    return {
      slotNumber: activeSlot.slotNumber,
      startTime: activeSlot.startTime,
      endTime: activeSlot.endTime,
      pointsIfCorrect: points,
      penaltyIfWrong: penalty,
      isActive: timeRemaining > 0,
      isValid: true, // Current slot is always valid
      timeRemaining,
      lockStatus,
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
        const slotEndTime = DateTime.fromFormat(slot.endTime, 'HH:mm').setZone('Europe/Berlin');
        timeRemaining = Math.max(0, slotEndTime.toJSDate().getTime() - now.getTime());
      }
      
      const lockStatus = getSlotLockStatus(duration, slot.slotNumber);
      return {
        slotNumber: slot.slotNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        pointsIfCorrect: points,
        penaltyIfWrong: penalty,
        isActive: isCurrentSlot && (timeRemaining ?? 0) > 0,
        isValid: true, // All returned slots are valid
        timeRemaining,
        lockStatus,
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
  lockStatus?: {
    isLocked: boolean;
    timeUntilLock: number;
    timeUntilStart: number;
    timeUntilUnlock: number;
    lockStartTime: Date;
    slotStartTime: Date;
  };
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
    
    // Check lock state
    const lockStatus = getSlotLockStatus(duration, slotNumber);
    if (lockStatus.isLocked) {
      return { 
        isValid: false, 
        reason: `Slot is locked. Predictions are disabled ${LOCK_BEFORE_START_MINUTES} minutes before slot start.`,
        lockStatus
      };
    }
    
    return { isValid: true, lockStatus };
  } catch (error) {
    return { isValid: false, reason: error instanceof Error ? error.message : 'Unknown validation error' };
  }
} 

 