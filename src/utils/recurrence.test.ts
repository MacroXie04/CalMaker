import { describe, it, expect } from 'vitest';
import { expandRecurringEvents } from './recurrence';
import type { EventItem } from '../types';

describe('recurrence utilities', () => {
  const createEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
    id: 'test-1',
    title: 'Test Event',
    date: '2024-01-15',
    allDay: false,
    startTime: '09:00',
    endTime: '10:00',
    timezone: 'America/Los_Angeles',
    location: '',
    description: '',
    recurrence: { freq: 'NONE' },
    createdAt: Date.now(),
    ...overrides,
  });

  describe('non-recurring events', () => {
    it('includes event within range', () => {
      const events = [createEvent({ date: '2024-01-15' })];
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-31');
      
      expect(expanded).toHaveLength(1);
      expect(expanded[0]?.instanceDate).toBe('2024-01-15');
    });

    it('excludes event outside range', () => {
      const events = [createEvent({ date: '2024-02-15' })];
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-31');
      
      expect(expanded).toHaveLength(0);
    });
  });

  describe('daily recurring events', () => {
    it('expands daily event within range', () => {
      const events = [createEvent({
        date: '2024-01-01',
        recurrence: { freq: 'DAILY', interval: 1 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-05');
      expect(expanded).toHaveLength(5);
    });

    it('respects interval', () => {
      const events = [createEvent({
        date: '2024-01-01',
        recurrence: { freq: 'DAILY', interval: 2 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-05');
      // Jan 1, 3, 5
      expect(expanded).toHaveLength(3);
    });

    it('respects until date', () => {
      const events = [createEvent({
        date: '2024-01-01',
        recurrence: { freq: 'DAILY', interval: 1, until: '2024-01-03' },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-10');
      expect(expanded).toHaveLength(3); // Jan 1, 2, 3
    });

    it('respects count', () => {
      const events = [createEvent({
        date: '2024-01-01',
        recurrence: { freq: 'DAILY', interval: 1, count: 3 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-10');
      expect(expanded).toHaveLength(3);
    });
  });

  describe('weekly recurring events', () => {
    it('expands weekly event', () => {
      const events = [createEvent({
        date: '2024-01-01', // Monday
        recurrence: { freq: 'WEEKLY', interval: 1 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-31');
      // Jan 1, 8, 15, 22, 29
      expect(expanded).toHaveLength(5);
    });

    it('expands weekly event with specific weekdays', () => {
      const events = [createEvent({
        date: '2024-01-01', // Monday
        recurrence: { freq: 'WEEKLY', interval: 1, byWeekday: [1, 3] }, // Mon, Wed
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-14');
      // Week 1: Jan 1 (Mon), Jan 3 (Wed)
      // Week 2: Jan 8 (Mon), Jan 10 (Wed)
      expect(expanded).toHaveLength(4);
    });
  });

  describe('monthly recurring events', () => {
    it('expands monthly event', () => {
      const events = [createEvent({
        date: '2024-01-15',
        recurrence: { freq: 'MONTHLY', interval: 1 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-04-30');
      // Jan 15, Feb 15, Mar 15, Apr 15
      expect(expanded).toHaveLength(4);
    });
  });

  describe('yearly recurring events', () => {
    it('expands yearly event', () => {
      const events = [createEvent({
        date: '2024-01-15',
        recurrence: { freq: 'YEARLY', interval: 1 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2026-12-31');
      // 2024, 2025, 2026
      expect(expanded).toHaveLength(3);
    });
  });

  describe('originalEventId', () => {
    it('preserves original event id in expanded events', () => {
      const events = [createEvent({
        id: 'original-123',
        date: '2024-01-01',
        recurrence: { freq: 'DAILY', interval: 1 },
      })];
      
      const expanded = expandRecurringEvents(events, '2024-01-01', '2024-01-03');
      
      expanded.forEach(evt => {
        expect(evt.originalEventId).toBe('original-123');
      });
    });
  });
});
