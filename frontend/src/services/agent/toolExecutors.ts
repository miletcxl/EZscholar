// ─── Tool Executors ───────────────────────────────────────────────────────────
// Each function here corresponds to a tool defined in tools.ts.
// They receive the parsed arguments, execute the action, and return a result.

import type { ToolCall, ToolExecutionResult } from './toolTypes';
import { useNotifierStore } from '../../stores/useNotifierStore';
import type { CreateReminderPayload } from '../notifier/types';

// ── schedule_reminder ─────────────────────────────────────────────────────────

interface ScheduleReminderArgs {
    task_name: string;
    delay_minutes: number;
    repeat_interval_minutes?: number;
    message: string;
}

function execScheduleReminder(args: ScheduleReminderArgs, toolCallId: string): ToolExecutionResult {
    const payload: CreateReminderPayload = {
        taskName: args.task_name,
        delayMinutes: Math.max(0.1, Math.min(1440, args.delay_minutes)),
        repeatIntervalMinutes: args.repeat_interval_minutes ? Math.max(1, Math.min(1440, args.repeat_interval_minutes)) : undefined,
        message: args.message,
    };

    const reminder = useNotifierStore.getState().addReminder(payload);

    const fireAt = new Date(reminder.fireAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const content = JSON.stringify({
        status: 'ok',
        reminder_id: reminder.id,
        task_name: reminder.taskName,
        fire_at: reminder.fireAt,
        message: reminder.message,
    });

    return {
        toolCallId,
        toolName: 'schedule_reminder',
        summary: `✅ 已在 Deadline Engine 设置提醒：「${args.task_name}」将于 ${fireAt} 触发`,
        content,
        ok: true,
    };
}

// ── list_reminders ────────────────────────────────────────────────────────────

function execListReminders(toolCallId: string): ToolExecutionResult {
    const { reminders } = useNotifierStore.getState();
    const pending = reminders.filter((r) => r.status === 'pending');

    const content = JSON.stringify({
        count: pending.length,
        reminders: pending.map((r) => ({
            id: r.id,
            task_name: r.taskName,
            message: r.message,
            fire_at: r.fireAt,
        })),
    });

    return {
        toolCallId,
        toolName: 'list_reminders',
        summary: `📋 当前有 ${pending.length} 条待执行提醒`,
        content,
        ok: true,
    };
}

// ── cancel_reminder ───────────────────────────────────────────────────────────

interface CancelReminderArgs {
    reminder_id: string;
}

function execCancelReminder(args: CancelReminderArgs, toolCallId: string): ToolExecutionResult {
    const { reminders, cancelReminderById } = useNotifierStore.getState();
    const reminder = reminders.find((r) => r.id === args.reminder_id);

    if (!reminder) {
        return {
            toolCallId,
            toolName: 'cancel_reminder',
            summary: `⚠ 未找到 ID 为 ${args.reminder_id} 的提醒`,
            content: JSON.stringify({ status: 'error', error: 'reminder not found' }),
            ok: false,
        };
    }

    cancelReminderById(args.reminder_id);

    return {
        toolCallId,
        toolName: 'cancel_reminder',
        summary: `🗑 已取消提醒：「${reminder.taskName}」`,
        content: JSON.stringify({ status: 'ok', cancelled_id: args.reminder_id }),
        ok: true,
    };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Execute a single tool call and return its result.
 * Safe: catches all errors and returns them as failed results.
 */
export function executeTool(toolCall: ToolCall): ToolExecutionResult {
    try {
        const args = JSON.parse(toolCall.function.arguments);

        switch (toolCall.function.name) {
            case 'schedule_reminder':
                return execScheduleReminder(args as ScheduleReminderArgs, toolCall.id);
            case 'list_reminders':
                return execListReminders(toolCall.id);
            case 'cancel_reminder':
                return execCancelReminder(args as CancelReminderArgs, toolCall.id);
            default:
                return {
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    summary: `⚠ 未知工具：${toolCall.function.name}`,
                    content: JSON.stringify({ status: 'error', error: `Unknown tool: ${toolCall.function.name}` }),
                    ok: false,
                };
        }
    } catch (err) {
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            summary: `❌ 工具执行失败：${err instanceof Error ? err.message : String(err)}`,
            content: JSON.stringify({ status: 'error', error: String(err) }),
            ok: false,
        };
    }
}
