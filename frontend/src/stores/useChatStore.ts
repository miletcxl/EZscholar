// ─── Chat Store (Agentic) ─────────────────────────────────────────────────────
// Manages the AI chat conversation history and full tool-calling loop.
// When the model returns tool_calls, we:
//   1. Execute them locally
//   2. Store the FULL assistant message (with tool_calls) + tool results
//   3. Feed everything back to the model for the final reply

import { create } from 'zustand';
import { chatCompletion } from '../services/llm/client';
import { getActiveProvider } from './useLlmStore';
import { AGENT_TOOLS } from '../services/agent/tools';
import { executeTool } from '../services/agent/toolExecutors';
import type { ToolCall, ToolExecutionResult } from '../services/agent/toolTypes';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolActionCard {
    toolName: string;
    summary: string;
    ok: boolean;
}

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
    // Tool action display cards (UI only)
    toolActions?: ToolActionCard[];
    // Raw tool_calls from the API — needed to reconstruct proper message history
    rawToolCalls?: ToolCall[];
    // For role=tool messages: which tool_call_id this answers
    toolCallId?: string;
    isStreaming?: boolean;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;

    sendMessage: (userText: string) => Promise<void>;
    clearHistory: () => void;
    setError: (err: string | null) => void;
}

const SYSTEM_PROMPT = `你是 Cyber-Scholar，一名嵌入式学术管理助手，内置在 EZscholar 桌面应用中。
你可以调用工具直接管理用户的提醒和 DDL。

你有以下工具可供调用：
- schedule_reminder：设置一个定时提醒，用户说"X 分钟后 / X 小时后提醒我做 Y"时主动调用。
- list_reminders：查询待执行的提醒列表。
- cancel_reminder：取消一个提醒。
- parse_word_draft：解析 .docx 草稿并提取图片为 markdown。
- render_academic_report：将 markdown 渲染为 pdf/docx 报告。
- generate_presentation_slides：幻灯片生成占位工具（当前仅返回 stub 成功文案）。

规则：
1. 遇到明确的提醒/日程请求，直接调用工具，不要先征求确认。
2. 工具调用成功后，简洁地告知用户设置结果。
3. 使用中文回复，技术术语保留英文。
4. 如果用户在 parse_word_draft 之后要求渲染 PDF/DOCX，优先调用 render_academic_report 并传 use_last_parsed_markdown=true。
5. 不要把整篇超长 markdown 原样粘贴进 render_academic_report 参数。
6. 不要捏造不存在的工具或功能。`;

function makeId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapChatError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    const code =
        err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
            ? (err as { code: string }).code
            : '';
    const httpStatus =
        err && typeof err === 'object' && 'httpStatus' in err && typeof (err as { httpStatus?: unknown }).httpStatus === 'number'
            ? (err as { httpStatus: number }).httpStatus
            : undefined;

    if (code === 'LLM_TIMEOUT') {
        return '请求超时：模型响应时间过长。已自动重试 1 次仍失败，请重试或更换模型。';
    }
    if (code === 'LATEX_CJK_PACKAGE_MISSING') {
        return 'PDF 渲染失败：缺少 xeCJK。请安装 texlive-lang-chinese 后重试。';
    }
    if (code === 'XELATEX_NOT_FOUND') {
        return 'PDF 渲染失败：未检测到 xelatex。请安装 texlive-xetex。';
    }
    if (code === 'CJK_FONT_NOT_FOUND') {
        return 'PDF 渲染失败：中文字体不可用。请安装 Noto CJK 字体。';
    }

    const parsedHttpStatus = httpStatus ?? Number(message.match(/HTTP (\d{3})/)?.[1] || 0);

    if (parsedHttpStatus === 401 || parsedHttpStatus === 403) {
        return '鉴权失败：请检查 API Key。';
    }

    if (parsedHttpStatus === 429) {
        return '请求过于频繁：请稍后重试。';
    }

    return message;
}

/**
 * Build the messages array for the API from our store messages.
 * KEY: When an assistant message has rawToolCalls, we MUST include them
 * and the subsequent tool result messages, exactly as OpenAI specifies.
 */
