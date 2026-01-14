<script setup lang="ts">
import { useEventList, formatTime, getEventColorCached } from '../ts/EventList';
import type { ExpandedEvent } from '../../../types';

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

const {
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
} = useEventList(props, emit);

function getGroupColor(title: string) {
  return getEventColorCached(title);
}
</script>

<template>
  <div class="event-list-container">
    <div class="list-header">
      <div class="header-left">
        <div class="date-title">
          {{ showAllEvents ? 'All Events' : (date || 'Selected Date') }}
          <span class="event-count">({{ uniqueEvents.length }})</span>
        </div>
      </div>
      <div class="header-center">
        <md-filter-chip 
          :selected="showAllEvents"
          @click="showAllEvents ? null : toggleViewMode()"
        >
          All ({{ allEventsCount }})
        </md-filter-chip>
        <md-filter-chip 
          :selected="!showAllEvents"
          @click="showAllEvents ? toggleViewMode() : null"
          :disabled="!date"
        >
          {{ date || 'Select date' }} ({{ dateEventCount }})
        </md-filter-chip>
      </div>
      <div class="header-right">
        <md-outlined-button @click="emit('add')" class="add-btn">
          <md-icon slot="icon">add</md-icon>
          <span class="btn-text">Add</span>
        </md-outlined-button>
        <md-outlined-button @click="emit('export')" class="export-btn">
          <md-icon slot="icon">download</md-icon>
          <span class="btn-text">Export</span>
        </md-outlined-button>
      </div>
    </div>

    <div class="list-content">
      <div v-if="uniqueEvents.length === 0" class="empty-state">
        No events imported
      </div>
      
      <div v-for="group in groupedEvents" :key="group.title" class="event-group">
        <div 
          class="group-header"
          :style="{ 
            backgroundColor: getGroupColor(group.title).bg,
            color: getGroupColor(group.title).text,
            borderLeft: `4px solid ${getGroupColor(group.title).accent}`
          }"
        >
          {{ group.title }}
        </div>
        
        <div 
          v-for="evt in group.items" 
          :key="evt.originalEventId" 
          class="event-row"
          :style="{ borderLeftColor: getGroupColor(evt.title).accent }"
        >
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
            <div 
              v-if="evt.recurrence.freq !== 'NONE'" 
              class="event-recurrence"
              :style="{ color: getGroupColor(evt.title).accent }"
            >
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

<style src="../css/EventList.css" scoped></style>
