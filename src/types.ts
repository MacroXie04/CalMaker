export interface RecurrenceRule {
  freq: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number; // default 1
  byWeekday?: number[]; // 0=SU..6=SA (for WEEKLY)
  count?: number; // mutually exclusive with until
  until?: string; // YYYY-MM-DD inclusive
}

export interface EventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Start date)
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  allDay: boolean;
  timezone: string; // IANA
  location?: string;
  description?: string;
  recurrence: RecurrenceRule;
  createdAt: number;
}

export interface ExpandedEvent extends EventItem {
  originalEventId: string;
  instanceDate: string; // YYYY-MM-DD
}
