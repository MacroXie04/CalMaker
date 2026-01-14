import { describe, it, expect } from 'vitest';
import { generateICS } from './ics';
import type { EventItem } from '../types';

describe('ICS generation', () => {
  const createEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
    id: 'test-event-123',
    title: 'Test Event',
    date: '2024-03-15',
    allDay: false,
    startTime: '09:00',
    endTime: '10:00',
    timezone: 'America/Los_Angeles',
    location: 'Room 101',
    description: 'Test description',
    recurrence: { freq: 'NONE' },
    createdAt: Date.now(),
    ...overrides,
  });

  describe('basic ICS structure', () => {
    it('generates valid ICS header and footer', () => {
      const events = [createEvent()];
      const ics = generateICS(events);
      
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//CalMaker//EN');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('generates VEVENT block', () => {
      const events = [createEvent()];
      const ics = generateICS(events);
      
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');
    });

    it('includes UID from event id', () => {
      const events = [createEvent({ id: 'unique-id-456' })];
      const ics = generateICS(events);
      
      expect(ics).toContain('UID:unique-id-456');
    });
  });

  describe('event content', () => {
    it('includes SUMMARY from title', () => {
      const events = [createEvent({ title: 'My Meeting' })];
      const ics = generateICS(events);
      
      expect(ics).toContain('SUMMARY:My Meeting');
    });

    it('includes DESCRIPTION', () => {
      const events = [createEvent({ description: 'Important meeting' })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DESCRIPTION:Important meeting');
    });

    it('includes LOCATION', () => {
      const events = [createEvent({ location: 'Conference Room A' })];
      const ics = generateICS(events);
      
      expect(ics).toContain('LOCATION:Conference Room A');
    });

    it('escapes special characters', () => {
      const events = [createEvent({ title: 'Meeting; with, special\\chars' })];
      const ics = generateICS(events);
      
      expect(ics).toContain('SUMMARY:Meeting\\; with\\, special\\\\chars');
    });
  });

  describe('timed events', () => {
    it('includes DTSTART with timezone', () => {
      const events = [createEvent({
        date: '2024-03-15',
        startTime: '14:30',
        timezone: 'America/New_York',
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DTSTART;TZID=America/New_York:20240315T143000');
    });

    it('includes DTEND with timezone', () => {
      const events = [createEvent({
        date: '2024-03-15',
        endTime: '16:00',
        timezone: 'America/New_York',
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DTEND;TZID=America/New_York:20240315T160000');
    });
  });

  describe('all-day events', () => {
    it('uses VALUE=DATE for all-day events', () => {
      const events = [createEvent({
        allDay: true,
        date: '2024-03-15',
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DTSTART;VALUE=DATE:20240315');
    });

    it('sets DTEND to next day for all-day events', () => {
      const events = [createEvent({
        allDay: true,
        date: '2024-03-15',
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DTEND;VALUE=DATE:20240316');
    });

    it('handles month boundary for all-day events', () => {
      const events = [createEvent({
        allDay: true,
        date: '2024-01-31',
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('DTEND;VALUE=DATE:20240201');
    });
  });

  describe('recurrence rules', () => {
    it('generates RRULE for daily recurrence', () => {
      const events = [createEvent({
        recurrence: { freq: 'DAILY' },
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('RRULE:FREQ=DAILY');
    });

    it('generates RRULE for weekly recurrence with interval', () => {
      const events = [createEvent({
        recurrence: { freq: 'WEEKLY', interval: 2 },
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2');
    });

    it('generates BYDAY for weekly recurrence with weekdays', () => {
      const events = [createEvent({
        recurrence: { freq: 'WEEKLY', byWeekday: [1, 3, 5] }, // Mon, Wed, Fri
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('BYDAY=MO,WE,FR');
    });

    it('generates UNTIL for recurrence end date', () => {
      const events = [createEvent({
        recurrence: { freq: 'DAILY', until: '2024-06-30' },
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('UNTIL=20240630T235959Z');
    });

    it('generates COUNT for recurrence count', () => {
      const events = [createEvent({
        recurrence: { freq: 'DAILY', count: 10 },
      })];
      const ics = generateICS(events);
      
      expect(ics).toContain('COUNT=10');
    });
  });

  describe('multiple events', () => {
    it('generates multiple VEVENT blocks', () => {
      const events = [
        createEvent({ id: 'event-1', title: 'Event One' }),
        createEvent({ id: 'event-2', title: 'Event Two' }),
      ];
      const ics = generateICS(events);
      
      const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(veventCount).toBe(2);
      expect(ics).toContain('SUMMARY:Event One');
      expect(ics).toContain('SUMMARY:Event Two');
    });
  });

  describe('empty events', () => {
    it('handles empty event array', () => {
      const ics = generateICS([]);
      
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).not.toContain('BEGIN:VEVENT');
    });
  });
});
