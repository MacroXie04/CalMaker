<script setup lang="ts">
import { useEventForm, WEEKDAY_LABELS } from '../ts/EventForm';
import type { EventItem } from '../../../types';

const props = defineProps<{
  initialDate?: string;
  editEvent?: EventItem;
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'saved']);

const {
  title,
  date,
  allDay,
  startTime,
  endTime,
  timezone,
  location,
  description,
  showImport,
  importHtml,
  freq,
  interval,
  byWeekday,
  endCondition,
  untilDate,
  count,
  toggleImport,
  handleImport,
  save,
  toggleDay,
} = useEventForm(props, emit);
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
          v-for="(d, i) in WEEKDAY_LABELS" 
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
      <div style="height: 50px;"></div>
    </div>
  </div>
</template>

<style src="../css/EventForm.css" scoped></style>
