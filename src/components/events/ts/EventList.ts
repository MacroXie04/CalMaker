import { ref, watch, computed } from 'vue';
import type { ExpandedEvent } from '../../../types';
import { formatTime } from '../../../utils/date';
import { getEventColorCached, type EventColor } from '../../../utils/colors';

export { formatTime, getEventColorCached, type EventColor };

export function useEventList(
  props: { date: string | null; events: ExpandedEvent[]; allEvents: ExpandedEvent[] },
  emit: {
    (e: 'edit', event: ExpandedEvent): void;
    (e: 'delete', event: ExpandedEvent): void;
    (e: 'selection-change', selectedIds: string[]): void;
    (e: 'export'): void;
    (e: 'add'): void;
  }
) {
  const selectedIds = ref<Set<string>>(new Set());
  const showAllEvents = ref(true);

  // Events for selected date
  const dateEvents = computed(() => {
    if (!props.date) return [];
    return props.events;
  });

  // Count of events for selected date (unique by originalEventId)
  const dateEventCount = computed(() => {
    const seen = new Set<string>();
    for (const evt of dateEvents.value) {
      seen.add(evt.originalEventId);
    }
    return seen.size;
  });

  // Deduplicate events by originalEventId based on current view mode
  const uniqueEvents = computed(() => {
    const seen = new Set<string>();
    const result: ExpandedEvent[] = [];
    const source = showAllEvents.value ? props.allEvents : dateEvents.value;
    
    for (const evt of source) {
      if (!seen.has(evt.originalEventId)) {
        seen.add(evt.originalEventId);
        result.push(evt);
      }
    }
    
    return result;
  });

  // All unique events count (for display)
  const allEventsCount = computed(() => {
    const seen = new Set<string>();
    for (const evt of props.allEvents) {
      seen.add(evt.originalEventId);
    }
    return seen.size;
  });

  // Group events by course/title
  const groupedEvents = computed(() => {
    const groups: Record<string, ExpandedEvent[]> = {};
    
    for (const evt of uniqueEvents.value) {
      const match = evt.title.match(/^(.*?)\s*\([^)]+\)$/);
      const baseTitle = match && match[1] ? match[1].trim() : evt.title;
      
      if (!groups[baseTitle]) {
        groups[baseTitle] = [];
      }
      groups[baseTitle].push(evt);
    }

    return Object.entries(groups)
      .map(([title, items]) => ({ title, items }))
      .sort((a, b) => a.title.localeCompare(b.title));
  });

  function toggleViewMode() {
    showAllEvents.value = !showAllEvents.value;
  }

  // Reset selection when date changes
  watch(() => props.date, () => {
    selectedIds.value.clear();
    emit('selection-change', []);
  });

  function toggleSelection(id: string, checked: boolean) {
    if (checked) {
      selectedIds.value.add(id);
    } else {
      selectedIds.value.delete(id);
    }
    emit('selection-change', Array.from(selectedIds.value));
  }

  function onEdit(evt: ExpandedEvent) {
    emit('edit', evt);
  }

  function onDelete(evt: ExpandedEvent) {
    emit('delete', evt);
  }

  // Format recurrence info
  function getRecurrenceInfo(evt: ExpandedEvent): string {
    if (evt.recurrence.freq === 'NONE') return '';
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let info = '';
    
    if (evt.recurrence.byWeekday && evt.recurrence.byWeekday.length > 0) {
      const dayNames = evt.recurrence.byWeekday
        .filter(d => d >= 0 && d <= 6)
        .map(d => days[d])
        .filter((name): name is string => !!name)
        .join(', ');
      info = dayNames ? `Every ${dayNames}` : evt.recurrence.freq.toLowerCase();
    } else {
      info = `${evt.recurrence.freq.toLowerCase()}`;
    }
    
    if (evt.recurrence.until) {
      info += ` until ${evt.recurrence.until}`;
    }
    
    return info;
  }

  return {
    selectedIds,
    showAllEvents,
    uniqueEvents,
    allEventsCount,
    dateEventCount,
    groupedEvents,
    toggleSelection,
    toggleViewMode,
    onEdit,
    onDelete,
    getRecurrenceInfo,
  };
}
