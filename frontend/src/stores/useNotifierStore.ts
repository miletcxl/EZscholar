// ─── Reminder Zustand Store ──────────────────────────────────────────────────
// Tracks all reminders (pending / fired / cancelled).
// Connects to localNotifier.ts for actual timer scheduling.

import { create } from 'zustand';
import {
    cancelReminder,
    scheduleReminder,
    restartTimer,
    syncReminderTimer,
} from '../services/notifier/localNotifier';
import type { CreateReminderPayload, ReminderDTO, ReminderId } from '../services/notifier/types';
import { useUiStore } from './useUiStore';
import { useWorkspaceStore } from './useWorkspaceStore';
import { postWorkspaceEvent } from '../services/workspace-state/client';

function emitReminderEvent(
    type: 'reminder.created' | 'reminder.fired' | 'reminder.dismissed' | 'reminder.cancelled',
    reminder: ReminderDTO,
    extraPayload: Record<string, unknown> = {}
) {
    const workspacePath = useWorkspaceStore.getState().workspacePath;
    if (!workspacePath.trim()) {
        return;
    }

    const messageMap: Record<typeof type, string> = {
        'reminder.created': `创建提醒：${reminder.taskName}`,
        'reminder.fired': `提醒触发：${reminder.taskName}`,
        'reminder.dismissed': `提醒已确认：${reminder.taskName}`,
        'reminder.cancelled': `提醒已取消：${reminder.taskName}`,
    };

    void postWorkspaceEvent({
        workspacePath,
        event: {
            moduleId: 'deadline-engine',
            type,
            level: type === 'reminder.fired' ? 'warning' : 'info',
            message: messageMap[type],
            payload: {
                reminder,
                reminderId: reminder.id,
                ...extraPayload,
            },
        },
    }).catch(() => {
        // Keep reminder UX local-first even if history write-back fails.
    });
}


interface NotifierState {
    reminders: ReminderDTO[];
    permissionGranted: boolean;
    setPermissionGranted: (granted: boolean) => void;
    addReminder: (payload: CreateReminderPayload) => ReminderDTO;
    markFired: (id: ReminderId) => void;
    dismissReminder: (id: ReminderId) => void;
    cancelReminderById: (id: ReminderId) => void;
    hydrateFromWorkspace: (reminders: ReminderDTO[]) => void;
}

export const useNotifierStore = create<NotifierState>((set, get) => ({
    reminders: [],
    permissionGranted: false,

    setPermissionGranted: (granted) => set({ permissionGranted: granted }),

    addReminder: (payload) => {
        const reminder = scheduleReminder(payload, (id) => get().markFired(id));
        set((state) => ({ reminders: [reminder, ...state.reminders] }));
        emitReminderEvent('reminder.created', reminder);
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
                const nextReminder = { ...reminder, fireAt: nextFireAt, status: 'pending' as const };

                set((state) => ({
                    reminders: state.reminders.map((r) =>
                        r.id === id ? nextReminder : r,
                    ),
                }));
                emitReminderEvent('reminder.fired', nextReminder, { repeat: true });
                return;
            }
        }

        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id ? { ...r, status: 'fired' as const } : r,
            ),
        }));
        const firedReminder = get().reminders.find((r) => r.id === id && r.status === 'fired') ?? null;
        if (firedReminder) {
            emitReminderEvent('reminder.fired', firedReminder);
        }
    },


    dismissReminder: (id) => {
        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id && r.status === 'fired'
                    ? { ...r, status: 'dismissed' as const }
                    : r,
            ),
        }));
        const dismissedReminder = get().reminders.find((r) => r.id === id && r.status === 'dismissed') ?? null;
        if (dismissedReminder) {
            emitReminderEvent('reminder.dismissed', dismissedReminder);
        }
    },

    cancelReminderById: (id) => {
        cancelReminder(id);
        set((state) => ({
            reminders: state.reminders.map((r) =>
                r.id === id && r.status === 'pending'
                    ? { ...r, status: 'cancelled' as const }
                    : r,
            ),
        }));
        const cancelledReminder = get().reminders.find((r) => r.id === id && r.status === 'cancelled') ?? null;
        if (cancelledReminder) {
            emitReminderEvent('reminder.cancelled', cancelledReminder);
        }
    },

    hydrateFromWorkspace: (incomingReminders) => {
        const normalized = [...incomingReminders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        set({ reminders: normalized });
        normalized.forEach((reminder) => {
            syncReminderTimer(reminder, (id) => get().markFired(id));
        });
    },
}));
