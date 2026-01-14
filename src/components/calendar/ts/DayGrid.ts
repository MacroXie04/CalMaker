import { computed } from 'vue';
import type { ExpandedEvent } from '../../../types';
import { getEventColorCached } from '../../../utils/colors';

export { getEventColorCached };

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

export function useDayGrid(props: { date: string; events: ExpandedEvent[] }) {
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
    
    const top = (startMin / 60) * 60;
    const height = (duration / 60) * 60;
    
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
      borderLeft: `4px solid ${color.accent}`,
    };
  }

  const allDayEvents = computed(() => props.events.filter(e => e.allDay));
  const timedEvents = computed(() => props.events.filter(e => !e.allDay));

  return {
    getEventStyle,
    getAllDayEventStyle,
    allDayEvents,
    timedEvents,
  };
}
