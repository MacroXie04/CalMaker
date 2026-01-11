// src/utils/recurrence.ts

import type { EventItem, ExpandedEvent } from '../types';
import { parseDate, formatDate } from './date';

export function expandRecurringEvents(
  events: EventItem[],
  rangeStart: string,
  rangeEnd: string
): ExpandedEvent[] {
  const expanded: ExpandedEvent[] = [];

  events.forEach(event => {
    // 1. Non-recurring
    if (event.recurrence.freq === 'NONE') {
      if (event.date >= rangeStart && event.date <= rangeEnd) {
        expanded.push({ ...event, originalEventId: event.id, instanceDate: event.date });
      }
      return;
    }

    // 2. Recurring
    const { freq, interval = 1, byWeekday, count, until } = event.recurrence;
    const startDate = parseDate(event.date);
    const untilDate = until ? parseDate(until) : null;
    
    let currentCount = 0;
    let cursor = new Date(startDate);
    
    let safety = 0;
    const MAX_SAFETY = 2000;
    
    while (safety++ < MAX_SAFETY) {
      const occurrences: Date[] = [];
      
      if (freq === 'WEEKLY' && byWeekday && byWeekday.length > 0) {
        // Calculate Sunday of the current cursor week
        const currentDay = cursor.getDay(); 
        const sunday = new Date(cursor);
        sunday.setDate(cursor.getDate() - currentDay);
        
        for (const wd of byWeekday) {
            const cand = new Date(sunday);
            cand.setDate(sunday.getDate() + wd);
            
            // Candidate must be >= startDate
            if (cand >= startDate) {
                 occurrences.push(cand);
            }
        }
        occurrences.sort((a, b) => a.getTime() - b.getTime());
      } else {
        // For simple repetition, just the cursor itself
        occurrences.push(new Date(cursor));
      }

      let stop = false;
      for (const date of occurrences) {
        // Check UNTIL
        if (untilDate && date > untilDate) {
          stop = true;
          break;
        }
        
        // Check COUNT
        if (count && currentCount >= count) {
          stop = true;
          break;
        }
        
        currentCount++;
        
        // Add if within view range
        const dStr = formatDate(date);
        if (dStr >= rangeStart && dStr <= rangeEnd) {
          expanded.push({
            ...event,
            originalEventId: event.id,
            instanceDate: dStr
          });
        }
        
        // Optimization
        if (dStr > rangeEnd && !count) {
            stop = true;
            break;
        }
      }
      
      if (stop) break;
      
      if (!count && formatDate(cursor) > rangeEnd) break;

      // Advance cursor
      switch (freq) {
        case 'DAILY':
          cursor.setDate(cursor.getDate() + interval);
          break;
        case 'WEEKLY':
          cursor.setDate(cursor.getDate() + (interval * 7));
          break;
        case 'MONTHLY':
          const expectedDay = cursor.getDate();
          cursor.setMonth(cursor.getMonth() + interval);
          if (cursor.getDate() !== expectedDay) {
             cursor.setDate(0); 
          }
          break;
        case 'YEARLY':
          cursor.setFullYear(cursor.getFullYear() + interval);
          break;
      }
    }
  });

  return expanded;
}