function buildApiMessages(
    storeMessages: ChatMessage[],
): object[] {
    const result: object[] = [];

    for (const m of storeMessages) {
        if (m.isStreaming) continue;

        if (m.role === 'user') {
            result.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
            if (m.rawToolCalls && m.rawToolCalls.length > 0) {
                // Must keep tool_calls so the model can match tool result messages
                result.push({
                    role: 'assistant',
                    content: m.content || null,
                    tool_calls: m.rawToolCalls,
                });
            } else {
                result.push({ role: 'assistant', content: m.content });
            }
        } else if (m.role === 'tool' && m.toolCallId) {
            result.push({
                role: 'tool',
                tool_call_id: m.toolCallId,
                content: m.content,
            });
        }
        // Skip 'system' role (we always inject it fresh at the top)
    }

    return result;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    isLoading: false,
    error: null,

    setError: (err) => set({ error: err }),
    clearHistory: () => set({ messages: [], error: null }),

    sendMessage: async (userText: string) => {
        if (!userText.trim() || get().isLoading) return;

        const provider = getActiveProvider();
        if (!provider) {
            set({ error: '未选择 AI Provider，请前往设置配置。' });
            return;
        }

        // Append user message + streaming placeholder
        const userMsg: ChatMessage = {
            id: makeId(),
            role: 'user',
            content: userText.trim(),
            createdAt: new Date().toISOString(),
        };
        const assistantId = makeId();

        set((state) => ({
            isLoading: true,
            error: null,
            messages: [
                ...state.messages,
                userMsg,
                { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString(), isStreaming: true },
            ],
        }));

        try {
            let pendingId = assistantId;
            const MAX_ROUNDS = 3;

            for (let round = 0; round < MAX_ROUNDS; round++) {
                const currentMessages = get().messages.filter((m) => !m.isStreaming);

                const apiMessages = [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...buildApiMessages(currentMessages),
                ];

                const resp = await chatCompletion(provider, {
                    messages: apiMessages as Parameters<typeof chatCompletion>[1]['messages'],
                    tools: AGENT_TOOLS,
                    tool_choice: 'auto',
                    temperature: 0.5,
                    max_tokens: 1200,
                });

                const choice = resp.choices[0];
                if (!choice) break;

                const { tool_calls, content } = choice.message;

                // ── No tool calls → final answer ──────────────────────────────────
                if (!tool_calls || tool_calls.length === 0) {
                    set((state) => ({
                        isLoading: false,
                        messages: state.messages.map((m) =>
                            m.id === pendingId
                                ? { ...m, content: content ?? '(无回复)', isStreaming: false }
                                : m,
                        ),
                    }));
                    return;
                }

                // ── Tool calls → execute & feed back ──────────────────────────────
                const results: ToolExecutionResult[] = await Promise.all(
                    tool_calls.map((tc: ToolCall) => executeTool(tc)),
                );

                // Update the streaming assistant message — store rawToolCalls for history
                set((state) => ({
                    messages: state.messages.map((m) =>
                        m.id === pendingId
                            ? {
                                ...m,
                                content: content ?? '',
                                isStreaming: false,
                                rawToolCalls: tool_calls,
                                toolActions: results.map((r) => ({
                                    toolName: r.toolName,
                                    summary: r.summary,
                                    ok: r.ok,
                                })),
                            }
                            : m,
                    ),
                }));

                // Append tool result messages (one per tool call)
                const toolResultMsgs: ChatMessage[] = results.map((r) => ({
                    id: makeId(),
                    role: 'tool' as const,
                    content: r.content,               // raw JSON result
                    toolCallId: r.toolCallId,         // matched to rawToolCalls
                    createdAt: new Date().toISOString(),
                }));

                // Add next streaming placeholder
                const nextId = makeId();
                set((state) => ({
                    messages: [
                        ...state.messages,
                        ...toolResultMsgs,
                        { id: nextId, role: 'assistant', content: '', createdAt: new Date().toISOString(), isStreaming: true },
                    ],
                }));
                pendingId = nextId;
                // Loop: next iteration will send the full history including tool results
            }
        } catch (err) {
            const errMsg = mapChatError(err);
            set((state) => ({
                isLoading: false,
                error: errMsg,
                messages: state.messages.map((m) =>
                    m.isStreaming ? { ...m, content: `❌ 请求失败：${errMsg}`, isStreaming: false } : m,
                ),
            }));
        } finally {
            set({ isLoading: false });
        }
    },
}));
