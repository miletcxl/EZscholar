import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ToastItem {
  id: string;
  title: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export type ThemeMode = 'dark' | 'light';

interface UiState {
  theme: ThemeMode;
  isCommandPaletteOpen: boolean;
  toasts: ToastItem[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isCommandPaletteOpen: false,
      toasts: [],
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme;
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.dataset.theme = newTheme;
          return { theme: newTheme };
        }),
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
    }),
    {
      name: 'cyber-scholar-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.dataset.theme = state.theme;
        }
      },
    }
  )
);
