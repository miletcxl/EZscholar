import { create } from 'zustand';

export interface ToastItem {
  id: string;
  title: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

interface UiState {
  isCommandPaletteOpen: boolean;
  toasts: ToastItem[];
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCommandPaletteOpen: false,
  toasts: [],
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [{ ...toast, id: `toast-${Date.now()}` }, ...state.toasts].slice(0, 5),
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    })),
}));
