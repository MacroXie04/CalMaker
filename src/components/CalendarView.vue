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
  // Filter by selected date if one is chosen
  if (!selectedDate.value) return [];
  
  const eventsForDate = eventsByDate.value[selectedDate.value] || [];
  return eventsForDate.slice().sort((a,b) => {
      // Sort by time
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return 0;
  });
});

// All events sorted by date and time for "all events" view
// This expands ALL events regardless of current view date range
const allExpandedEvents = computed(() => {
  if (events.value.length === 0) return [];
  
  // Find the earliest start date and latest end date across all events
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';
  
  for (const evt of events.value) {
    if (evt.date < minDate) minDate = evt.date;
    // For recurring events, use the until date or a reasonable future date
    const endDate = evt.recurrence.until || evt.date;
    if (endDate > maxDate) maxDate = endDate;
    if (evt.date > maxDate) maxDate = evt.date;
  }
  
  // Expand all events within this full range
  const allExpanded = expandRecurringEvents(events.value, minDate, maxDate);
  
  return allExpanded.sort((a, b) => {
    // Sort by date then time
    if (a.instanceDate !== b.instanceDate) return a.instanceDate.localeCompare(b.instanceDate);
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
const exportSelectedCourses = ref<Set<string>>(new Set());

// Group all events by course name for export selection
const courseGroups = computed(() => {
  const groups: Record<string, EventItem[]> = {};
  
  for (const evt of events.value) {
    // Extract base title: "Course (Type)" -> "Course"
    const match = evt.title.match(/^(.*?)\s*\([^)]+\)$/);
    const baseTitle = match ? match[1].trim() : evt.title;
    
    if (!groups[baseTitle]) {
      groups[baseTitle] = [];
    }
    groups[baseTitle].push(evt);
  }
  
  return Object.entries(groups)
    .map(([name, items]) => ({ name, count: items.length, eventIds: items.map(e => e.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const panelHeight = ref(300);
const isResizing = ref(false);

function startResize(e: MouseEvent | TouchEvent) {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.addEventListener('touchmove', handleResize);
  document.addEventListener('touchend', stopResize);
}

function handleResize(e: MouseEvent | TouchEvent) {
  if (!isResizing.value) return;
  
  let clientY;
  if (window.TouchEvent && e instanceof TouchEvent) {
    clientY = e.touches[0].clientY;
  } else {
    clientY = (e as MouseEvent).clientY;
  }
  
  const newHeight = window.innerHeight - clientY;
  // Min 100px, Max Window - 100px
  if (newHeight > 100 && newHeight < window.innerHeight - 100) {
    panelHeight.value = newHeight;
  }
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchmove', handleResize);
  document.removeEventListener('touchend', stopResize);
}

function openExportDialog() {
  // Select all courses by default
  exportSelectedCourses.value = new Set(courseGroups.value.map(g => g.name));
  showExportDialog.value = true;
}

function toggleCourseSelection(courseName: string, checked: boolean) {
  if (checked) {
    exportSelectedCourses.value.add(courseName);
  } else {
    exportSelectedCourses.value.delete(courseName);
  }
  // Trigger reactivity
  exportSelectedCourses.value = new Set(exportSelectedCourses.value);
}

function selectAllCourses() {
  exportSelectedCourses.value = new Set(courseGroups.value.map(g => g.name));
}

function deselectAllCourses() {
  exportSelectedCourses.value = new Set();
}

function closeExportDialog() {
  showExportDialog.value = false;
}

function doExport(mode: 'all' | 'selected' | 'individual') {
  let listToExport: EventItem[] = [];
  
  if (mode === 'all') {
    // Filter by selected courses
    const selectedEventIds = new Set<string>();
    for (const group of courseGroups.value) {
      if (exportSelectedCourses.value.has(group.name)) {
        group.eventIds.forEach(id => selectedEventIds.add(id));
      }
    }
    listToExport = events.value.filter(e => selectedEventIds.has(e.id));
    
    if (listToExport.length === 0) {
      closeExportDialog();
      return;
    }
  } else {
    // For both 'selected' and 'individual', we filter by list selection
    const idsToExport = new Set(selectedEventIds.value);
    listToExport = events.value.filter(e => idsToExport.has(e.id));
    
    if (listToExport.length === 0) {
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
    
    <div class="events-panel" :style="{ height: panelHeight + 'px', flex: 'none' }">
       <div class="resize-handle" @mousedown.prevent="startResize" @touchstart.prevent="startResize">
          <div class="handle-bar"></div>
       </div>
       <EventList 
         style="flex: 1; min-height: 0;"
         :date="selectedDate"
         :events="currentSelectedEvents"
         :allEvents="allExpandedEvents"
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
        <div class="course-selection-header">
          <span class="export-desc">Select courses to export:</span>
          <div class="select-actions">
            <md-text-button @click="selectAllCourses">Select All</md-text-button>
            <md-text-button @click="deselectAllCourses">Deselect All</md-text-button>
          </div>
        </div>
        <div class="course-list">
          <div v-for="group in courseGroups" :key="group.name" class="course-item">
            <md-checkbox 
              touch-target="wrapper"
              :checked="exportSelectedCourses.has(group.name)"
              @change="toggleCourseSelection(group.name, $event.target.checked)"
            ></md-checkbox>
            <div class="course-info">
              <span class="course-name">{{ group.name }}</span>
              <span class="course-count">{{ group.count }} events</span>
            </div>
          </div>
          <div v-if="courseGroups.length === 0" class="empty-courses">
            No courses to export
          </div>
        </div>
      </div>
      <div slot="actions" class="export-actions">
        <md-text-button @click="closeExportDialog">Cancel</md-text-button>
        <md-filled-button 
          @click="doExport('all')"
          :disabled="exportSelectedCourses.size === 0"
        >
          Export ({{ exportSelectedCourses.size }} courses)
        </md-filled-button>
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
  overflow-y: auto; /* Allow vertical scrolling */
  overflow-x: hidden;
  min-height: 0;
  user-select: none;
  touch-action: pan-y;
  overscroll-behavior-x: none;
}
.events-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid #ddd;
  background-color: var(--md-sys-color-surface);
}

.resize-handle {
  height: 20px;
  width: 100%;
  cursor: row-resize;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.handle-bar {
  width: 32px;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
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
.export-content {
  padding: 0 24px;
}
.export-desc {
  color: #666;
  font-weight: 500;
}
.course-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.select-actions {
  display: flex;
  gap: 4px;
}
.course-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}
.course-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  border-bottom: 1px solid #eee;
}
.course-item:last-child {
  border-bottom: none;
}
.course-item:hover {
  background-color: #f0f0f0;
}
.course-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.course-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.course-count {
  font-size: 0.85rem;
  color: #666;
}
.empty-courses {
  padding: 32px;
  text-align: center;
  color: #888;
  font-style: italic;
}
</style>
