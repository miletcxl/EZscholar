// ─── Reminder Zustand Store ──────────────────────────────────────────────────
// Tracks all reminders (pending / fired / cancelled).
// Connects to localNotifier.ts for actual timer scheduling.

import { create } from 'zustand';
import {
    cancelReminder,
    scheduleReminder,
    restartTimer,
} from '../services/notifier/localNotifier';
import type { CreateReminderPayload, ReminderDTO, ReminderId } from '../services/notifier/types';
import { useUiStore } from './useUiStore';


interface NotifierState {
    reminders: ReminderDTO[];
    permissionGranted: boolean;
    setPermissionGranted: (granted: boolean) => void;
    addReminder: (payload: CreateReminderPayload) => ReminderDTO;
    markFired: (id: ReminderId) => void;
    dismissReminder: (id: ReminderId) => void;
    cancelReminderById: (id: ReminderId) => void;
}

export const useNotifierStore = create<NotifierState>((set, get) => ({
    reminders: [],
    permissionGranted: false,

    setPermissionGranted: (granted) => set({ permissionGranted: granted }),

    addReminder: (payload) => {
        const reminder = scheduleReminder(payload, (id) => get().markFired(id));
        set((state) => ({ reminders: [reminder, ...state.reminders] }));
        return reminder;
    },

    markFired: (id) => {
        // Find the reminder to grab its title and message for the toast
        const reminder = get().reminders.find((r) => r.id === id);
        if (reminder) {
            const prefix = reminder.repeatIntervalMinutes ? '🔄 ' : '📌 ';
            useUiStore.getState().pushToast({
                title: `${prefix}${reminder.taskName}：${reminder.message}`,
                tone: 'warning',
            });

            if (reminder.repeatIntervalMinutes) {
                // Repeating reminder: schedule next and update fireAt
                restartTimer(reminder, (rid) => get().markFired(rid));
                const nextDelayMs = reminder.repeatIntervalMinutes * 60 * 1000;
                const nextFireAt = new Date(Date.now() + nextDelayMs).toISOString();

                set((state) => ({
                    reminders: state.reminders.map((r) =>
                        r.id === id ? { ...r, fireAt: nextFireAt } : r,
                    ),
                }));
                return;
            }
        }

        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id ? { ...r, status: 'fired' as const } : r,
            ),
        }));
    },


    dismissReminder: (id) =>
        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id && r.status === 'fired'
                    ? { ...r, status: 'dismissed' as const }
                    : r,
            ),
        })),

    cancelReminderById: (id) => {
        cancelReminder(id);
        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id && r.status === 'pending'
                    ? { ...r, status: 'cancelled' as const }
                    : r,
            ),
        }));
    },
}));
