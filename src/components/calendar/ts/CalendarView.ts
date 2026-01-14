import { ref, computed, onMounted } from 'vue';
import { useEvents } from '../../../composables/useEvents';
import { generateMonthGrid, getToday, formatDate, getWeekStart, addDays } from '../../../utils/date';
import { expandRecurringEvents } from '../../../utils/recurrence';
import { generateICS } from '../../../utils/ics';
import type { ExpandedEvent, EventItem } from '../../../types';
import JSZip from 'jszip';

export function useCalendarView() {
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
    Object.keys(map).forEach(k => {
      map[k]!.sort((a, b) => {
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
    
    const eventsForDate = eventsByDate.value[selectedDate.value] || [];
    return eventsForDate.slice().sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return 0;
    });
  });

  const allExpandedEvents = computed(() => {
    if (events.value.length === 0) return [];
    
    let minDate = '9999-12-31';
    let maxDate = '0000-01-01';
    
    for (const evt of events.value) {
      if (evt.date < minDate) minDate = evt.date;
      const endDate = evt.recurrence.until || evt.date;
      if (endDate > maxDate) maxDate = endDate;
      if (evt.date > maxDate) maxDate = evt.date;
    }
    
    const allExpanded = expandRecurringEvents(events.value, minDate, maxDate);
    
    return allExpanded.sort((a, b) => {
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

  // Event Detail Popup
  const selectedEvent = ref<ExpandedEvent | null>(null);
  const showEventPopup = ref(false);

  function openEventPopup(event: ExpandedEvent) {
    selectedEvent.value = event;
    showEventPopup.value = true;
  }

  function closeEventPopup() {
    showEventPopup.value = false;
    selectedEvent.value = null;
  }

  // Export Logic
  const showExportDialog = ref(false);
  const exportSelectedCourses = ref<Set<string>>(new Set());
  const exportMode = ref<'single' | 'individual'>('single');

  const courseGroups = computed(() => {
    const groups: Record<string, EventItem[]> = {};
    
    for (const evt of events.value) {
      const match = evt.title.match(/^(.*?)\s*\([^)]+\)$/);
      const baseTitle = match && match[1] ? match[1].trim() : evt.title;
      
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
  const isFullScreen = ref(false);
  const savedPanelHeight = ref(300);

  function startResize(_e: MouseEvent | TouchEvent) {
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
      const touch = e.touches[0];
      if (!touch) return;
      clientY = touch.clientY;
    } else {
      clientY = (e as MouseEvent).clientY;
    }
    
    const newHeight = window.innerHeight - clientY;
    
    // If dragged to top (clientY < 80), enter fullscreen
    if (clientY < 80) {
      if (!isFullScreen.value) {
        savedPanelHeight.value = panelHeight.value;
        isFullScreen.value = true;
      }
      return;
    }
    
    // If in fullscreen and dragged down, exit fullscreen
    if (isFullScreen.value && clientY > 100) {
      isFullScreen.value = false;
      panelHeight.value = window.innerHeight - clientY;
      return;
    }
    
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

  function toggleFullScreen() {
    if (isFullScreen.value) {
      // Exit fullscreen: restore saved height
      isFullScreen.value = false;
      panelHeight.value = savedPanelHeight.value;
    } else {
      // Enter fullscreen: save current height
      savedPanelHeight.value = panelHeight.value;
      isFullScreen.value = true;
    }
  }

  function openExportDialog() {
    exportSelectedCourses.value = new Set(courseGroups.value.map(g => g.name));
    showExportDialog.value = true;
  }

  function toggleCourseSelection(courseName: string, checked: boolean) {
    if (checked) {
      exportSelectedCourses.value.add(courseName);
    } else {
      exportSelectedCourses.value.delete(courseName);
    }
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

  function doExport() {
    const selectedIds = new Set<string>();
    for (const group of courseGroups.value) {
      if (exportSelectedCourses.value.has(group.name)) {
        group.eventIds.forEach(id => selectedIds.add(id));
      }
    }
    const listToExport = events.value.filter(e => selectedIds.has(e.id));
    
    if (listToExport.length === 0) {
      closeExportDialog();
      return;
    }

    const safeTitle = headerTitle.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (exportMode.value === 'individual') {
      // Export each course/event group as a separate ICS file in a ZIP
      const zip = new JSZip();
      
      // Group events by course name (base title without parenthetical info)
      const eventsByGroup: Record<string, EventItem[]> = {};
      for (const event of listToExport) {
        // Extract base title (e.g., "Computer Organization" from "Computer Organization (Lecture)")
        const match = event.title.match(/^(.*?)\s*\([^)]+\)$/);
        const groupName = match && match[1] ? match[1].trim() : event.title;
        
        if (!eventsByGroup[groupName]) {
          eventsByGroup[groupName] = [];
        }
        eventsByGroup[groupName].push(event);
      }
      
      // Create one ICS file per course group
      for (const [groupName, groupEvents] of Object.entries(eventsByGroup)) {
        const ics = generateICS(groupEvents);
        const safeGroupName = groupName.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const fileName = `${safeGroupName}.ics`;
        zip.file(fileName, ics);
      }
      
      zip.generateAsync({ type: 'blob' }).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CalMaker_Export_${safeTitle}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
      
    } else {
      // Export all events into a single ICS file
      const icsContent = generateICS(listToExport);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CalMaker_All_${safeTitle}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    closeExportDialog();
  }

  function handleEditEvent(e: ExpandedEvent, emit: (event: 'editEvent', payload: EventItem) => void) {
    const original = events.value.find(ev => ev.id === e.originalEventId);
    if (original) emit('editEvent', original);
  }

  function handleDeleteEvent(e: ExpandedEvent) {
    deleteEvent(e.originalEventId);
  }

  function handleSelectionChange(ids: string[]) {
    selectedEventIds.value = ids;
  }

  function handleAddEventClick(emit: (event: 'addEvent', payload: string) => void) {
    if (selectedDate.value) {
      emit('addEvent', selectedDate.value);
    } else {
      emit('addEvent', getToday());
    }
  }

  onMounted(() => {
    load();
  });

  return {
    // State
    viewMode,
    currentDate,
    today,
    selectedDate,
    selectedEventIds,
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
    
    // Navigation
    prev,
    next,
    goToday,
    selectDate,
    
    // Resize
    startResize,
    toggleFullScreen,
    
    // Event Popup
    openEventPopup,
    closeEventPopup,
    
    // Export
    openExportDialog,
    closeExportDialog,
    toggleCourseSelection,
    selectAllCourses,
    deselectAllCourses,
    doExport,
    
    // Event handlers
    handleEditEvent,
    handleDeleteEvent,
    handleSelectionChange,
    handleAddEventClick,
  };
}
