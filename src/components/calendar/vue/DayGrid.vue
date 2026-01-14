<script setup lang="ts">
import { computed } from 'vue';
import { useDayGrid, TIME_SLOTS } from '../ts/DayGrid';
import type { ExpandedEvent } from '../../../types';

const props = defineProps<{
  date: string;
  events: ExpandedEvent[];
}>();

const emit = defineEmits<{
  (e: 'eventClick', event: ExpandedEvent): void;
}>();

const { getEventStyle, getAllDayEventStyle, allDayEvents, timedEvents } = useDayGrid(props);

function onEventClick(evt: ExpandedEvent) {
  emit('eventClick', evt);
}

// Parse date string as local date to avoid timezone issues
const displayDate = computed(() => {
  const [y, m, d] = props.date.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return '';
  const localDate = new Date(y, m - 1, d);
  return localDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' });
});
</script>

<template>
  <div class="day-grid-container">
    <div class="day-header">
      <div class="day-title">
        {{ displayDate }}
      </div>
    </div>
    
    <div class="day-body-scroll">
      <!-- All Day Row -->
      <div class="all-day-row" v-if="allDayEvents.length > 0">
        <div class="time-col">All Day</div>
        <div class="day-col">
          <div 
            v-for="evt in allDayEvents"
            :key="evt.id"
            class="event-chip all-day clickable"
            :style="getAllDayEventStyle(evt)"
            @click="onEventClick(evt)"
          >
            {{ evt.title }}
          </div>
        </div>
      </div>
      
      <!-- Time Grid -->
      <div class="time-grid-container">
        <div class="time-labels-col">
          <div v-for="h in TIME_SLOTS" :key="h" class="time-label">
            <span v-if="h !== 0">{{ h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM' }}</span>
          </div>
        </div>
        
        <div class="day-content-col">
          <div v-for="h in TIME_SLOTS" :key="h" class="grid-line" :style="{ top: (h * 60) + 'px' }"></div>
          
          <div 
            v-for="evt in timedEvents"
            :key="evt.id + '_' + evt.startTime"
            class="event-block clickable"
            :style="getEventStyle(evt)"
            @click="onEventClick(evt)"
          >
            <div class="event-time-text">{{ evt.startTime }} - {{ evt.endTime || '' }}</div>
            <div class="event-title-text">{{ evt.title }}</div>
            <div v-if="evt.location" class="event-loc-text">{{ evt.location }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../css/DayGrid.css" scoped></style>
