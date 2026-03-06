// ─── Tool Executors ───────────────────────────────────────────────────────────
// Each function here corresponds to a tool defined in tools.ts.
// They receive the parsed arguments, execute the action, and return a result.

import type { ToolCall, ToolExecutionResult } from './toolTypes';
import { useNotifierStore } from '../../stores/useNotifierStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import type { CreateReminderPayload } from '../notifier/types';
import {
    createSlideJob,
    parseWordDraft,
    renderAcademicReport,
} from '../docs-maker/client';

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
        summary: `已在 Deadline Engine 设置提醒：「${args.task_name}」将于 ${fireAt} 触发`,
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
        summary: `当前有 ${pending.length} 条待执行提醒`,
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
            summary: `未找到 ID 为 ${args.reminder_id} 的提醒`,
            content: JSON.stringify({ status: 'error', error_code: 'REMINDER_NOT_FOUND', message: 'reminder not found' }),
            ok: false,
        };
    }

    cancelReminderById(args.reminder_id);

    return {
        toolCallId,
        toolName: 'cancel_reminder',
        summary: `已取消提醒：「${reminder.taskName}」`,
        content: JSON.stringify({ status: 'ok', cancelled_id: args.reminder_id }),
        ok: true,
    };
}

interface ParseWordDraftArgs {
    input_file_path: string;
    output_asset_dir: string;
    workspace_path?: string;
}

interface RenderAcademicReportArgs {
    markdown_content?: string;
    markdown_source_file_path?: string;
    use_last_parsed_markdown?: boolean;
    format: 'pdf' | 'docx';
    output_path: string;
    workspace_path?: string;
}

interface GeneratePresentationSlidesArgs {
    markdown_content?: string;
    markdown_file_path?: string;
    external_prompt?: string;
    provider_id?: string;
    output_path?: string;
    title?: string;
    workspace_path?: string;
}

function resolveWorkspacePath(input?: string) {
    return input?.trim() || useWorkspaceStore.getState().workspacePath;
}

const MARKDOWN_PREVIEW_LIMIT = 1_600;

const docsMakerMarkdownCache: {
    lastMarkdown?: string;
    lastSourcePath?: string;
    bySourcePath: Map<string, string>;
} = {
    bySourcePath: new Map<string, string>(),
};

function normalizePathKey(input: string): string {
    return input.trim().replace(/\\/g, '/').toLowerCase();
}

function resolveMarkdownContent(args: RenderAcademicReportArgs): { markdownContent?: string; cacheSource?: string } {
    const explicitMarkdown = args.markdown_content?.trim();
    if (explicitMarkdown) {
        return {
            markdownContent: explicitMarkdown,
            cacheSource: 'inline_markdown_content',
        };
    }

    if (args.markdown_source_file_path?.trim()) {
        const key = normalizePathKey(args.markdown_source_file_path);
        const cached = docsMakerMarkdownCache.bySourcePath.get(key);
        if (cached) {
            return {
                markdownContent: cached,
                cacheSource: `cache_by_source:${args.markdown_source_file_path}`,
            };
        }
    }

    if (args.use_last_parsed_markdown && docsMakerMarkdownCache.lastMarkdown) {
        return {
            markdownContent: docsMakerMarkdownCache.lastMarkdown,
            cacheSource: 'cache_last_parsed',
        };
    }

    if (docsMakerMarkdownCache.lastMarkdown) {
        return {
            markdownContent: docsMakerMarkdownCache.lastMarkdown,
            cacheSource: 'cache_last_parsed_fallback',
        };
    }

    return {};
}

function extractErrorDetails(err: unknown) {
    if (err && typeof err === 'object') {
        const errorCode = 'errorCode' in err && typeof (err as { errorCode?: unknown }).errorCode === 'string'
            ? (err as { errorCode: string }).errorCode
            : 'TOOL_EXECUTION_ERROR';
        const hint = 'hint' in err && typeof (err as { hint?: unknown }).hint === 'string'
            ? (err as { hint: string }).hint
            : undefined;
        const message = err instanceof Error ? err.message : String(err);
        return { errorCode, message, hint };
    }

    return {
        errorCode: 'TOOL_EXECUTION_ERROR',
        message: String(err),
        hint: undefined,
    };
}

