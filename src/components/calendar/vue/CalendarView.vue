<script setup lang="ts">
import { useCalendarView } from '../ts/CalendarView';
import { getEventColorCached } from '../../../utils/colors';
import type { ExpandedEvent, EventItem } from '../../../types';
import EventList from '../../events/vue/EventList.vue';
import MonthGrid from './MonthGrid.vue';
import WeekGrid from './WeekGrid.vue';
import DayGrid from './DayGrid.vue';

const {
  viewMode,
  today,
  selectedDate,
  monthGrid,
  eventsByDate,
  currentSelectedEvents,
  allExpandedEvents,
  weekStartDate,
  dayDate,
  headerTitle,
  showExportDialog,
  exportSelectedCourses,
  exportMode,
  courseGroups,
  panelHeight,
  isFullScreen,
  selectedEvent,
  showEventPopup,
  prev,
  next,
  goToday,
  selectDate,
  startResize,
  toggleFullScreen,
  openEventPopup,
  closeEventPopup,
  openExportDialog,
  closeExportDialog,
  toggleCourseSelection,
  selectAllCourses,
  deselectAllCourses,
  doExport,
  handleEditEvent,
  handleDeleteEvent,
  handleSelectionChange,
  handleAddEventClick,
} = useCalendarView();

const emit = defineEmits<{
  (e: 'editEvent', event: EventItem): void;
  (e: 'addEvent', date: string): void;
}>();

function onEditEvent(e: ExpandedEvent) {
  handleEditEvent(e, emit);
}

function onAddEventClick() {
  handleAddEventClick(emit);
}

