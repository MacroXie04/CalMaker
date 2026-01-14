import type { ExpandedEvent } from '../../../types';
import { WEEKDAYS } from '../../../utils/date';
import { getEventColorCached, type EventColor } from '../../../utils/colors';

export { WEEKDAYS, getEventColorCached, type EventColor };

export interface MonthGridProps {
  grid: { date: string; isCurrentMonth: boolean; dayNum: number }[];
  today: string;
  selectedDate: string | null;
  eventsByDate: Record<string, ExpandedEvent[]>;
}
