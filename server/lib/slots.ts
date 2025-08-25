import { DateTime } from 'luxon';

export type DurationKey = '1h' | '3h' | '6h' | '24h' | '48h' | '1w' | '1m' | '3m' | '6m' | '1y';

export interface SlotInfo {
  slotNumber: number;
  slotStart: DateTime;
  slotEnd: DateTime;
  slotLabel: string;
}

// Points configuration matching the new specification
const SLOT_POINTS: Record<DurationKey, number[]> = {
  '1h': [10, 5, 2, 1],
  '3h': [20, 15, 10, 5, 2, 1],
  '6h': [30, 20, 15, 10, 5, 1],
  '24h': [40, 30, 20, 15, 10, 5, 2, 1],
  '48h': [50, 40, 30, 20, 15, 10, 5, 1],
  '1w': [60, 50, 40, 30, 20, 10, 5],
  '1m': [80, 60, 40, 20],
  '3m': [100, 60, 30],
  '6m': [120, 100, 80, 60, 40, 20],
  '1y': [150, 100, 50, 20]
};

export function formatSlotLabel(startTime: string, endTime: string): string {
  return startTime === endTime ? startTime : `${startTime} - ${endTime}`;
}

function getIntervals(duration: DurationKey): { count: number; minutesPerInterval: number } {
  switch (duration) {
    case '1h':
      return { count: 4, minutesPerInterval: 15 }; // 4×15 min
    case '3h':
      return { count: 6, minutesPerInterval: 30 }; // 6×30 min
    case '6h':
      return { count: 6, minutesPerInterval: 60 }; // 6×1 hour
    case '24h':
      return { count: 8, minutesPerInterval: 180 }; // 8×3 hours
    case '48h':
      return { count: 8, minutesPerInterval: 360 }; // 8×6 hours
    case '1w':
      return { count: 7, minutesPerInterval: 1440 }; // 7×1 day
    case '1m':
      return { count: 4, minutesPerInterval: 10080 }; // 4×1 week (10080 = 7*1440)
    case '3m':
      return { count: 3, minutesPerInterval: 43200 }; // 3×1 month (43200 = 30*1440)
    case '6m':
      return { count: 6, minutesPerInterval: 43200 }; // 6×1 month (43200 = 30*1440)
    case '1y':
      return { count: 4, minutesPerInterval: 129600 }; // 4×3 months (129600 = 90*1440)
  }
}

function startOfLogicalPeriod(now: DateTime, duration: DurationKey): DateTime {
  switch (duration) {
    case '1h':
    case '3h':
    case '6h':
    case '24h':
    case '48h':
      return now.startOf('day');
    case '1w':
      return now.startOf('week');
    case '1m':
      return now.startOf('month');
    case '3m':
    case '6m':
      // Start at beginning of current quarter/half-year
      const quarter = Math.floor((now.month - 1) / 3);
      return now.set({ month: quarter * 3 + 1, day: 1 }).startOf('day');
    case '1y':
      return now.startOf('year');
  }
}

export function getSlotForDate(date: Date | string, duration: DurationKey, zone: string = 'Europe/Berlin'): SlotInfo {
  const now = typeof date === 'string' ? DateTime.fromISO(date, { zone }) : DateTime.fromJSDate(date, { zone });
  const { count, minutesPerInterval } = getIntervals(duration);
  const periodStart = startOfLogicalPeriod(now, duration);
  const minutesSinceStart = now.diff(periodStart, 'minutes').minutes;
  const rawIndex = Math.floor(minutesSinceStart / minutesPerInterval);
  const slotIndex = Math.min(Math.max(rawIndex, 0), count - 1);

  const slotStart = periodStart.plus({ minutes: slotIndex * minutesPerInterval });
  const slotEnd = slotStart.plus({ minutes: minutesPerInterval }).minus({ milliseconds: 1 });

  const startLabel = slotStart.toFormat('HH:mm');
  const endLabel = slotEnd.plus({ milliseconds: 1 }).toFormat('HH:mm');

  return {
    slotNumber: slotIndex + 1,
    slotStart,
    slotEnd,
    slotLabel: formatSlotLabel(startLabel, endLabel),
  };
}

