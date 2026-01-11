<script setup lang="ts">
import { computed } from 'vue';
import type { ExpandedEvent } from '../types';

const props = defineProps<{
  date: string; // YYYY-MM-DD
  events: ExpandedEvent[];
}>();

// Time slots: 0 to 23
const timeSlots = Array.from({ length: 24 }, (_, i) => i);

function getEventStyle(evt: ExpandedEvent) {
  if (evt.allDay || !evt.startTime) return {}; 
  
  const [h, m] = evt.startTime.split(':').map(Number);
  const startMin = (h || 0) * 60 + (m || 0);
  let endMin = startMin + 60; // Default 1h
  if (evt.endTime) {
      const [eh, em] = evt.endTime.split(':').map(Number);
      endMin = (eh || 0) * 60 + (em || 0);
  }
  const duration = Math.max(endMin - startMin, 15);
  
  // 1 hour = 60px height (more space for day view)
  const top = (startMin / 60) * 60;
  const height = (duration / 60) * 60;
  
  return {
    top: `${top}px`,
    height: `${height}px`
  };
}

const allDayEvents = computed(() => props.events.filter(e => e.allDay));
const timedEvents = computed(() => props.events.filter(e => !e.allDay));
</script>

<template>
  <div class="day-grid-container">
     <div class="day-header">
         <div class="day-title">
            {{ new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' }) }}
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
         
         <div class="day-content-col">
           <div v-for="h in timeSlots" :key="h" class="grid-line" :style="{ top: (h * 60) + 'px' }"></div>
           
           <div 
              v-for="evt in timedEvents"
              :key="evt.id + '_' + evt.startTime"
              class="event-block"
              :style="getEventStyle(evt)"
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

<style scoped>
.day-grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}
.day-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  text-align: center;
}
.day-title {
  font-size: 1.2rem;
  font-weight: 500;
}
.day-body-scroll {
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
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.event-chip.all-day {
  background-color: #c2e7ff;
  color: #001d35;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
}
.time-grid-container {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 1440px; /* 24 * 60px */
}
.time-labels-col {
  width: 60px;
  border-right: 1px solid #e0e0e0;
  position: relative;
  background: white;
  z-index: 1;
}
.time-label {
  height: 60px;
  text-align: right;
  padding-right: 8px;
  font-size: 0.75rem;
  color: #666;
  transform: translateY(-8px);
}
.day-content-col {
  flex: 1;
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
.event-block {
  position: absolute;
  left: 8px;
  right: 8px;
  background-color: #e3e3e3;
  color: #333;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
  overflow: hidden;
  border-left: 4px solid #666;
  z-index: 2;
  opacity: 0.95;
  display: flex;
  flex-direction: column;
}
.event-time-text {
  font-size: 0.75rem;
  color: #555;
}
.event-title-text {
  font-weight: 500;
}
.event-loc-text {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}
</style>
