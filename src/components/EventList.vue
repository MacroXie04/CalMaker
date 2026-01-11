<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ExpandedEvent } from '../types';
import { formatTime } from '../utils/date';

const props = defineProps<{
  date: string | null;
  events: ExpandedEvent[];
}>();

const emit = defineEmits<{
  (e: 'edit', event: ExpandedEvent): void;
  (e: 'delete', event: ExpandedEvent): void;
  (e: 'selection-change', selectedIds: string[]): void;
  (e: 'export'): void;
  (e: 'add'): void;
}>();

const selectedIds = ref<Set<string>>(new Set());

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
</script>

<template>
  <div class="event-list-container">
    <div class="list-header">
      <div class="date-title">
        All Events
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
      <div v-if="!date" class="empty-state">Select a day to view events</div>
      <div v-else-if="events.length === 0" class="empty-state">No events for this day</div>
      
      <div v-for="evt in events" :key="evt.id + '_' + evt.instanceDate" class="event-row">
        <md-checkbox 
          touch-target="wrapper"
          :checked="selectedIds.has(evt.id)"
          @change="toggleSelection(evt.id, $event.target.checked)"
        ></md-checkbox>
        
        <div class="event-details">
           <div class="event-time">
             <span v-if="evt.allDay">All Day</span>
             <span v-else>{{ formatTime(evt.startTime) }}</span>
           </div>
           <div class="event-title-row">
             <span class="event-title">{{ evt.title }}</span>
             <md-icon v-if="evt.recurrence.freq !== 'NONE'" class="recurrence-icon">repeat</md-icon>
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
  gap: 8px; /* Use gap for spacing */
}
.date-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface, #1d1b20);
  margin-right: auto; /* Push buttons to the right */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1; /* Allow taking available space */
}
.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}
.event-row {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
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
.event-desc {
  font-size: 0.9rem;
  color: #555;
  margin-top: 4px;
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
