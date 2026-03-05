import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toast: Toast | null;
  show: (opts: { message: string; type?: 'success' | 'error' | 'info' }) => void;
  hide: () => void;
}

let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,

  show: ({ message, type = 'info' }) => {
    if (hideTimeout) clearTimeout(hideTimeout);

    const id = Math.random().toString(36).slice(2, 10);
    set({ toast: { id, message, type } });

    hideTimeout = setTimeout(() => {
      set({ toast: null });
      hideTimeout = null;
    }, 2500);
  },

  hide: () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    set({ toast: null });
  },
}));
