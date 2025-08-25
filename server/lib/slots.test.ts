import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { 
  getSlotForDate, 
  getCurrentActiveSlot, 
  isWithinActiveSlot, 
  formatSlotLabel,
  getPointsForSlot,
  isSlotValid,
  getValidSlotsForDuration
} from './slots';

describe('Enhanced Slot System - New Specification', () => {
  describe('formatSlotLabel', () => {
    it('single vs range', () => {
      expect(formatSlotLabel('00:00', '00:00')).toBe('00:00');
      expect(formatSlotLabel('00:00', '02:59')).toBe('00:00 - 02:59');
    });
  });

  describe('slot points calculation', () => {
    it('returns correct points for 1h duration (4×15min)', () => {
      expect(getPointsForSlot('1h', 1)).toBe(10);
      expect(getPointsForSlot('1h', 2)).toBe(5);
      expect(getPointsForSlot('1h', 3)).toBe(2);
      expect(getPointsForSlot('1h', 4)).toBe(1);
    });

    it('returns correct points for 24h duration (8×3h)', () => {
      expect(getPointsForSlot('24h', 1)).toBe(40);
      expect(getPointsForSlot('24h', 2)).toBe(30);
      expect(getPointsForSlot('24h', 3)).toBe(20);
      expect(getPointsForSlot('24h', 4)).toBe(15);
      expect(getPointsForSlot('24h', 5)).toBe(10);
      expect(getPointsForSlot('24h', 6)).toBe(5);
      expect(getPointsForSlot('24h', 7)).toBe(2);
      expect(getPointsForSlot('24h', 8)).toBe(1);
    });

    it('returns correct points for 1w duration (7×1day)', () => {
      expect(getPointsForSlot('1w', 1)).toBe(60);
      expect(getPointsForSlot('1w', 7)).toBe(5);
    });

    it('throws error for invalid slot numbers', () => {
      expect(() => getPointsForSlot('1h', 0)).toThrow();
      expect(() => getPointsForSlot('1h', 5)).toThrow();
      expect(() => getPointsForSlot('24h', 9)).toThrow();
    });
  });

  describe('24h duration (8×3h slots)', () => {
    it('returns the correct 3h slot', () => {
      const date = DateTime.fromISO('2024-01-15T12:30:00', { zone: 'Europe/Berlin' });
      const slot = getSlotForDate(date.toJSDate(), '24h');
      // Slots: [00-02:59]=1, [03-05:59]=2, [06-08:59]=3, [09-11:59]=4, [12-14:59]=5
      expect(slot.slotNumber).toBe(5);
      expect(slot.slotStart.toFormat('HH:mm')).toBe('12:00');
      expect(slot.slotEnd.toFormat('HH:mm')).toBe('14:59');
    });

    it('DST dates still return a valid slot and zone', () => {
      const spring = DateTime.fromISO('2024-03-31T02:30:00', { zone: 'Europe/Berlin' });
      const fall = DateTime.fromISO('2024-10-27T02:30:00', { zone: 'Europe/Berlin' });
      const s1 = getSlotForDate(spring.toJSDate(), '24h');
      const s2 = getSlotForDate(fall.toJSDate(), '24h');
      expect(s1.slotNumber).toBeGreaterThanOrEqual(1);
      expect(s2.slotNumber).toBeGreaterThanOrEqual(1);
      expect(s1.slotStart.zoneName).toBe('Europe/Berlin');
    });
  });

  describe('3h duration (6×30min slots)', () => {
    it('slot for 1:00 maps to slot 3 (6×30min)', () => {
      const date = DateTime.fromISO('2024-01-15T01:00:00', { zone: 'Europe/Berlin' });
      const slot = getSlotForDate(date.toJSDate(), '3h');
      // 6 slots of 30 minutes: [00:00-00:29]=1, [00:30-00:59]=2, [01:00-01:29]=3
      expect(slot.slotNumber).toBe(3);
    });
  });

  describe('slot validation', () => {
    it('current slot is always valid', () => {
      const now = new Date();
      const currentSlot = getCurrentActiveSlot('24h');
      expect(isSlotValid('24h', currentSlot.slotNumber, now)).toBe(true);
    });

    it('future slots are valid', () => {
      const now = new Date();
      const currentSlot = getCurrentActiveSlot('24h');
      if (currentSlot.slotNumber < 8) {
        expect(isSlotValid('24h', currentSlot.slotNumber + 1, now)).toBe(true);
      }
    });

    it('gets only valid slots for duration', () => {
      const validSlots = getValidSlotsForDuration('24h');
      expect(validSlots.length).toBeGreaterThan(0);
      expect(validSlots.length).toBeLessThanOrEqual(8);
      
      // All returned slots should have valid slot numbers
      validSlots.forEach(slot => {
        expect(slot.slotNumber).toBeGreaterThanOrEqual(1);
        expect(slot.slotNumber).toBeLessThanOrEqual(8);
      });
    });
  });

  describe('current slot and membership', () => {
    it('current active slot has a number between 1 and 8 for 24h', () => {
      const slot = getCurrentActiveSlot('24h');
      expect(slot.slotNumber).toBeGreaterThanOrEqual(1);
      expect(slot.slotNumber).toBeLessThanOrEqual(8);
    });

    it('isWithinActiveSlot returns true for any given time within its own slot window', () => {
      const now = new Date();
      const past = DateTime.now().setZone('Europe/Berlin').minus({ days: 1 }).toJSDate();
      const future = DateTime.now().setZone('Europe/Berlin').plus({ days: 1 }).toJSDate();
      expect(isWithinActiveSlot(now, '24h')).toBe(true);
      expect(isWithinActiveSlot(past, '24h')).toBe(true);
      expect(isWithinActiveSlot(future, '24h')).toBe(true);
    });
  });

  describe('all durations specification compliance', () => {
    const testCases: Array<{duration: any, expectedSlots: number, expectedPoints: number[]}> = [
      { duration: '1h', expectedSlots: 4, expectedPoints: [10, 5, 2, 1] },
      { duration: '3h', expectedSlots: 6, expectedPoints: [20, 15, 10, 5, 2, 1] },
      { duration: '6h', expectedSlots: 6, expectedPoints: [30, 20, 15, 10, 5, 1] },
      { duration: '24h', expectedSlots: 8, expectedPoints: [40, 30, 20, 15, 10, 5, 2, 1] },
      { duration: '48h', expectedSlots: 8, expectedPoints: [50, 40, 30, 20, 15, 10, 5, 1] },
      { duration: '1w', expectedSlots: 7, expectedPoints: [60, 50, 40, 30, 20, 10, 5] },
      { duration: '1m', expectedSlots: 4, expectedPoints: [80, 60, 40, 20] },
      { duration: '3m', expectedSlots: 3, expectedPoints: [100, 60, 30] },
      { duration: '6m', expectedSlots: 6, expectedPoints: [120, 100, 80, 60, 40, 20] },
      { duration: '1y', expectedSlots: 4, expectedPoints: [150, 100, 50, 20] },
    ];

    testCases.forEach(({ duration, expectedSlots, expectedPoints }) => {
      it(`${duration} duration has correct slot count and points`, () => {
        // Test points for each slot
        for (let i = 1; i <= expectedSlots; i++) {
          expect(getPointsForSlot(duration, i)).toBe(expectedPoints[i - 1]);
        }
        
        // Test that slot count is correct (no extra slots)
        expect(() => getPointsForSlot(duration, expectedSlots + 1)).toThrow();
      });
    });
  });

  describe('invalid duration', () => {
    it('throws an error', () => {
      expect(() => getSlotForDate(new Date(), 'invalid' as any)).toThrow();
    });
  });
});