import { describe, it, expect } from 'vitest';
import {
  formatDate,
  parseDate,
  addDays,
  getWeekStart,
  getDaysInMonth,
  getFirstDayOfMonth,
  generateMonthGrid,
  formatTime,
  WEEKDAYS,
} from './date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats date to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('pads single digit months and days', () => {
      const date = new Date(2024, 5, 5); // Jun 5, 2024
      expect(formatDate(date)).toBe('2024-06-05');
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD string to Date', () => {
      const date = parseDate('2024-03-20');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March (0-indexed)
      expect(date.getDate()).toBe(20);
    });

    it('returns current date for invalid input', () => {
      const date = parseDate('invalid');
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      const date = new Date(2024, 0, 15);
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-01-20');
    });

    it('subtracts days with negative value', () => {
      const date = new Date(2024, 0, 15);
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2024-01-10');
    });

    it('handles month boundaries', () => {
      const date = new Date(2024, 0, 31);
      const result = addDays(date, 1);
      expect(formatDate(result)).toBe('2024-02-01');
    });
  });

  describe('getWeekStart', () => {
    it('returns Sunday of the week', () => {
      // Wednesday Jan 17, 2024
      const date = new Date(2024, 0, 17);
      const sunday = getWeekStart(date);
      expect(sunday.getDay()).toBe(0); // Sunday
      expect(formatDate(sunday)).toBe('2024-01-14');
    });

    it('returns same day if already Sunday', () => {
      // Sunday Jan 14, 2024
      const date = new Date(2024, 0, 14);
      const sunday = getWeekStart(date);
      expect(formatDate(sunday)).toBe('2024-01-14');
    });
  });

  describe('getDaysInMonth', () => {
    it('returns 31 for January', () => {
      expect(getDaysInMonth(2024, 0)).toBe(31);
    });

    it('returns 29 for February in leap year', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29);
    });

    it('returns 28 for February in non-leap year', () => {
      expect(getDaysInMonth(2023, 1)).toBe(28);
    });

    it('returns 30 for April', () => {
      expect(getDaysInMonth(2024, 3)).toBe(30);
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('returns correct day of week for first of month', () => {
      // Jan 1, 2024 is Monday (1)
      expect(getFirstDayOfMonth(2024, 0)).toBe(1);
    });
  });

  describe('generateMonthGrid', () => {
    it('generates 42 cells (6 weeks)', () => {
      const grid = generateMonthGrid(2024, 0);
      expect(grid).toHaveLength(42);
    });

    it('marks current month days correctly', () => {
      const grid = generateMonthGrid(2024, 0); // January 2024
      const currentMonthDays = grid.filter(d => d.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(31); // January has 31 days
    });

    it('includes previous month days at start', () => {
      const grid = generateMonthGrid(2024, 0); // January 2024
      // Jan 1, 2024 is Monday, so first cell should be Dec 31, 2023 (Sunday)
      expect(grid[0]?.date).toBe('2023-12-31');
      expect(grid[0]?.isCurrentMonth).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('formats 24h to 12h AM', () => {
      expect(formatTime('09:30')).toBe('9:30 AM');
    });

    it('formats 24h to 12h PM', () => {
      expect(formatTime('14:45')).toBe('2:45 PM');
    });

    it('handles midnight', () => {
      expect(formatTime('00:00')).toBe('12:00 AM');
    });

    it('handles noon', () => {
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('returns empty string for undefined', () => {
      expect(formatTime(undefined)).toBe('');
    });
  });

  describe('WEEKDAYS constant', () => {
    it('has 7 days', () => {
      expect(WEEKDAYS).toHaveLength(7);
    });

    it('starts with Sunday', () => {
      expect(WEEKDAYS[0]).toBe('Sun');
    });
  });
});