function formatEventTime(event: ExpandedEvent): string {
  if (event.allDay) return 'All Day';
  let time = event.startTime || '';
  if (event.endTime) time += ` - ${event.endTime}`;
  return time;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatRecurrence(event: ExpandedEvent): string {
  if (event.recurrence.freq === 'NONE') return '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let info = '';
  if (event.recurrence.byWeekday && event.recurrence.byWeekday.length > 0) {
    const dayNames = event.recurrence.byWeekday
      .filter(d => d >= 0 && d <= 6)
      .map(d => days[d])
      .filter((name): name is string => !!name)
      .join(', ');
    info = dayNames ? `Every ${dayNames}` : event.recurrence.freq.toLowerCase();
  } else {
    info = `${event.recurrence.freq.toLowerCase()}`;
  }
  if (event.recurrence.until) {
    info += ` until ${event.recurrence.until}`;
  }
  return info;
}

function getPopupColor() {
  if (!selectedEvent.value) return {};
  const color = getEventColorCached(selectedEvent.value.title);
  return {
    '--popup-accent': color.accent,
    '--popup-bg': color.bg,
    '--popup-text': color.text,
  };
}
</script>

<template>
  <div class="calendar-view">
    <div class="header">
      <div class="header-left">
        <span class="title-text">{{ headerTitle }}</span>
      </div>
      <div class="header-center">
        <div class="view-toggle">
          <component :is="viewMode === 'month' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'month'">Month</component>
          <component :is="viewMode === 'week' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'week'">Week</component>
          <component :is="viewMode === 'day' ? 'md-filled-tonal-button' : 'md-text-button'" @click="viewMode = 'day'">Day</component>
        </div>
      </div>
      <div class="header-right">
        <div class="nav-controls">
          <md-icon-button @click="prev"><md-icon>chevron_left</md-icon></md-icon-button>
          <md-filled-tonal-button @click="goToday">Today</md-filled-tonal-button>
          <md-icon-button @click="next"><md-icon>chevron_right</md-icon></md-icon-button>
        </div>
      </div>
    </div>
    
    <div 
      v-show="!isFullScreen"
      class="view-container"
    >
      <MonthGrid 
        v-if="viewMode === 'month'"
        :grid="monthGrid"
        :today="today"
        :selectedDate="selectedDate"
        :eventsByDate="eventsByDate"
        @selectDate="selectDate"
        @eventClick="openEventPopup"
      />
      <WeekGrid 
        v-else-if="viewMode === 'week'"
        :startDate="weekStartDate"
        :selectedDate="selectedDate"
        :today="today"
        :eventsByDate="eventsByDate"
        @selectDate="selectDate"
        @eventClick="openEventPopup"
      />
      <DayGrid 
        v-else
        :date="dayDate"
        :events="eventsByDate[dayDate] || []"
        @eventClick="openEventPopup"
      />
    </div>
    
    <div 
      class="events-panel" 
      :class="{ 'fullscreen': isFullScreen }"
      :style="isFullScreen ? {} : { height: panelHeight + 'px', flex: 'none' }"
    >
      <div 
        class="resize-handle"
        @mousedown.prevent="startResize" 
        @touchstart.prevent="startResize"
        @dblclick="toggleFullScreen"
      >
        <div class="handle-bar"></div>
      </div>
      <EventList 
        style="flex: 1; min-height: 0;"
        :date="selectedDate"
        :events="currentSelectedEvents"
        :allEvents="allExpandedEvents"
        @edit="onEditEvent"
        @delete="handleDeleteEvent"
        @selection-change="handleSelectionChange"
        @export="openExportDialog"
        @add="onAddEventClick"
      />
    </div>
    
    <!-- Export Dialog - Fullscreen -->
    <Transition name="export-fade">
      <div v-if="showExportDialog" class="export-overlay" @click.self="closeExportDialog">
        <div class="export-dialog-fullscreen">
          <div class="export-header">
            <h2 class="export-title">Export Events</h2>
            <md-icon-button @click="closeExportDialog">
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>
          
          <div class="export-body">
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
            
            <div class="export-mode-section">
              <span class="export-desc">Export format:</span>
              <div class="export-mode-options">
                <label class="export-mode-option" :class="{ active: exportMode === 'single' }">
                  <input 
                    type="radio" 
                    name="exportMode" 
                    value="single" 
                    :checked="exportMode === 'single'"
                    @change="exportMode = 'single'"
                  />
                  <md-icon>description</md-icon>
                  <div class="option-text">
                    <span class="option-title">Single File</span>
                    <span class="option-desc">All events in one .ics file</span>
                  </div>
                </label>
                <label class="export-mode-option" :class="{ active: exportMode === 'individual' }">
                  <input 
                    type="radio" 
                    name="exportMode" 
                    value="individual" 
                    :checked="exportMode === 'individual'"
                    @change="exportMode = 'individual'"
                  />
                  <md-icon>folder_zip</md-icon>
                  <div class="option-text">
                <span class="option-title">Individual Files</span>
                <span class="option-desc">One .ics per course in a .zip</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div class="export-footer">
            <md-text-button @click="closeExportDialog">Cancel</md-text-button>
            <md-filled-button 
              @click="doExport"
              :disabled="exportSelectedCourses.size === 0"
            >
              Export ({{ exportSelectedCourses.size }} courses)
            </md-filled-button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Event Detail Popup -->
    <Transition name="popup-fade">
      <div v-if="showEventPopup" class="popup-overlay" @click.self="closeEventPopup">
        <div class="event-popup-card" :style="getPopupColor()">
          <div class="popup-header">
            <div class="popup-color-bar"></div>
            <h2 class="popup-title">{{ selectedEvent?.title }}</h2>
            <md-icon-button class="popup-close-btn" @click="closeEventPopup">
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>
          
          <div class="popup-body" v-if="selectedEvent">
            <div class="popup-info-section">
              <div class="popup-info-row">
                <div class="popup-icon-wrapper">
                  <md-icon>calendar_today</md-icon>
                </div>
                <div class="popup-info-content">
                  <span class="popup-info-label">Date</span>
                  <span class="popup-info-value">{{ formatDisplayDate(selectedEvent.instanceDate) }}</span>
                </div>
              </div>
              
              <div class="popup-info-row">
                <div class="popup-icon-wrapper">
                  <md-icon>schedule</md-icon>
                </div>
                <div class="popup-info-content">
                  <span class="popup-info-label">Time</span>
                  <span class="popup-info-value">{{ formatEventTime(selectedEvent) }}</span>
                </div>
              </div>
              
              <div v-if="selectedEvent.location" class="popup-info-row">
                <div class="popup-icon-wrapper">
                  <md-icon>place</md-icon>
                </div>
                <div class="popup-info-content">
                  <span class="popup-info-label">Location</span>
                  <span class="popup-info-value">{{ selectedEvent.location }}</span>
                </div>
              </div>
              
              <div v-if="selectedEvent.recurrence.freq !== 'NONE'" class="popup-info-row">
                <div class="popup-icon-wrapper">
                  <md-icon>repeat</md-icon>
                </div>
                <div class="popup-info-content">
                  <span class="popup-info-label">Repeats</span>
                  <span class="popup-info-value">{{ formatRecurrence(selectedEvent) }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="selectedEvent.description" class="popup-description-section">
              <div class="popup-description-title">Details</div>
              <div class="popup-description">{{ selectedEvent.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style src="../css/CalendarView.css" scoped></style>
