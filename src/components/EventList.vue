<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { ExpandedEvent } from '../types';
import { formatTime } from '../utils/date';

const props = defineProps<{
  date: string | null;
  events: ExpandedEvent[];
  allEvents: ExpandedEvent[];
}>();

const emit = defineEmits<{
  (e: 'edit', event: ExpandedEvent): void;
  (e: 'delete', event: ExpandedEvent): void;
  (e: 'selection-change', selectedIds: string[]): void;
  (e: 'export'): void;
  (e: 'add'): void;
}>();

const selectedIds = ref<Set<string>>(new Set());

// Deduplicate events by originalEventId (show recurring events only once)
const uniqueEvents = computed(() => {
  const seen = new Set<string>();
  const result: ExpandedEvent[] = [];
  
  for (const evt of props.allEvents) {
    if (!seen.has(evt.originalEventId)) {
      seen.add(evt.originalEventId);
      result.push(evt);
    }
  }
  
  return result;
});

// Group events by course/title
const groupedEvents = computed(() => {
  const groups: Record<string, ExpandedEvent[]> = {};
  
  for (const evt of uniqueEvents.value) {
    // Extract base title: "Course (Type)" -> "Course"
    const match = evt.title.match(/^(.*?)\s*\([^)]+\)$/);
    const baseTitle = match && match[1] ? match[1].trim() : evt.title;
    
    if (!groups[baseTitle]) {
      groups[baseTitle] = [];
    }
    groups[baseTitle].push(evt);
  }

  // Sort groups alphabetically
  return Object.entries(groups)
    .map(([title, items]) => ({ title, items }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

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
</script>

<template>
  <div class="event-list-container">
    <div class="list-header">
      <div class="date-title">
        All Events ({{ uniqueEvents.length }})
      </div>
      <md-outlined-button @click="emit('add')" class="add-btn">
         <md-icon slot="icon">add</md-icon>
         <span class="btn-text">Add</span>
      </md-outlined-button>
      <md-outlined-button @click="emit('export')" class="export-btn">
         <md-icon slot="icon">download</md-icon>
         <span class="btn-text">Export</span>
      </md-outlined-button>
    </div>

    <div class="list-content">
      <div v-if="uniqueEvents.length === 0" class="empty-state">
        No events imported
      </div>
      
      <div v-for="group in groupedEvents" :key="group.title" class="event-group">
        <div class="group-header">{{ group.title }}</div>
        
        <div v-for="evt in group.items" :key="evt.originalEventId" class="event-row">
          <md-checkbox 
            touch-target="wrapper"
            :checked="selectedIds.has(evt.originalEventId)"
            @change="toggleSelection(evt.originalEventId, $event.target.checked)"
          ></md-checkbox>
          
          <div class="event-details">
             <div class="event-time">
               <span v-if="evt.allDay">All Day</span>
               <span v-else>{{ formatTime(evt.startTime) }}<span v-if="evt.endTime"> - {{ formatTime(evt.endTime) }}</span></span>
             </div>
             <div class="event-title-row">
               <span class="event-title">{{ evt.title }}</span>
               <md-icon v-if="evt.recurrence.freq !== 'NONE'" class="recurrence-icon">repeat</md-icon>
             </div>
             <div v-if="evt.recurrence.freq !== 'NONE'" class="event-recurrence">
               <md-icon class="info-icon">repeat</md-icon> {{ getRecurrenceInfo(evt) }}
             </div>
             <div v-if="evt.location" class="event-location">
               <md-icon class="info-icon">place</md-icon> {{ evt.location }}
             </div>
             <div v-if="evt.description" class="event-desc">{{ evt.description }}</div>
          </div>
  
          <div class="event-actions">
             <md-icon-button @click="onEdit(evt)"><md-icon>edit</md-icon></md-icon-button>
             <md-icon-button @click="onDelete(evt)"><md-icon>delete</md-icon></md-icon-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--md-sys-color-surface-container-low, #fcfcfc);
  border-top: 1px solid #e0e0e0;
}
.list-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 8px;
}
.date-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface, #1d1b20);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}
.event-group {
  margin-bottom: 16px;
}
.group-header {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--md-sys-color-primary, #6200ee);
  background-color: var(--md-sys-color-surface-container, #f0f0f0);
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.event-row {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
  margin-left: 8px;
}
.event-row:last-child {
  border-bottom: none;
}
.event-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.event-time {
  font-size: 0.85rem;
  color: #666;
}
.event-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.event-title {
  font-weight: 500;
  font-size: 1rem;
}
.recurrence-icon {
  font-size: 16px;
  color: #666;
}
.event-recurrence {
  font-size: 0.85rem;
  color: var(--md-sys-color-primary, #6200ee);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.event-desc {
  font-size: 0.9rem;
  color: #555;
  margin-top: 4px;
}
.event-location {
  font-size: 0.85rem;
  color: #666;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.info-icon {
  font-size: 16px;
  --md-icon-size: 16px;
}
.event-actions {
  display: flex;
}
.empty-state {
  padding: 32px;
  text-align: center;
  color: #888;
  font-style: italic;
}
@media (max-width: 600px) {
  .list-header {
    flex-wrap: wrap;
    gap: 8px;
  }
  .btn-text {
    display: none;
  }
  .export-btn, .add-btn {
    min-width: 48px;
  }
}
</style>
