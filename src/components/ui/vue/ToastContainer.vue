<script setup lang="ts">
import { useToast } from '../../../composables/useToast';

const { toasts } = useToast();
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast"
        :class="toast.type"
      >
        <md-icon v-if="toast.type === 'success'">check_circle</md-icon>
        <md-icon v-else-if="toast.type === 'error'">error</md-icon>
        <md-icon v-else>info</md-icon>
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style src="../css/ToastContainer.css" scoped></style>