export function getCurrentActiveSlot(duration: DurationKey, zone: string = 'Europe/Berlin'): SlotInfo {
  return getSlotForDate(new Date(), duration, zone);
}

export function isWithinActiveSlot(date: Date | string, duration: DurationKey, zone: string = 'Europe/Berlin'): boolean {
  const dt = typeof date === 'string' ? DateTime.fromISO(date, { zone }) : DateTime.fromJSDate(date, { zone });
  const slot = getSlotForDate(dt.toJSDate(), duration, zone);
  return dt >= slot.slotStart && dt <= slot.slotEnd;
}

export function getAllSlotsForDuration(
  startDate: Date | string,
  endDate: Date | string,
  duration: DurationKey,
  zone: string = 'Europe/Berlin'
): SlotInfo[] {
  const start = typeof startDate === 'string' ? DateTime.fromISO(startDate, { zone }) : DateTime.fromJSDate(startDate, { zone });
  const end = typeof endDate === 'string' ? DateTime.fromISO(endDate, { zone }) : DateTime.fromJSDate(endDate, { zone });
  const { count, minutesPerInterval } = getIntervals(duration);
  const periodStart = startOfLogicalPeriod(start, duration);
  const slots: SlotInfo[] = [];
  for (let i = 0; i < count; i++) {
    const s = periodStart.plus({ minutes: i * minutesPerInterval });
    const e = s.plus({ minutes: minutesPerInterval }).minus({ milliseconds: 1 });
    if (e < start || s > end) continue;
    slots.push({
      slotNumber: i + 1,
      slotStart: s,
      slotEnd: e,
      slotLabel: formatSlotLabel(s.toFormat('HH:mm'), e.plus({ milliseconds: 1 }).toFormat('HH:mm')),
    });
  }
  return slots;
}

// Get points for a specific slot in a duration
export function getPointsForSlot(duration: DurationKey, slotNumber: number): number {
  const points = SLOT_POINTS[duration];
  if (slotNumber < 1 || slotNumber > points.length) {
    throw new Error(`Invalid slot number ${slotNumber} for duration ${duration}`);
  }
  return points[slotNumber - 1]; // Convert to 0-based index
}

// Check if a slot is valid (current or future only)
export function isSlotValid(duration: DurationKey, slotNumber: number, targetTime?: Date | string, zone: string = 'Europe/Berlin'): boolean {
  const now = targetTime ? 
    (typeof targetTime === 'string' ? DateTime.fromISO(targetTime, { zone }) : DateTime.fromJSDate(targetTime, { zone })) :
    DateTime.now().setZone(zone);
  
  const currentSlot = getSlotForDate(now.toJSDate(), duration, zone);
  
  // Only allow current slot or future slots
  return slotNumber >= currentSlot.slotNumber;
}

// Get all valid slots for selection (current + future)
export function getValidSlotsForDuration(duration: DurationKey, zone: string = 'Europe/Berlin'): SlotInfo[] {
  const now = DateTime.now().setZone(zone);
  const currentSlot = getSlotForDate(now.toJSDate(), duration, zone);
  const { count } = getIntervals(duration);
  const periodStart = startOfLogicalPeriod(now, duration);
  
  const slots: SlotInfo[] = [];
  
  // Start from current slot onwards
  for (let i = currentSlot.slotNumber - 1; i < count; i++) {
    const { minutesPerInterval } = getIntervals(duration);
    const s = periodStart.plus({ minutes: i * minutesPerInterval });
    const e = s.plus({ minutes: minutesPerInterval }).minus({ milliseconds: 1 });
    
    slots.push({
      slotNumber: i + 1,
      slotStart: s,
      slotEnd: e,
      slotLabel: formatSlotLabel(s.toFormat('HH:mm'), e.plus({ milliseconds: 1 }).toFormat('HH:mm')),
    });
  }
  
  return slots;
}
