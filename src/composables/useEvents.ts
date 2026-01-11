import { ref } from 'vue';
import type { EventItem } from '../types';

const STORAGE_KEY_V1 = 'calmaker_events_v1';
const STORAGE_KEY_V2 = 'calmaker_events_v2';

const events = ref<EventItem[]>([]);
const loaded = ref(false);

export function useEvents() {
  
  function load() {
    if (loaded.value) return;
    
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      try {
        events.value = JSON.parse(v2);
      } catch (e) {
        console.error('Failed to parse v2 events', e);
        events.value = [];
      }
    } else {
      // Check v1
      const v1 = localStorage.getItem(STORAGE_KEY_V1);
      if (v1) {
        try {
          const oldEvents = JSON.parse(v1);
          // Migrate
          events.value = oldEvents.map((e: any) => ({
             // Ensure all required fields for v2
             id: e.id || crypto.randomUUID(),
             title: e.title,
             date: e.date,
             startTime: e.startTime,
             endTime: e.endTime,
             allDay: e.allDay,
             timezone: e.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
             location: e.location,
             description: e.description,
             recurrence: { freq: 'NONE' },
             createdAt: e.createdAt || Date.now()
          }));
          save(); 
        } catch (e) {
          console.error('Failed to parse v1 events', e);
        }
      }
    }
    loaded.value = true;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(events.value));
  }

  function addEvent(event: EventItem) {
    events.value.push(event);
    save();
  }

  function updateEvent(updatedEvent: EventItem) {
    const index = events.value.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      events.value[index] = updatedEvent;
      save();
    }
  }

  function deleteEvent(id: string) {
    events.value = events.value.filter(e => e.id !== id);
    save();
  }

  return {
    events,
    load,
    addEvent,
    updateEvent,
    deleteEvent
  };
}
