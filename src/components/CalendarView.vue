<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEvents } from '../composables/useEvents';
import { generateMonthGrid, getToday, formatDate, getWeekStart, addDays } from '../utils/date';
import { expandRecurringEvents } from '../utils/recurrence';
import { generateICS } from '../utils/ics';
import type { ExpandedEvent, EventItem } from '../types';
import EventList from './EventList.vue';
import MonthGrid from './MonthGrid.vue';
import WeekGrid from './WeekGrid.vue';
import DayGrid from './DayGrid.vue';

const { events, load, deleteEvent } = useEvents();

// View State
const viewMode = ref<'month' | 'week' | 'day'>('month');

const currentDate = ref(new Date());
const today = getToday();
const selectedDate = ref<string | null>(getToday());
const selectedEventIds = ref<string[]>([]);

const year = computed(() => currentDate.value.getFullYear());
const month = computed(() => currentDate.value.getMonth());

// Computed Labels
const headerTitle = computed(() => {
  if (viewMode.value === 'month') {
    return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
  } else if (viewMode.value === 'day') {
    return currentDate.value.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
  } else {
    // Week range
    const start = getWeekStart(currentDate.value);
    const end = addDays(start, 6);
    const startStr = start.toLocaleString('default', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }
});

// Grid Generation & Events
const monthGrid = computed(() => generateMonthGrid(year.value, month.value));

const expandedEvents = computed(() => {
  let start: string, end: string;

  if (viewMode.value === 'month') {
    if (monthGrid.value.length === 0) return [];
    const first = monthGrid.value[0];
    const last = monthGrid.value[monthGrid.value.length - 1];
    if (!first || !last) return [];
    start = first.date;
    end = last.date;
  } else if (viewMode.value === 'week') {
    const s = getWeekStart(currentDate.value);
    const e = addDays(s, 6);
    start = formatDate(s);
    end = formatDate(e);
  } else {
    // Day
    start = formatDate(currentDate.value);
    end = start;
  }
  
  return expandRecurringEvents(events.value, start, end);
});

const eventsByDate = computed(() => {
  const map: Record<string, ExpandedEvent[]> = {};
  expandedEvents.value.forEach(e => {
    if (!map[e.instanceDate]) map[e.instanceDate] = [];
    map[e.instanceDate]!.push(e);
  });
  // Sort events by time
  Object.keys(map).forEach(k => {
      map[k]!.sort((a,b) => {
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          return 0;
      });
  });
  return map;
});

const currentSelectedEvents = computed(() => {
  if (!selectedDate.value) return [];
  return eventsByDate.value[selectedDate.value] || [];
});

const weekStartDate = computed(() => formatDate(getWeekStart(currentDate.value)));
const dayDate = computed(() => formatDate(currentDate.value));

// Navigation
function prev() {
  if (viewMode.value === 'month') {
    currentDate.value = new Date(year.value, month.value - 1, 1);
  } else if (viewMode.value === 'week') {
    currentDate.value = addDays(currentDate.value, -7);
  } else {
    currentDate.value = addDays(currentDate.value, -1);
    selectedDate.value = formatDate(currentDate.value);
  }
}

function next() {
  if (viewMode.value === 'month') {
    currentDate.value = new Date(year.value, month.value + 1, 1);
  } else if (viewMode.value === 'week') {
    currentDate.value = addDays(currentDate.value, 7);
  } else {
    currentDate.value = addDays(currentDate.value, 1);
    selectedDate.value = formatDate(currentDate.value);
  }
}

function goToday() {
  const now = new Date();
  currentDate.value = now;
  selectedDate.value = formatDate(now);
}

function selectDate(date: string) {
  selectedDate.value = date;
}

// Export Logic
const showExportDialog = ref(false);

function openExportDialog() {
  showExportDialog.value = true;
}

function closeExportDialog() {
  showExportDialog.value = false;
}

function doExport(mode: 'all' | 'selected') {
  let listToExport: EventItem[] = [];
  
  if (mode === 'all') {
    listToExport = events.value;
  } else {
    const idsToExport = new Set(selectedEventIds.value);
    listToExport = events.value.filter(e => idsToExport.has(e.id));
    
    if (listToExport.length === 0) {
       // Ideally show toast
       closeExportDialog();
       return;
    }
  }

  const icsContent = generateICS(listToExport);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mode === 'all' ? 'CalMaker_All.ics' : 'CalMaker_Selected.ics';
  a.click();
  URL.revokeObjectURL(url);
  closeExportDialog();
}

const emit = defineEmits<{
  (e: 'editEvent', event: EventItem): void;
  (e: 'addEvent', date: string): void;
}>();

function handleEditEvent(e: ExpandedEvent) {
   const original = events.value.find(ev => ev.id === e.originalEventId);
   if (original) emit('editEvent', original);
}

function handleDeleteEvent(e: ExpandedEvent) {
   if (confirm(`Delete "${e.title}"? This will delete all occurrences.`)) {
     deleteEvent(e.originalEventId);
   }
}

function handleSelectionChange(ids: string[]) {
  selectedEventIds.value = ids;
}

onMounted(() => {
  load();
});
</script>

<template>
  <div class="calendar-view">
    <div class="header">
      <div class="title-section">
         <span class="title-text">{{ headerTitle }}</span>
      </div>
      <div class="controls">
        <div class="view-toggle">
          <component :is="viewMode === 'month' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'month'">Month</component>
          <component :is="viewMode === 'week' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'week'">Week</component>
          <component :is="viewMode === 'day' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'day'">Day</component>
        </div>

        <md-icon-button @click="prev"><md-icon>chevron_left</md-icon></md-icon-button>
        <md-filled-tonal-button @click="goToday">Today</md-filled-tonal-button>
        <md-icon-button @click="next"><md-icon>chevron_right</md-icon></md-icon-button>
        
        <div class="spacer"></div>
        <md-outlined-button @click="openExportDialog">
           <md-icon slot="icon">download</md-icon>
           Export
        </md-outlined-button>
      </div>
    </div>
    
    <div class="view-container">
       <MonthGrid 
         v-if="viewMode === 'month'"
         :grid="monthGrid"
         :today="today"
         :selectedDate="selectedDate"
         :eventsByDate="eventsByDate"
         @selectDate="selectDate"
       />
       <WeekGrid 
         v-else-if="viewMode === 'week'"
         :startDate="weekStartDate"
         :selectedDate="selectedDate"
         :today="today"
         :eventsByDate="eventsByDate"
         @selectDate="selectDate"
       />
       <DayGrid 
         v-else
         :date="dayDate"
         :events="eventsByDate[dayDate] || []"
       />
    </div>
    
    <div class="events-panel">
       <EventList 
         :date="selectedDate"
         :events="currentSelectedEvents"
         @edit="handleEditEvent"
         @delete="handleDeleteEvent"
         @selection-change="handleSelectionChange"
       />
    </div>
    
    <md-dialog :open="showExportDialog" @closed="closeExportDialog">
      <div slot="headline">Export Events</div>
      <div slot="content">
        Choose which events to export to ICS file.
      </div>
      <div slot="actions">
        <md-text-button @click="closeExportDialog">Cancel</md-text-button>
        <md-outlined-button 
            @click="doExport('selected')"
            :disabled="selectedEventIds.length === 0"
        >
          Export Selected ({{ selectedEventIds.length }})
        </md-outlined-button>
        <md-filled-button @click="doExport('all')">Export All</md-filled-button>
      </div>
    </md-dialog>

  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  flex-wrap: wrap;
  gap: 16px;
  flex-shrink: 0;
  border-bottom: 1px solid #e0e0e0;
}
.title-section {
  min-width: 200px;
}
.title-text {
  font-size: 1.5rem;
  font-weight: 500;
}
.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}
.view-toggle {
  display: flex;
  gap: 4px;
}
.spacer {
  flex: 1;
}
.view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.events-panel {
  flex: 0 0 30%; /* Fixed height ratio or use pixels */
  min-height: 200px;
  max-height: 400px;
  overflow: hidden;
  border-top: 1px solid #ddd;
}

@media (max-width: 600px) {
    .header {
        flex-direction: column;
        align-items: stretch;
    }
    .view-toggle {
      width: 100%;
      justify-content: center;
    }
    .calendar-view {
        overflow-y: auto;
        display: block;
    }
    .view-container {
        height: auto;
        min-height: 400px;
    }
    .events-panel {
        height: auto;
    }
}
</style>
