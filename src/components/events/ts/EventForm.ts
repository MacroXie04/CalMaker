import { ref, watch } from 'vue';
import type { EventItem, RecurrenceRule } from '../../../types';
import { useEvents } from '../../../composables/useEvents';
import { useToast } from '../../../composables/useToast';
import { getToday } from '../../../utils/date';
import { parseUCMHtml } from '../../../utils/ucmParser';

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function useEventForm(
  props: { initialDate?: string; editEvent?: EventItem; isOpen: boolean },
  emit: (event: 'close' | 'saved') => void
) {
  const { addEvent, updateEvent } = useEvents();
  const toast = useToast();

  // Form State
  const title = ref('');
  const date = ref('');
  const allDay = ref(true);
  const startTime = ref('');
  const endTime = ref('');
  const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const location = ref('');
  const description = ref('');

  // Import State
  const showImport = ref(false);
  const importHtml = ref('');

  // Recurrence State
  const freq = ref<RecurrenceRule['freq']>('NONE');
  const interval = ref(1);
  const byWeekday = ref<number[]>([]);

  const endCondition = ref<'NEVER' | 'UNTIL' | 'COUNT'>('NEVER');
  const untilDate = ref('');
  const count = ref(1);

  function toggleImport() {
    showImport.value = !showImport.value;
  }

  function handleImport() {
    if (!importHtml.value) return;
    const newEvents = parseUCMHtml(importHtml.value);
    if (newEvents.length > 0) {
      newEvents.forEach(evt => addEvent(evt));
      toast.success(`Imported ${newEvents.length} events!`);
      emit('saved');
      emit('close');
      importHtml.value = '';
      showImport.value = false;
    } else {
      toast.error('No events found in HTML.');
    }
  }

  function loadEvent(e: EventItem) {
    title.value = e.title;
    date.value = e.date;
    allDay.value = e.allDay;
    startTime.value = e.startTime || '';
    endTime.value = e.endTime || '';
    timezone.value = e.timezone;
    location.value = e.location || '';
    description.value = e.description || '';
    
    freq.value = e.recurrence.freq;
    interval.value = e.recurrence.interval || 1;
    byWeekday.value = e.recurrence.byWeekday || [];
    
    if (e.recurrence.until) {
      endCondition.value = 'UNTIL';
      untilDate.value = e.recurrence.until;
    } else if (e.recurrence.count) {
      endCondition.value = 'COUNT';
      count.value = e.recurrence.count;
    } else {
      endCondition.value = 'NEVER';
    }
  }

  function resetForm() {
    title.value = '';
    date.value = props.initialDate || getToday();
    allDay.value = true;
    startTime.value = '';
    endTime.value = '';
    timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    location.value = '';
    description.value = '';
    freq.value = 'NONE';
    interval.value = 1;
    byWeekday.value = [];
    endCondition.value = 'NEVER';
    untilDate.value = '';
    count.value = 1;
  }

  function save() {
    if (!title.value || !date.value) {
      toast.error('Title and Date are required');
      return;
    }
    
    const recurrence: RecurrenceRule = {
      freq: freq.value,
    };
    
    if (freq.value !== 'NONE') {
      recurrence.interval = Number(interval.value);
      if (freq.value === 'WEEKLY' && byWeekday.value.length > 0) {
        recurrence.byWeekday = [...byWeekday.value].sort();
      }
      
      if (endCondition.value === 'UNTIL' && untilDate.value) {
        recurrence.until = untilDate.value;
      } else if (endCondition.value === 'COUNT') {
        recurrence.count = Number(count.value);
      }
    }

    const newItem: EventItem = {
      id: props.editEvent ? props.editEvent.id : crypto.randomUUID(),
      title: title.value,
      date: date.value,
      allDay: allDay.value,
      startTime: !allDay.value ? startTime.value : undefined,
      endTime: !allDay.value ? endTime.value : undefined,
      timezone: timezone.value,
      location: location.value,
      description: description.value,
      recurrence,
      createdAt: props.editEvent ? props.editEvent.createdAt : Date.now()
    };

    if (props.editEvent) {
      updateEvent(newItem);
    } else {
      addEvent(newItem);
    }
    
    emit('saved');
    emit('close');
  }

  function toggleDay(dIndex: number) {
    const idx = byWeekday.value.indexOf(dIndex);
    if (idx >= 0) {
      byWeekday.value.splice(idx, 1);
    } else {
      byWeekday.value.push(dIndex);
    }
  }

  // Watch for open state changes
  watch(() => props.isOpen, (newVal) => {
    if (newVal) {
      if (props.editEvent) {
        loadEvent(props.editEvent);
      } else {
        resetForm();
      }
    }
  });

  return {
    // Form state
    title,
    date,
    allDay,
    startTime,
    endTime,
    timezone,
    location,
    description,
    
    // Import state
    showImport,
    importHtml,
    
    // Recurrence state
    freq,
    interval,
    byWeekday,
    endCondition,
    untilDate,
    count,
    
    // Methods
    toggleImport,
    handleImport,
    save,
    toggleDay,
  };
}
