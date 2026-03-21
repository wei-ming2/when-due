import { writable } from 'svelte/store';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
  duration: number;
}

const DEFAULT_DURATION = 3200;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function remove(id: string) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    update((items) => items.filter((item) => item.id !== id));
  }

  function push(input: Omit<Toast, 'id' | 'duration'> & { duration?: number }) {
    const id = crypto.randomUUID();
    const duration = input.duration ?? DEFAULT_DURATION;
    const toast: Toast = {
      id,
      title: input.title,
      message: input.message,
      tone: input.tone,
      duration,
    };

    update((items) => [...items, toast]);

    const timer = setTimeout(() => {
      remove(id);
    }, duration);
    timers.set(id, timer);

    return id;
  }

  return {
    subscribe,
    push,
    remove,
    info(title: string, message?: string, duration?: number) {
      return push({ title, message, tone: 'info', duration });
    },
    success(title: string, message?: string, duration?: number) {
      return push({ title, message, tone: 'success', duration });
    },
    error(title: string, message?: string, duration?: number) {
      return push({ title, message, tone: 'error', duration });
    },
  };
}

export const toasts = createToastStore();

export function showErrorToast(title: string, message = 'Please try again.') {
  return toasts.error(title, message);
}
