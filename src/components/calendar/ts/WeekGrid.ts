import { computed } from 'vue';
import type { ExpandedEvent } from '../../../types';
import { WEEKDAYS, formatDate } from '../../../utils/date';
import { getEventColorCached } from '../../../utils/colors';

export { WEEKDAYS, getEventColorCached };

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

export function useWeekGrid(props: {
  startDate: string;
  selectedDate: string | null;
  today: string;
  eventsByDate: Record<string, ExpandedEvent[]>;
}) {
  const weekDates = computed(() => {
    const dates = [];
    const [y, m, d] = props.startDate.split('-').map(Number);
    if (y === undefined || m === undefined || d === undefined) return [];
    const cursor = new Date(y, m - 1, d);

    for (let i = 0; i < 7; i++) {
      const dStr = formatDate(cursor);
      dates.push({
        date: dStr,
        dayName: WEEKDAYS[i],
        dayNum: cursor.getDate()
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  });

  function getEventStyle(evt: ExpandedEvent) {
    const color = getEventColorCached(evt.title);
    
    if (evt.allDay || !evt.startTime) {
      return {
        backgroundColor: color.bg,
        color: color.text,
        borderLeftColor: color.accent,
      };
    }
    
    const [h, m] = evt.startTime.split(':').map(Number);
    const startMin = (h || 0) * 60 + (m || 0);
    let endMin = startMin + 60;
    if (evt.endTime) {
      const [eh, em] = evt.endTime.split(':').map(Number);
      endMin = (eh || 0) * 60 + (em || 0);
    }
    const duration = Math.max(endMin - startMin, 15);
    
    const top = (startMin / 60) * 50;
    const height = (duration / 60) * 50;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: color.bg,
      color: color.text,
      borderLeftColor: color.accent,
    };
  }

  function getAllDayEventStyle(evt: ExpandedEvent) {
    const color = getEventColorCached(evt.title);
    return {
      backgroundColor: color.bg,
      color: color.text,
      borderLeft: `3px solid ${color.accent}`,
    };
  }

  return {
    weekDates,
    getEventStyle,
    getAllDayEventStyle,
  };
}