function mapToolFailureSummary(toolName: string, errorCode: string): string | null {
    if (toolName !== 'render_academic_report') {
        return null;
    }

    switch (errorCode) {
        case 'LATEX_CJK_PACKAGE_MISSING':
            return '渲染失败：缺少 LaTeX 中文宏包（xeCJK）';
        case 'XELATEX_NOT_FOUND':
            return '渲染失败：未检测到 xelatex';
        case 'CJK_FONT_NOT_FOUND':
            return '渲染失败：中文字体不可用';
        default:
            return null;
    }
}

function buildFailureResult(
    toolCall: ToolCall,
    summary: string,
    err: unknown,
): ToolExecutionResult {
    const details = extractErrorDetails(err);
    const mappedSummary = mapToolFailureSummary(toolCall.function.name, details.errorCode);
    return {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        summary: mappedSummary ?? `${summary}：${details.errorCode}`,
        content: JSON.stringify({
            status: 'error',
            error_code: details.errorCode,
            message: details.message,
            hint: details.hint,
        }),
        ok: false,
    };
}

async function execParseWordDraft(args: ParseWordDraftArgs, toolCallId: string): Promise<ToolExecutionResult> {
    const workspacePath = resolveWorkspacePath(args.workspace_path);
    if (!workspacePath) {
        return {
            toolCallId,
            toolName: 'parse_word_draft',
            summary: '解析失败：workspace_path 未配置',
            content: JSON.stringify({
                status: 'error',
                error_code: 'WORKSPACE_PATH_REQUIRED',
                message: 'workspace_path 未提供，且设置页未配置 workspace。',
                hint: '请先在设置页配置工作区路径。',
            }),
            ok: false,
        };
    }

    const result = await parseWordDraft({
        inputFilePath: args.input_file_path,
        outputAssetDir: args.output_asset_dir,
        workspacePath,
    });

    docsMakerMarkdownCache.lastMarkdown = result.markdownContent;
    docsMakerMarkdownCache.lastSourcePath = result.sourceFilePath;
    docsMakerMarkdownCache.bySourcePath.set(
        normalizePathKey(result.sourceFilePath),
        result.markdownContent,
    );

    if (args.input_file_path?.trim()) {
        docsMakerMarkdownCache.bySourcePath.set(
            normalizePathKey(args.input_file_path),
            result.markdownContent,
        );
    }

    const markdownPreview = result.markdownContent.slice(0, MARKDOWN_PREVIEW_LIMIT);

    return {
        toolCallId,
        toolName: 'parse_word_draft',
        summary: `草稿解析成功，提取图片 ${result.assetFiles.length} 张`,
        content: JSON.stringify({
            status: 'ok',
            source_file_path: result.sourceFilePath,
            output_asset_dir: result.outputAssetDir,
            asset_files: result.assetFiles,
            asset_count: result.assetFiles.length,
            markdown_preview: markdownPreview,
            markdown_length: result.markdownContent.length,
            markdown_truncated: result.markdownContent.length > MARKDOWN_PREVIEW_LIMIT,
            markdown_cache_ready: true,
        }),
        ok: true,
    };
}

async function execRenderAcademicReport(
    args: RenderAcademicReportArgs,
    toolCallId: string,
): Promise<ToolExecutionResult> {
    const workspacePath = resolveWorkspacePath(args.workspace_path);
    if (!workspacePath) {
        return {
            toolCallId,
            toolName: 'render_academic_report',
            summary: '渲染失败：workspace_path 未配置',
            content: JSON.stringify({
                status: 'error',
                error_code: 'WORKSPACE_PATH_REQUIRED',
                message: 'workspace_path 未提供，且设置页未配置 workspace。',
                hint: '请先在设置页配置工作区路径。',
            }),
            ok: false,
        };
    }

    const { markdownContent, cacheSource } = resolveMarkdownContent(args);
    if (!markdownContent) {
        return {
            toolCallId,
            toolName: 'render_academic_report',
            summary: '渲染失败：缺少 markdown 内容，且未命中缓存',
            content: JSON.stringify({
                status: 'error',
                error_code: 'MARKDOWN_CONTENT_REQUIRED',
                message: '未提供 markdown_content，且当前会话不存在可复用的解析结果。',
                hint: '请先调用 parse_word_draft，或在 render_academic_report 传入 markdown_content。',
            }),
            ok: false,
        };
    }

    const result = await renderAcademicReport({
        markdownContent,
        format: args.format,
        outputPath: args.output_path,
        workspacePath,
    });

    return {
        toolCallId,
        toolName: 'render_academic_report',
        summary: `报告渲染成功：${result.format.toUpperCase()} (${result.engineUsed})`,
        content: JSON.stringify({
            status: 'ok',
            ...result,
            markdown_source: cacheSource,
            markdown_length: markdownContent.length,
        }),
        ok: true,
    };
}

