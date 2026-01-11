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

import JSZip from 'jszip';

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
  // Requirement change: Show ALL events regardless of date selection in the list.
  // We can just return all events, sorted.
  // Let's reuse expandedEvents but sorted.
  return expandedEvents.value.sort((a,b) => {
      // Sort by date then time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return 0;
  });
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

// Swipe Support
const touchStartX = ref(0);
const touchStartY = ref(0);
const isSwiping = ref(false);

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0];
  if (touch) {
    touchStartX.value = touch.clientX;
    touchStartY.value = touch.clientY;
    isSwiping.value = true;
  }
}

function onTouchEnd(e: TouchEvent) {
  if (!isSwiping.value) return;
  const touch = e.changedTouches[0];
  if (touch) {
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    handleSwipe(touchStartX.value, touchEndX, touchStartY.value, touchEndY);
  }
  isSwiping.value = false;
}

function onMouseDown(e: MouseEvent) {
  touchStartX.value = e.clientX;
  touchStartY.value = e.clientY;
  isSwiping.value = true;
}

function onMouseUp(e: MouseEvent) {
  if (!isSwiping.value) return;
  const touchEndX = e.clientX;
  const touchEndY = e.clientY;
  
  handleSwipe(touchStartX.value, touchEndX, touchStartY.value, touchEndY);
  isSwiping.value = false;
}

function handleSwipe(startX: number, endX: number, startY: number, endY: number) {
  const diffX = startX - endX;
  const diffY = startY - endY;
  
  // Threshold 50px
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      next();
    } else {
      prev();
    }
  }
}


// Export Logic
const showExportDialog = ref(false);

function openExportDialog() {
  showExportDialog.value = true;
}

function closeExportDialog() {
  showExportDialog.value = false;
}

function doExport(mode: 'all' | 'selected' | 'individual') {
  let listToExport: EventItem[] = [];
  
  if (mode === 'all') {
    listToExport = events.value;
  } else {
    // For both 'selected' and 'individual', we filter by selection first
    // If no selection, we might want to export current view's events or all?
    // Following existing logic: filter by selection if mode is not 'all'.
    const idsToExport = new Set(selectedEventIds.value);
    listToExport = events.value.filter(e => idsToExport.has(e.id));
    
    if (listToExport.length === 0) {
       // Ideally show toast
       closeExportDialog();
       return;
    }
  }

  // Common file name base
  const safeTitle = headerTitle.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (mode === 'individual') {
    // Zip export
    const zip = new JSZip();
    listToExport.forEach(event => {
      const ics = generateICS([event]);
      // Sanitize event title for filename
      const safeEventTitle = event.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `${event.date}_${safeEventTitle}.ics`;
      zip.file(fileName, ics);
    });
    
    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CalMaker_Export_${safeTitle}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    });
    
  } else {
    // Single ICS file export
    const icsContent = generateICS(listToExport);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const filename = mode === 'all' 
      ? `CalMaker_All_${safeTitle}.ics` 
      : `CalMaker_Selected_${safeTitle}.ics`;
      
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
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
   deleteEvent(e.originalEventId);
}

function handleSelectionChange(ids: string[]) {
  selectedEventIds.value = ids;
}

function handleAddEventClick() {
  if (selectedDate.value) {
    emit('addEvent', selectedDate.value);
  } else {
    emit('addEvent', getToday());
  }
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

        <div class="nav-controls">
          <md-icon-button @click="prev"><md-icon>chevron_left</md-icon></md-icon-button>
          <md-filled-tonal-button @click="goToday">Today</md-filled-tonal-button>
          <md-icon-button @click="next"><md-icon>chevron_right</md-icon></md-icon-button>
        </div>
        
        <div class="spacer"></div>
      </div>
    </div>
    
    <div class="view-container"
       @touchstart="onTouchStart"
       @touchend="onTouchEnd"
       @mousedown="onMouseDown"
       @mouseup="onMouseUp"
    >
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
         @export="openExportDialog"
         @add="handleAddEventClick"
       />
    </div>
    
    <md-dialog :open="showExportDialog" @closed="closeExportDialog" class="export-dialog">
      <div slot="headline">Export Events</div>
      <div slot="content" class="export-content">
        Choose how to export events.
      </div>
      <div slot="actions" class="export-actions">
        <md-text-button @click="closeExportDialog">Cancel</md-text-button>
        <div class="export-group">
          <md-outlined-button 
              @click="doExport('selected')"
              :disabled="selectedEventIds.length === 0"
          >
            Selected (Merged)
          </md-outlined-button>
          <md-outlined-button 
              @click="doExport('individual')"
              :disabled="selectedEventIds.length === 0"
          >
            Selected (Zip)
          </md-outlined-button>
        </div>
        <md-filled-button @click="doExport('all')">All</md-filled-button>
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
  flex-wrap: wrap; /* Allow controls to wrap on small screens */
}
.view-toggle {
  display: flex;
  gap: 4px;
}
.nav-controls {
  display: flex;
  align-items: center;
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
  user-select: none;
}
.events-panel {
  flex: 0 0 30%;
  min-height: 200px;
  max-height: 400px;
  overflow: hidden;
  border-top: 1px solid #ddd;
}

@media (max-width: 600px) {
    .header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        height: auto; /* Fix fixed height causing layout issues */
    }
    .title-section {
      text-align: center;
      min-width: auto;
      order: -1; /* Ensure title is at top */
    }
    .controls {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .view-toggle {
      width: 100%;
      justify-content: center;
    }
    .nav-controls {
      justify-content: space-between;
      width: 100%;
    }
    .spacer {
      display: none;
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
    
    .export-dialog md-outlined-button,
    .export-dialog md-filled-button {
      flex: 1;
    }
}

.export-actions {
  flex-wrap: wrap;
  gap: 8px;
}
.export-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
