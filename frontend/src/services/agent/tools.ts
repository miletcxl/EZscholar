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

    // ── Docs Maker: parse draft ──────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'parse_word_draft',
            description:
                '解析本地 .docx 草稿并提取图片到指定目录，返回包含图片占位符的 markdown 文本。',
            parameters: {
                type: 'object',
                properties: {
                    input_file_path: {
                        type: 'string',
                        description: '原始 .docx 草稿的绝对路径或 workspace 内相对路径。',
                    },
                    output_asset_dir: {
                        type: 'string',
                        description: '解析时提取出的图片保存目录（必须在 workspace 内）。',
                    },
                    workspace_path: {
                        type: 'string',
                        description: '工作区根路径。若未提供将使用当前应用设置中的 workspace。',
                    },
                },
                required: ['input_file_path', 'output_asset_dir'],
            },
        },
    },

    // ── Docs Maker: render report ────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'render_academic_report',
            description:
                '将 markdown 学术报告渲染为 PDF 或 DOCX。PDF 优先使用 typst，失败自动回退到 xelatex。' +
                '优先使用 use_last_parsed_markdown=true 复用刚解析的内容，避免传超长 markdown。',
            parameters: {
                type: 'object',
                properties: {
                    markdown_content: {
                        type: 'string',
                        description: 'LLM 润色后的 markdown 内容，需保留图片占位符路径。',
                    },
                    markdown_source_file_path: {
                        type: 'string',
                        description: '已解析草稿的源文件路径。若命中缓存，可据此复用 markdown。',
                    },
                    use_last_parsed_markdown: {
                        type: 'boolean',
                        description: '若为 true，直接复用当前会话里最近一次 parse_word_draft 的 markdown。',
                    },
                    format: {
                        type: 'string',
                        enum: ['pdf', 'docx'],
                        description: '输出格式。',
                    },
                    output_path: {
                        type: 'string',
                        description: '最终报告输出路径（必须位于 workspace 内）。',
                    },
                    workspace_path: {
                        type: 'string',
                        description: '工作区根路径。若未提供将使用当前应用设置中的 workspace。',
                    },
                },
                required: ['format', 'output_path'],
            },
        },
    },

    // ── Slides Maker: async PPTX jobs ────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'generate_presentation_slides',
            description:
                '创建异步 PPTX 生成任务。支持三种 markdown 来源：markdown_content / markdown_file_path / external_prompt（必须且只能提供一个）。',
            parameters: {
                type: 'object',
                properties: {
                    markdown_content: {
                        type: 'string',
                        description: '直接提供 markdown 内容。',
                    },
                    markdown_file_path: {
                        type: 'string',
                        description: '已有 markdown 文件路径（必须位于 workspace 内）。',
                    },
                    external_prompt: {
                        type: 'string',
                        description: '外部工具生成 markdown 的提示词（走通用 webhook provider）。',
                    },
                    provider_id: {
                        type: 'string',
                        description: '外部 provider id（可选，不传则使用 workspace 默认 provider）。',
                    },
                    output_path: {
                        type: 'string',
                        description: '目标 PPTX 输出路径（可选，不传则自动落盘到 docs-maker/slides/output）。',
                    },
                    title: {
                        type: 'string',
                        description: '任务标题（可选）。',
                    },
                    workspace_path: {
                        type: 'string',
                        description: '工作区根路径。若未提供将使用当前应用设置中的 workspace。',
                    },
                },
                required: [],
            },
        },
    },
];
