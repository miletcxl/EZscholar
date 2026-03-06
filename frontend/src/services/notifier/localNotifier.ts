// ─── Local Notifier Service ──────────────────────────────────────────────────
// Phase 1: Uses browser setTimeout + Web Notifications API.
// The active timer handles live in memory; the reminder list is persisted in
// Zustand (zustand/persist would add localStorage in a future iteration).

import type { CreateReminderPayload, ReminderId, ReminderDTO } from './types';

type TimerHandle = ReturnType<typeof setTimeout>;

const activeTimers = new Map<ReminderId, TimerHandle>();

function notifyReminder(taskName: string, message: string, repeat: boolean) {
    if (Notification.permission !== 'granted') {
        return;
    }

    const prefix = repeat ? '🔄 ' : '📌 ';
    new Notification(`${prefix}${taskName}`, {
        body: message,
        icon: '/vite.svg',
    });
}

function bindTimer(reminder: ReminderDTO, delayMs: number, onFired: (id: ReminderId) => void) {
    const safeDelay = Math.max(0, delayMs);
    const handle = setTimeout(() => {
        notifyReminder(reminder.taskName, reminder.message, Boolean(reminder.repeatIntervalMinutes));
        activeTimers.delete(reminder.id);
        onFired(reminder.id);
    }, safeDelay);
    activeTimers.set(reminder.id, handle);
}

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

    bindTimer(reminder, delayMs, onFired);
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
    bindTimer(reminder, delayMs, onFired);
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
 * Ensure pending reminders recovered from workspace snapshots continue firing after refresh.
 */
export function syncReminderTimer(
    reminder: ReminderDTO,
    onFired: (id: ReminderId) => void
): void {
    cancelReminder(reminder.id);
    if (reminder.status !== 'pending') {
        return;
    }

    const delayMs = new Date(reminder.fireAt).getTime() - Date.now();
    bindTimer(reminder, delayMs, onFired);
}

/**
 * How many ms remain for a reminder (may be negative if already past due).
 */
export function getRemainingMs(reminder: ReminderDTO): number {
    return new Date(reminder.fireAt).getTime() - Date.now();
}
