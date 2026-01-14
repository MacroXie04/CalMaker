<script setup lang="ts">
import { WEEKDAYS, getEventColorCached } from '../ts/MonthGrid';
import type { ExpandedEvent } from '../../../types';

defineProps<{
  grid: { date: string; isCurrentMonth: boolean; dayNum: number }[];
  today: string;
  selectedDate: string | null;
  eventsByDate: Record<string, ExpandedEvent[]>;
}>();

const emit = defineEmits<{
  (e: 'selectDate', date: string): void;
  (e: 'eventClick', event: ExpandedEvent): void;
}>();

function getEventStyle(evt: ExpandedEvent) {
  const color = getEventColorCached(evt.title);
  return {
    backgroundColor: color.bg,
    color: color.text,
    borderLeft: `3px solid ${color.accent}`,
  };
}

function onEventClick(evt: ExpandedEvent, e: Event) {
  e.stopPropagation();
  emit('eventClick', evt);
}
</script>

<template>
  <div class="grid-container">
    <div class="grid-header">
      <div v-for="d in WEEKDAYS" :key="d" class="weekday-label">{{ d }}</div>
    </div>
    
    <div class="grid-scroll-wrapper">
      <div class="grid">
        <div 
          v-for="cell in grid" 
          :key="cell.date" 
          class="cell" 
          :class="{ 
            'other-month': !cell.isCurrentMonth,
            'today': cell.date === today,
            'selected': cell.date === selectedDate
          }"
          @click="emit('selectDate', cell.date)"
        >
          <div class="day-number">{{ cell.dayNum }}</div>
          <div class="cell-events">
            <div 
              v-for="evt in (eventsByDate[cell.date] || []).slice(0, 3)" 
              :key="evt.id + '_' + evt.instanceDate"
              class="event-chip clickable"
              :style="getEventStyle(evt)"
              @click="onEventClick(evt, $event)"
            >
              {{ evt.title }}
            </div>
            <div v-if="(eventsByDate[cell.date] || []).length > 3" class="more-label">
              +{{ (eventsByDate[cell.date] || []).length - 3 }} more
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../css/MonthGrid.css" scoped></style>
