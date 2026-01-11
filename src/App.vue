<script setup lang="ts">
import { ref } from 'vue';
import CalendarView from './components/CalendarView.vue';
import EventForm from './components/EventForm.vue';
import type { EventItem } from './types';

const isFormOpen = ref(false);
const formInitialDate = ref<string | undefined>(undefined);
const formEditEvent = ref<EventItem | undefined>(undefined);

function openAdd(date?: string) {
  formEditEvent.value = undefined;
  formInitialDate.value = date;
  isFormOpen.value = true;
}

function openEdit(event: EventItem) {
  formEditEvent.value = event;
  formInitialDate.value = undefined;
  isFormOpen.value = true;
}

function handleSaved() {
    isFormOpen.value = false;
}
</script>

<template>
  <div class="app-container">
    <CalendarView 
       @addEvent="openAdd"
       @editEvent="openEdit"
    />
    
    <div class="fab-container">
        <md-fab variant="primary" @click="() => openAdd()">
            <md-icon slot="icon">add</md-icon>
        </md-fab>
    </div>

    <EventForm 
      :isOpen="isFormOpen"
      :initialDate="formInitialDate"
      :editEvent="formEditEvent"
      @close="isFormOpen = false"
      @saved="handleSaved"
    />
  </div>
</template>

<style scoped>
.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background-color: var(--md-sys-color-background, #fff);
}
.fab-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 90;
}
</style>
