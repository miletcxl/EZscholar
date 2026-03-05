// ─── Agent Tool Definitions (OpenAI function-calling format) ─────────────────
// These are the "actions" the AI can perform. Each definition here must have
// a corresponding executor in toolExecutors.ts.

import type { ChatCompletionTool } from './toolTypes';

export const AGENT_TOOLS: ChatCompletionTool[] = [
    // ── Reminder scheduling ──────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'schedule_reminder',
            description:
                '在 Deadline Engine 中设置一个本地定时提醒。用户说"X 分钟后提醒我做 Y"时调用此工具。' +
                '提醒触发时会弹出 Toast 通知。',
            parameters: {
                type: 'object',
                properties: {
                    task_name: {
                        type: 'string',
                        description: '任务名称，简短标题，如"喝水"、"站立活动"、"查看邮件"',
                    },
                    delay_minutes: {
                        type: 'number',
                        description: '延迟时间，单位分钟。例如 30 表示 30 分钟后触发。最小 0.1，最大 1440。',
                    },
                    repeat_interval_minutes: {
                        type: 'number',
                        description: '循环提醒的间隔时间，单位分钟。如果用户说是"每隔 X 分钟提醒一次"，则填入此字段，最小 1，最大 1440。如果是单次提醒，忽略此字段。',
                    },
                    message: {
                        type: 'string',
                        description:
                            '提醒内容的详细说明，给用户的建议文字。例如"建议起身喝一杯水，保持专注。"',
                    },
                },
                required: ['task_name', 'delay_minutes', 'message'],
            },
        },
    },

    // ── List pending reminders ───────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'list_reminders',
            description:
                '查询当前所有待执行的提醒。当用户询问"我现在有什么提醒"或"查看待办提醒"时调用。',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },

    // ── Cancel a reminder ────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'cancel_reminder',
            description: '取消一个等待中的提醒，通过提醒 ID 指定。',
            parameters: {
                type: 'object',
                properties: {
                    reminder_id: {
                        type: 'string',
                        description: '要取消的提醒 ID，可从 list_reminders 的结果中获取。',
                    },
                },
                required: ['reminder_id'],
            },
        },
    },
];
