import { ref } from 'vue';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const toasts = ref<ToastMessage[]>([]);
let nextId = 0;

export function useToast() {
  function show(message: string, type: ToastMessage['type'] = 'info', duration = 3000) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, duration);
  }

  function success(message: string) {
    show(message, 'success');
  }

  function error(message: string) {
    show(message, 'error');
  }

  function info(message: string) {
    show(message, 'info');
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
  };
}
