// src/utils/ics.ts

import type { EventItem } from '../types';

function escapeICS(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  const parts = [];
  // RFC 5545 limit is 75 octets.
  // Simple folding: if > 75 chars, split.
  // Note: we should split by bytes, but chars is safe enough for basic needs.
  if (line.length <= 75) return line;
  
  let currentLine = line.substring(0, 75);
  let remainder = line.substring(75);
  parts.push(currentLine);
  
  while (remainder.length > 0) {
    currentLine = ' ' + remainder.substring(0, 74);
    parts.push(currentLine);
    remainder = remainder.substring(74);
  }
  
  return parts.join('\r\n');
}

export function generateICS(events: EventItem[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CalMaker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const formatICSDate = (dateStr: string, timeStr?: string, isAllDay?: boolean) => {
    // 2023-01-01 -> 20230101
    const d = dateStr.replace(/-/g, '');
    if (isAllDay) {
      return `;VALUE=DATE:${d}`;
    }
    // 13:00 -> 130000
    const t = timeStr ? timeStr.replace(/:/g, '') + '00' : '000000';
    return `:${d}T${t}`;
  };

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}`);
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push(`DTSTAMP:${dtstamp}`);
    
    if (event.title) lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
    
    const tzid = event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (event.allDay) {
      lines.push(`DTSTART${formatICSDate(event.date, undefined, true)}`);
      // End date for all day is next day
      const nextDay = new Date(new Date(event.date).getTime() + 86400000);
      const y = nextDay.getFullYear();
      const m = String(nextDay.getMonth()+1).padStart(2,'0');
      const d = String(nextDay.getDate()).padStart(2,'0');
      lines.push(`DTEND${formatICSDate(`${y}-${m}-${d}`, undefined, true)}`);
    } else {
        lines.push(`DTSTART;TZID=${tzid}${formatICSDate(event.date, event.startTime)}`);
        
        // Simple Assumption: Single day event if timed
        const endDate = event.date;
        let endTime = event.endTime;
        if (!endTime) endTime = event.startTime; 
        
        lines.push(`DTEND;TZID=${tzid}${formatICSDate(endDate, endTime)}`);
    }
    
    // RRULE
    if (event.recurrence.freq !== 'NONE') {
      const parts: string[] = [`FREQ=${event.recurrence.freq}`];
      if (event.recurrence.interval && event.recurrence.interval > 1) {
        parts.push(`INTERVAL=${event.recurrence.interval}`);
      }
      if (event.recurrence.freq === 'WEEKLY' && event.recurrence.byWeekday && event.recurrence.byWeekday.length > 0) {
        const days = ['SU','MO','TU','WE','TH','FR','SA'];
        const byDay = event.recurrence.byWeekday.map(d => days[d]).join(',');
        parts.push(`BYDAY=${byDay}`);
      }
      if (event.recurrence.until) {
        // UNTIL must be UTC: YYYYMMDDT235959Z
        // We take the date, assume end of that day in local, convert to UTC?
        // Safe approach: treat as floating end of day and append Z (technically incorrect but widely accepted)
        // OR convert input date to UTC.
        // Let's just strip dashes and add T235959Z
        const u = event.recurrence.until.replace(/-/g, '');
        parts.push(`UNTIL=${u}T235959Z`);
      } else if (event.recurrence.count) {
        parts.push(`COUNT=${event.recurrence.count}`);
      }
      lines.push(`RRULE:${parts.join(';')}`);
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  
  return lines.map(foldLine).join('\r\n');
}