async function execGeneratePresentationSlides(
    args: GeneratePresentationSlidesArgs,
    toolCallId: string,
): Promise<ToolExecutionResult> {
    const workspacePath = resolveWorkspacePath(args.workspace_path);
    if (!workspacePath) {
        return {
            toolCallId,
            toolName: 'generate_presentation_slides',
            summary: '幻灯片生成失败：workspace_path 未配置',
            content: JSON.stringify({
                status: 'error',
                error_code: 'WORKSPACE_PATH_REQUIRED',
                message: 'workspace_path 未提供，且设置页未配置 workspace。',
                hint: '请先在设置页配置工作区路径。',
            }),
            ok: false,
        };
    }

    const hasExplicitMarkdownSource = Boolean(
        args.markdown_content?.trim()
        || args.markdown_file_path?.trim()
        || args.external_prompt?.trim(),
    );
    const markdownContentFallback = args.markdown_content?.trim()
        || (!hasExplicitMarkdownSource ? docsMakerMarkdownCache.lastMarkdown : undefined);

    const result = await createSlideJob({
        markdownContent: markdownContentFallback || undefined,
        markdownFilePath: args.markdown_file_path?.trim() || undefined,
        externalPrompt: args.external_prompt?.trim() || undefined,
        providerId: args.provider_id?.trim() || undefined,
        outputPath: args.output_path?.trim() || undefined,
        title: args.title?.trim() || undefined,
        workspacePath,
    });

    return {
        toolCallId,
        toolName: 'generate_presentation_slides',
        summary: `幻灯片任务已创建（job: ${result.jobId}），正在异步生成`,
        content: JSON.stringify({
            job_id: result.jobId,
            job_status: result.status,
            output_path: result.outputPath,
            poll_hint: `GET /api/docs-maker/slides/jobs/${result.jobId}?workspacePath=<workspacePath>`,
            ...result,
        }),
        ok: true,
    };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Execute a single tool call and return its result.
 * Safe: catches all errors and returns them as failed results.
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolExecutionResult> {
    let args: unknown;

    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch (err) {
        return buildFailureResult(toolCall, '工具参数解析失败', err);
    }

    try {
        switch (toolCall.function.name) {
            case 'schedule_reminder':
                return execScheduleReminder(args as ScheduleReminderArgs, toolCall.id);
            case 'list_reminders':
                return execListReminders(toolCall.id);
            case 'cancel_reminder':
                return execCancelReminder(args as CancelReminderArgs, toolCall.id);
            case 'parse_word_draft':
                return await execParseWordDraft(args as ParseWordDraftArgs, toolCall.id);
            case 'render_academic_report':
                return await execRenderAcademicReport(args as RenderAcademicReportArgs, toolCall.id);
            case 'generate_presentation_slides':
                return await execGeneratePresentationSlides(args as GeneratePresentationSlidesArgs, toolCall.id);
            default:
                return {
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    summary: `未知工具：${toolCall.function.name}`,
                    content: JSON.stringify({
                        status: 'error',
                        error_code: 'UNKNOWN_TOOL',
                        message: `Unknown tool: ${toolCall.function.name}`,
                    }),
                    ok: false,
                };
        }
    } catch (err) {
        return buildFailureResult(
            toolCall,
            `${toolCall.function.name} 执行失败`,
            err,
        );
    }
}
