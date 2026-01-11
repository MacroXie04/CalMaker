<script setup lang="ts">
import { ref, watch } from 'vue';
import type { EventItem, RecurrenceRule } from '../types';
import { useEvents } from '../composables/useEvents';
import { getToday } from '../utils/date';
import { parseUCMHtml } from '../utils/ucmParser';

const props = defineProps<{
  initialDate?: string;
  editEvent?: EventItem;
  isOpen: boolean; 
}>();

const emit = defineEmits(['close', 'saved']);

const { addEvent, updateEvent } = useEvents();

// Form State
const title = ref('');
const date = ref('');
const allDay = ref(true);
const startTime = ref('');
const endTime = ref('');
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
const location = ref('');
const description = ref('');

// Import State
const showImport = ref(false);
const importHtml = ref('');

function toggleImport() {
  showImport.value = !showImport.value;
}

function handleImport() {
  if (!importHtml.value) return;
  const newEvents = parseUCMHtml(importHtml.value);
  if (newEvents.length > 0) {
    newEvents.forEach(evt => addEvent(evt));
    alert(`Imported ${newEvents.length} events!`);
    emit('saved');
    emit('close');
    // Reset
    importHtml.value = '';
    showImport.value = false;
  } else {
    alert('No events found in HTML.');
  }
}


// Recurrence State
const freq = ref<RecurrenceRule['freq']>('NONE');
const interval = ref(1);
const byWeekday = ref<number[]>([]); 
const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const endCondition = ref<'NEVER' | 'UNTIL' | 'COUNT'>('NEVER');
const untilDate = ref('');
const count = ref(1);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.editEvent) {
      loadEvent(props.editEvent);
    } else {
      resetForm();
    }
  }
});

function loadEvent(e: EventItem) {
  title.value = e.title;
  date.value = e.date;
  allDay.value = e.allDay;
  startTime.value = e.startTime || '';
  endTime.value = e.endTime || '';
  timezone.value = e.timezone;
  location.value = e.location || '';
  description.value = e.description || '';
  
  freq.value = e.recurrence.freq;
  interval.value = e.recurrence.interval || 1;
  byWeekday.value = e.recurrence.byWeekday || [];
  
  if (e.recurrence.until) {
    endCondition.value = 'UNTIL';
    untilDate.value = e.recurrence.until;
  } else if (e.recurrence.count) {
    endCondition.value = 'COUNT';
    count.value = e.recurrence.count;
  } else {
    endCondition.value = 'NEVER';
  }
}

function resetForm() {
  title.value = '';
  date.value = props.initialDate || getToday();
  allDay.value = true;
  startTime.value = '';
  endTime.value = '';
  timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  location.value = '';
  description.value = '';
  freq.value = 'NONE';
  interval.value = 1;
  byWeekday.value = [];
  endCondition.value = 'NEVER';
  untilDate.value = '';
  count.value = 1;
}

function save() {
  if (!title.value || !date.value) {
    alert('Title and Date are required');
    return; 
  }
  
  const recurrence: RecurrenceRule = {
    freq: freq.value,
  };
  
  if (freq.value !== 'NONE') {
    recurrence.interval = Number(interval.value);
    if (freq.value === 'WEEKLY' && byWeekday.value.length > 0) {
      recurrence.byWeekday = [...byWeekday.value].sort();
    }
    
    if (endCondition.value === 'UNTIL' && untilDate.value) {
      recurrence.until = untilDate.value;
    } else if (endCondition.value === 'COUNT') {
      recurrence.count = Number(count.value);
    }
  }

  const newItem: EventItem = {
    id: props.editEvent ? props.editEvent.id : crypto.randomUUID(),
    title: title.value,
    date: date.value,
    allDay: allDay.value,
    startTime: !allDay.value ? startTime.value : undefined,
    endTime: !allDay.value ? endTime.value : undefined,
    timezone: timezone.value,
    location: location.value,
    description: description.value,
    recurrence,
    createdAt: props.editEvent ? props.editEvent.createdAt : Date.now()
  };

  if (props.editEvent) {
    updateEvent(newItem);
  } else {
    addEvent(newItem);
  }
  
  emit('saved');
  emit('close');
}

function toggleDay(dIndex: number) {
  const idx = byWeekday.value.indexOf(dIndex);
  if (idx >= 0) {
    byWeekday.value.splice(idx, 1);
  } else {
    byWeekday.value.push(dIndex);
  }
}
</script>

