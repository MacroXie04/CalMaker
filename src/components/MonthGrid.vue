<script setup lang="ts">
import type { ExpandedEvent } from '../types';
import { WEEKDAYS } from '../utils/date';

// Re-defining CalendarDay interface locally if needed, but we can import if we export it from date.ts
// Assuming it is exported from utils/date based on previous file content.
// Wait, I saw it in date.ts content.

// We need to import ExpandedEvent type.
// But CalendarDay is defined in date.ts? Yes.

const props = defineProps<{
  grid: { date: string; isCurrentMonth: boolean; dayNum: number }[];
  today: string;
  selectedDate: string | null;
  eventsByDate: Record<string, ExpandedEvent[]>;
}>();

const emit = defineEmits<{
  (e: 'selectDate', date: string): void;
}>();
</script>

<template>
  <div class="grid-container">
      <div class="grid-header">
         <div v-for="d in WEEKDAYS" :key="d" class="weekday-label">{{ d }}</div>
      </div>
      
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
             <!-- Show compact dots or lines for events -->
             <div 
               v-for="evt in (eventsByDate[cell.date] || []).slice(0, 3)" 
               :key="evt.id + '_' + evt.instanceDate"
               class="event-chip"
               :class="{ 'all-day': evt.allDay }"
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
</template>

<style scoped>
.grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 600px; /* Ensure enough scrollable area */
}
.grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e0e0e0;
}
.weekday-label {
  text-align: center;
  padding: 8px 4px;
  font-weight: 500;
  font-size: 0.85rem;
  color: #666;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* Ensure rows have a minimum height so they don't squash too much, enabling scrolling */
  grid-template-rows: repeat(6, minmax(100px, 1fr));
  flex: 1;
  border-left: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
}
.cell {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
}
.cell:hover {
  background-color: #f5f5f5;
}
.cell.other-month {
  background-color: #fafafa;
  color: #999;
}
.cell.selected {
  background-color: #e3f2fd;
}
.cell.today .day-number {
    background-color: #1a73e8;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.day-number {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.event-chip {
  background-color: #e3e3e3;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}
.event-chip.all-day {
  background-color: #c2e7ff;
  color: #001d35;
}
.more-label {
  font-size: 0.75rem;
  color: #666;
  padding-left: 4px;
}
@media (max-width: 600px) {
    .grid {
        grid-template-rows: repeat(6, minmax(50px, 1fr));
    }
}
</style>
