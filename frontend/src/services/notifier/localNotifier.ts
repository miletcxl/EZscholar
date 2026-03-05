// ─── Local Notifier Service ──────────────────────────────────────────────────
// Phase 1: Uses browser setTimeout + Web Notifications API.
// The active timer handles live in memory; the reminder list is persisted in
// Zustand (zustand/persist would add localStorage in a future iteration).

import type { CreateReminderPayload, ReminderId, ReminderDTO } from './types';

type TimerHandle = ReturnType<typeof setTimeout>;

const activeTimers = new Map<ReminderId, TimerHandle>();

/**
 * Request notification permission once.
 * Resolves to true if granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

/**
 * Creates a reminder and schedules a browser notification.
 * Returns the constructed ReminderDTO.
 */
export function scheduleReminder(
    payload: CreateReminderPayload,
    onFired: (id: ReminderId) => void,
): ReminderDTO {
    const id: ReminderId = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const delayMs = payload.delayMinutes * 60 * 1000;
    const createdAt = new Date().toISOString();
    const fireAt = new Date(Date.now() + delayMs).toISOString();

    const reminder: ReminderDTO = {
        id,
        taskName: payload.taskName,
        message: payload.message,
        delayMs,
        createdAt,
        fireAt,
        status: 'pending',
        repeatIntervalMinutes: payload.repeatIntervalMinutes,
    };

    const handle = setTimeout(() => {
        // Try native browser notification first
        if (Notification.permission === 'granted') {
            const prefix = payload.repeatIntervalMinutes ? '🔄 ' : '📌 ';
            new Notification(`${prefix}${payload.taskName}`, {
                body: payload.message,
                icon: '/vite.svg',
            });
        }
        activeTimers.delete(id);
        onFired(id);
    }, delayMs);

    activeTimers.set(id, handle);
    return reminder;
}

/**
 * Restarts an existing repeating reminder's timer.
 */
export function restartTimer(
    reminder: ReminderDTO,
    onFired: (id: ReminderId) => void
): void {
    if (!reminder.repeatIntervalMinutes) return;

    // Clear any existing just in case
    cancelReminder(reminder.id);

    const delayMs = reminder.repeatIntervalMinutes * 60 * 1000;
    const handle = setTimeout(() => {
        if (Notification.permission === 'granted') {
            new Notification(`🔄 ${reminder.taskName}`, {
                body: reminder.message,
                icon: '/vite.svg',
            });
        }
        activeTimers.delete(reminder.id);
        onFired(reminder.id);
    }, delayMs);

    activeTimers.set(reminder.id, handle);
}

/**
 * Cancel a pending reminder timer.
 */
export function cancelReminder(id: ReminderId): void {
    const handle = activeTimers.get(id);
    if (handle !== undefined) {
        clearTimeout(handle);
        activeTimers.delete(id);
    }
}

/**
 * How many ms remain for a reminder (may be negative if already past due).
 */
export function getRemainingMs(reminder: ReminderDTO): number {
    return new Date(reminder.fireAt).getTime() - Date.now();
}