<template>
  <div class="bottom-panel" :class="{ open: isOpen }">
     <div class="panel-header">
       <h3>{{ editEvent ? 'Edit Event' : (showImport ? 'Import Schedule' : 'New Event') }}</h3>
       <div class="header-actions">
         <md-text-button v-if="!editEvent" @click="toggleImport">
            {{ showImport ? 'Back' : 'Import From UC Merced Registration' }}
         </md-text-button>
         <md-icon-button @click="$emit('close')"><md-icon>close</md-icon></md-icon-button>
       </div>
     </div>
     
     <div v-if="showImport" class="panel-content">
       <div class="import-instruction">
         Paste the HTML source from UC Merced Course Registration "Schedule Details" page.
       </div>
       <md-outlined-text-field 
         type="textarea" 
         label="Paste HTML Source" 
         :value="importHtml" 
         @input="importHtml = $event.target.value" 
         rows="10"
         style="width: 100%"
       ></md-outlined-text-field>
       
       <div class="actions">
         <md-filled-button @click="handleImport">Parse & Import</md-filled-button>
         <md-text-button @click="$emit('close')">Cancel</md-text-button>
       </div>
     </div>

     <div v-else class="panel-content">
       <md-outlined-text-field 
         label="Title" 
         :value="title" 
         @input="title = $event.target.value"
         required
       ></md-outlined-text-field>
       
       <div class="row">
         <md-outlined-text-field 
           type="date" 
           label="Date"
           :value="date"
           @input="date = $event.target.value"
         ></md-outlined-text-field>
         
         <div class="switch-wrapper">
           <label>All-day</label>
           <md-switch :selected="allDay" @change="allDay = $event.target.selected"></md-switch>
         </div>
       </div>

       <div class="row" v-if="!allDay">
          <md-outlined-text-field type="time" label="Start" :value="startTime" @input="startTime = $event.target.value"></md-outlined-text-field>
          <md-outlined-text-field type="time" label="End" :value="endTime" @input="endTime = $event.target.value"></md-outlined-text-field>
       </div>

        <md-outlined-text-field 
          label="Timezone" 
          :value="timezone" 
          @input="timezone = $event.target.value"
        ></md-outlined-text-field>
       
       <!-- Recurrence -->
       <md-divider></md-divider>
       <h4>Repeats</h4>
       <div class="row">
         <md-outlined-select label="Frequency" :value="freq" @change="freq = $event.target.value">
           <md-select-option value="NONE"><div slot="headline">Does not repeat</div></md-select-option>
           <md-select-option value="DAILY"><div slot="headline">Daily</div></md-select-option>
           <md-select-option value="WEEKLY"><div slot="headline">Weekly</div></md-select-option>
           <md-select-option value="MONTHLY"><div slot="headline">Monthly</div></md-select-option>
           <md-select-option value="YEARLY"><div slot="headline">Yearly</div></md-select-option>
         </md-outlined-select>
         
         <md-outlined-text-field 
           v-if="freq !== 'NONE'"
           type="number" 
           label="Interval" 
           min="1"
           :value="String(interval)"
           @input="interval = Number($event.target.value)"
         ></md-outlined-text-field>
       </div>
       
       <div v-if="freq === 'WEEKLY'" class="weekdays">
         <md-filter-chip 
           v-for="(d, i) in days" 
           :key="i"
           :label="d"
           :selected="byWeekday.includes(i)"
           @click="toggleDay(i)"
         ></md-filter-chip>
       </div>
       
       <!-- End Condition -->
       <div v-if="freq !== 'NONE'" class="end-condition">
         <md-outlined-select label="Ends" :value="endCondition" @change="endCondition = $event.target.value">
            <md-select-option value="NEVER"><div slot="headline">Never</div></md-select-option>
            <md-select-option value="UNTIL"><div slot="headline">On Date</div></md-select-option>
            <md-select-option value="COUNT"><div slot="headline">After Occurrences</div></md-select-option>
         </md-outlined-select>
         
         <md-outlined-text-field v-if="endCondition === 'UNTIL'" type="date" :value="untilDate" @input="untilDate = $event.target.value"></md-outlined-text-field>
         <md-outlined-text-field v-if="endCondition === 'COUNT'" type="number" :value="String(count)" @input="count = Number($event.target.value)"></md-outlined-text-field>
       </div>
       
       <md-divider></md-divider>
       
       <md-outlined-text-field label="Location" :value="location" @input="location = $event.target.value"></md-outlined-text-field>
       <md-outlined-text-field type="textarea" label="Description" :value="description" @input="description = $event.target.value" rows="3"></md-outlined-text-field>

       <div class="actions">
         <md-filled-button @click="save">Save</md-filled-button>
         <md-text-button @click="$emit('close')">Cancel</md-text-button>
       </div>
       <div style="height: 50px;"></div> <!-- Spacer -->
     </div>
  </div>
</template>

<style scoped>
.bottom-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--md-sys-color-surface, #fff);
  color: var(--md-sys-color-on-surface, #000);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.15);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
  z-index: 100;
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.bottom-panel.open {
  transform: translateY(0);
}

@media (min-width: 600px) {
  .bottom-panel {
    left: 50%;
    width: 600px;
    right: auto;
    border-radius: 16px;
    bottom: 24px;
    /* Adjust transform to handle centering + slide up */
    transform: translate(-50%, 120%); 
  }
  .bottom-panel.open {
    transform: translate(-50%, 0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.import-instruction {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.switch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.weekdays {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}
.end-condition {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
md-outlined-text-field, md-outlined-select {
  width: 100%;
  flex: 1;
}
</style>
