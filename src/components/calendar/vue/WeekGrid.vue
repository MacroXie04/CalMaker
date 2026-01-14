<script setup lang="ts">
import { useWeekGrid, TIME_SLOTS } from '../ts/WeekGrid';
import type { ExpandedEvent } from '../../../types';

const props = defineProps<{
  startDate: string;
  selectedDate: string | null;
  today: string;
  eventsByDate: Record<string, ExpandedEvent[]>;
}>();

const emit = defineEmits<{
  (e: 'selectDate', date: string): void;
  (e: 'eventClick', event: ExpandedEvent): void;
}>();

function onEventClick(evt: ExpandedEvent, e: Event) {
  e.stopPropagation();
  emit('eventClick', evt);
}

const { weekDates, getEventStyle, getAllDayEventStyle } = useWeekGrid(props);

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
            class="event-chip all-day clickable"
            :style="getAllDayEventStyle(evt)"
            @click="onEventClick(evt, $event)"
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
        
        <div class="day-cols-container">
          <!-- Grid Lines -->
          <div v-for="h in TIME_SLOTS" :key="h" class="grid-line" :style="{ top: (h * 50) + 'px' }"></div>
          
          <div v-for="day in weekDates" :key="day.date" class="day-col-time" @click="selectDay(day.date)">
            <div 
              v-for="evt in (eventsByDate[day.date] || []).filter(e => !e.allDay)"
              :key="evt.id + '_' + evt.startTime"
              class="event-block clickable"
              :style="getEventStyle(evt)"
              @click="onEventClick(evt, $event)"
            >
              {{ evt.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../css/WeekGrid.css" scoped></style>
