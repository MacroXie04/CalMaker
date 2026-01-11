<script setup lang="ts">
import { computed } from 'vue';
import type { ExpandedEvent } from '../types';
import { WEEKDAYS, formatDate } from '../utils/date';

const props = defineProps<{
  startDate: string; // YYYY-MM-DD (Sunday)
  selectedDate: string | null;
  today: string;
  eventsByDate: Record<string, ExpandedEvent[]>;
}>();

const emit = defineEmits<{
  (e: 'selectDate', date: string): void;
}>();

const weekDates = computed(() => {
  const dates = [];
  // Fix parsing manually to be safe
  const [y, m, d] = props.startDate.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return []; // Safety check
  const cursor = new Date(y, m - 1, d);

  for (let i = 0; i < 7; i++) {
    const dStr = formatDate(cursor);
    dates.push({
      date: dStr,
      dayName: WEEKDAYS[i],
      dayNum: cursor.getDate()
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
});

// Time slots: 0 to 23
const timeSlots = Array.from({ length: 24 }, (_, i) => i);

function getEventStyle(evt: ExpandedEvent) {
  // Simple vertical positioning
  if (evt.allDay || !evt.startTime) return {}; // Handled separately
  
  const [h, m] = evt.startTime.split(':').map(Number);
  const startMin = (h || 0) * 60 + (m || 0);
  let endMin = startMin + 60; // Default 1h
  if (evt.endTime) {
      const [eh, em] = evt.endTime.split(':').map(Number);
      endMin = (eh || 0) * 60 + (em || 0);
  }
  const duration = Math.max(endMin - startMin, 15); // Min 15m
  
  // 1 hour = 50px height
  const top = (startMin / 60) * 50;
  const height = (duration / 60) * 50;
  
  return {
    top: `${top}px`,
    height: `${height}px`
  };
}

function selectDay(date: string) {
    emit('selectDate', date);
}
</script>

<template>
  <div class="week-grid-container">
     <div class="week-header">
       <div class="time-col-header"></div>
       <div 
         v-for="day in weekDates" 
         :key="day.date" 
         class="day-header"
         :class="{ 'today': day.date === today, 'selected': day.date === selectedDate }"
         @click="selectDay(day.date)"
       >
         <div class="day-name">{{ day.dayName }}</div>
         <div class="day-num">{{ day.dayNum }}</div>
       </div>
     </div>
     
     <div class="week-body-scroll">
       <!-- All Day Row -->
       <div class="all-day-row">
          <div class="time-col">All Day</div>
          <div v-for="day in weekDates" :key="day.date" class="day-col" @click="selectDay(day.date)">
             <div 
               v-for="evt in (eventsByDate[day.date] || []).filter(e => e.allDay)"
               :key="evt.id"
               class="event-chip all-day"
             >
               {{ evt.title }}
             </div>
          </div>
       </div>
       
       <!-- Time Grid -->
       <div class="time-grid-container">
         <div class="time-labels-col">
            <div v-for="h in timeSlots" :key="h" class="time-label">
              <span v-if="h !== 0">{{ h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM' }}</span>
            </div>
         </div>
         
         <div class="day-cols-container">
           <!-- Grid Lines -->
           <div v-for="h in timeSlots" :key="h" class="grid-line" :style="{ top: (h * 50) + 'px' }"></div>
           
           <div v-for="day in weekDates" :key="day.date" class="day-col-time" @click="selectDay(day.date)">
              <div 
                v-for="evt in (eventsByDate[day.date] || []).filter(e => !e.allDay)"
                :key="evt.id + '_' + evt.startTime"
                class="event-block"
                :style="getEventStyle(evt)"
              >
                {{ evt.title }}
              </div>
           </div>
         </div>
       </div>
     </div>
  </div>
</template>

<style scoped>
.week-grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}
.week-header {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.time-col-header {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
}
.day-header {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-right: 1px solid #e0e0e0;
  cursor: pointer;
}
.day-header:hover {
  background-color: #f5f5f5;
}
.day-header.today .day-num {
  background-color: #1a73e8;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.day-header.selected {
  background-color: #e3f2fd;
}
.day-name {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
}
.day-num {
  font-size: 1.1rem;
  margin-top: 4px;
}
.week-body-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.all-day-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  min-height: 40px;
  background-color: white;
  position: relative;
  z-index: 2;
}
.time-col {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  font-size: 0.75rem;
  color: #666;
  padding: 8px 8px 0 0;
  text-align: right;
}
.day-col {
  flex: 1;
  border-right: 1px solid #e0e0e0;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.event-chip.all-day {
  background-color: #c2e7ff;
  color: #001d35;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.time-grid-container {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 1200px; /* 24 * 50px */
}
.time-labels-col {
  width: 60px;
  border-right: 1px solid #e0e0e0;
  position: relative;
  background: white;
  z-index: 1;
}
.time-label {
  height: 50px;
  text-align: right;
  padding-right: 8px;
  font-size: 0.75rem;
  color: #666;
  transform: translateY(-8px); /* Center label on line */
}
.day-cols-container {
  flex: 1;
  display: flex;
  position: relative;
}
.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #f0f0f0;
  height: 1px;
  pointer-events: none;
}
.day-col-time {
  flex: 1;
  border-right: 1px solid #e0e0e0;
  position: relative;
  cursor: pointer;
}
.day-col-time:hover {
  background-color: #fafafa;
}
.event-block {
  position: absolute;
  left: 2px;
  right: 2px;
  background-color: #e3e3e3;
  color: #333;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.75rem;
  overflow: hidden;
  border-left: 3px solid #666;
  z-index: 2;
  opacity: 0.9;
}
</style>
