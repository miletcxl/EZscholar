// ─── Local Notifier Types ────────────────────────────────────────────────────
// Phase 1: Pure in-browser timer + toast/native notification.
// Phase 2 (future): swap notifyFn with backend call.

export type ReminderId = string;

export type ReminderStatus = 'pending' | 'fired' | 'dismissed' | 'cancelled';

export interface ReminderDTO {
  id: ReminderId;
  taskName: string;
  message: string;
  /** Delay in milliseconds from creation time */
  delayMs: number;
  /** ISO timestamp when reminder was created */
  createdAt: string;
  /** ISO timestamp when it should fire */
  fireAt: string;
  status: ReminderStatus;

  /** If set, when fired, it will automatically reschedule itself after these many minutes */
  repeatIntervalMinutes?: number;
}

export interface CreateReminderPayload {
  taskName: string;
  message: string;
  delayMinutes: number;
  repeatIntervalMinutes?: number;
}
