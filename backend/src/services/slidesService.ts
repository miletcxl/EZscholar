import crypto from 'node:crypto';
import { execFile as execFileCb } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  CreateSlideJobSchema,
  DocsMakerError,
  ListSlideJobsQuerySchema,
  SlideJobSchema,
  SlideJobsStoreSchema,
  type CreateSlideJobRequest,
  type ListSlideJobsQuery,
  type SlideJob,
  type SlideJobsStore,
  type SlidesModuleConfig,
  type SlidesProviderConfig,
} from '../types.js';
import { ensureDir, ensureWithinWorkspace } from './pathGuard.js';
import { bootstrapWorkspaceState, postWorkspaceEvent } from './workspaceState.js';

const execFile = promisify(execFileCb);
const DEFAULT_SLIDE_JOBS_LIMIT = 100;
const MAX_SLIDE_JOBS = 500;

interface SlidePaths {
  workspaceRoot: string;
  slidesMarkdownDir: string;
  slidesOutputDir: string;
  slideJobsFilePath: string;
}

interface WebhookMarkdownResult {
  markdownContent?: string;
  markdownFilePath?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function makeSlideJobId() {
  return `slide-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resolveSlidePaths(workspacePath: string): SlidePaths {
  const { workspaceRoot } = ensureWithinWorkspace(workspacePath, workspacePath);
  const slidesMarkdownDir = path.join(workspaceRoot, 'docs-maker', 'slides', 'markdown');
  const slidesOutputDir = path.join(workspaceRoot, 'docs-maker', 'slides', 'output');
  const slideJobsFilePath = path.join(workspaceRoot, '.ezscholar', 'state', 'slide-jobs.json');

  ensureWithinWorkspace(slidesMarkdownDir, workspaceRoot);
  ensureWithinWorkspace(slidesOutputDir, workspaceRoot);
  ensureWithinWorkspace(slideJobsFilePath, workspaceRoot);

  return {
    workspaceRoot,
    slidesMarkdownDir,
    slidesOutputDir,
    slideJobsFilePath,
  };
}

function createDefaultSlidesConfig(): SlidesModuleConfig {
  return {
    defaultProviderId: 'generic-webhook-default',
    providers: [],
    marp: {
      command: 'marp',
      baseArgs: ['--allow-local-files', '--no-stdin'],
      timeoutMs: 120_000,
    },
  };
}

function createDefaultSlideJobsStore(): SlideJobsStore {
  return {
    version: 1,
    updatedAt: nowIso(),
    jobs: [],
  };
}

async function ensureSlideDirs(paths: SlidePaths) {
  await ensureDir(paths.slidesMarkdownDir);
  await ensureDir(paths.slidesOutputDir);
  await ensureDir(path.dirname(paths.slideJobsFilePath));
}

async function writeJsonAtomic(filePath: string, payload: unknown) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

async function loadSlideJobsStore(paths: SlidePaths): Promise<SlideJobsStore> {
  const fallback = createDefaultSlideJobsStore();
  try {
    const raw = await fs.readFile(paths.slideJobsFilePath, 'utf-8');
    const parsed = SlideJobsStoreSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
    await writeJsonAtomic(paths.slideJobsFilePath, fallback);
    return fallback;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      await writeJsonAtomic(paths.slideJobsFilePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function saveSlideJobsStore(paths: SlidePaths, store: SlideJobsStore) {
  await writeJsonAtomic(paths.slideJobsFilePath, {
    ...store,
    version: 1,
    updatedAt: nowIso(),
  } satisfies SlideJobsStore);
}

async function emitSlidesEvent(workspacePath: string, event: Parameters<typeof postWorkspaceEvent>[0]['event']) {
  await postWorkspaceEvent({
    workspacePath,
    event,
  }).catch(() => {
    // Keep slide job flow resilient even if history write-back fails.
  });
}

function buildSlideDownloadUrl(workspacePath: string, outputPath: string) {
  return `/api/docs-maker/download?path=${encodeURIComponent(outputPath)}&workspacePath=${encodeURIComponent(workspacePath)}`;
}

function resolveSlideJobSource(req: CreateSlideJobRequest): {
  sourceType: SlideJob['sourceType'];
  markdownContent?: string;
  markdownFilePath?: string;
  externalPrompt?: string;
  providerId?: string;
} {
  const parsed = CreateSlideJobSchema.parse(req);

  if (parsed.markdownContent?.trim()) {
    return {
      sourceType: 'markdown_content',
      markdownContent: parsed.markdownContent.trim(),
    };
  }
  if (parsed.markdownFilePath?.trim()) {
    return {
      sourceType: 'markdown_file',
      markdownFilePath: parsed.markdownFilePath.trim(),
    };
  }
  return {
    sourceType: 'external_prompt',
    externalPrompt: parsed.externalPrompt?.trim(),
    providerId: parsed.providerId?.trim(),
  };
}

async function assertWritableWorkspace(workspaceRoot: string) {
  try {
    await fs.access(workspaceRoot, fsConstants.W_OK);
  } catch {
    throw new DocsMakerError(
      'WORKSPACE_NOT_WRITABLE',
      `工作区不可写: ${workspaceRoot}`,
      403,
      '请检查 workspace 路径权限，确保当前用户可写入该目录。',
    );
  }
}

async function withUpdatedSlideJob(
  paths: SlidePaths,
  jobId: string,
  updater: (current: SlideJob) => SlideJob,
): Promise<SlideJob> {
  const store = await loadSlideJobsStore(paths);
  const idx = store.jobs.findIndex((job) => job.jobId === jobId);
  if (idx < 0) {
    throw new DocsMakerError('SLIDE_JOB_NOT_FOUND', `未找到幻灯片任务: ${jobId}`, 404);
  }
  const updated = SlideJobSchema.parse(updater(store.jobs[idx]));
  store.jobs[idx] = updated;
  await saveSlideJobsStore(paths, store);
  return updated;
}

async function invokeGenericWebhookProvider(params: {
  provider: SlidesProviderConfig;
  prompt: string;
  workspacePath: string;
  providerId: string;
}): Promise<WebhookMarkdownResult> {
  const timeoutMs = params.provider.timeoutMs ?? 45_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(params.provider.headers ?? {}),
    };
    if (params.provider.authToken?.trim()) {
      headers.Authorization = `Bearer ${params.provider.authToken.trim()}`;
    }

    const resp = await fetch(params.provider.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: params.prompt,
        workspacePath: params.workspacePath,
        providerId: params.providerId,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new DocsMakerError(
        'WEBHOOK_REQUEST_FAILED',
        `外部 Markdown Webhook 请求失败 (${resp.status})：${body || '无响应内容'}`,
        502,
        '请检查 provider webhook 地址、鉴权 token 以及服务可用性。',
      );
    }

    const payload = (await resp.json()) as Record<string, unknown>;
    const markdownContent =
      typeof payload.markdownContent === 'string'
        ? payload.markdownContent
        : typeof payload.markdown_content === 'string'
          ? payload.markdown_content
          : undefined;
    const markdownFilePath =
      typeof payload.markdownFilePath === 'string'
        ? payload.markdownFilePath
        : typeof payload.markdown_file_path === 'string'
          ? payload.markdown_file_path
          : undefined;

    if (!markdownContent?.trim() && !markdownFilePath?.trim()) {
      throw new DocsMakerError(
        'WEBHOOK_REQUEST_FAILED',
        '外部 Markdown Webhook 响应缺少 markdownContent 或 markdownFilePath。',
        502,
        '请让外部服务返回 markdownContent（字符串）或 markdownFilePath（workspace 内路径）。',
      );
    }

    return {
      markdownContent: markdownContent?.trim(),
      markdownFilePath: markdownFilePath?.trim(),
    };
  } catch (error) {
    if (error instanceof DocsMakerError) {
      throw error;
    }
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      throw new DocsMakerError(
        'WEBHOOK_TIMEOUT',
        `外部 Markdown Webhook 超时（>${timeoutMs}ms）。`,
        504,
        '请检查外部服务耗时，或提高 provider.timeoutMs。',
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new DocsMakerError(
      'WEBHOOK_REQUEST_FAILED',
      `外部 Markdown Webhook 调用异常：${message}`,
      502,
      '请检查网络连通性、Webhook 地址与鉴权配置。',
    );
  } finally {
    clearTimeout(timer);
  }
}

async function renderMarkdownToPptxWithMarp(params: {
  markdownFilePath: string;
  outputPath: string;
  workspaceRoot: string;
  marp: SlidesModuleConfig['marp'];
}) {
  const marp = params.marp ?? createDefaultSlidesConfig().marp;
  const baseArgs = [...(marp.baseArgs ?? [])];
  if (!baseArgs.includes('--no-stdin')) {
    baseArgs.push('--no-stdin');
  }
  const args = [...baseArgs, params.markdownFilePath, '--pptx', '-o', params.outputPath];

  try {
    await execFile(marp.command || 'marp', args, {
      cwd: params.workspaceRoot,
      timeout: marp.timeoutMs ?? 120_000,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      throw new DocsMakerError(
        'MARP_NOT_FOUND',
        '幻灯片渲染失败：未检测到 marp 命令。',
        500,
        '请安装 Marp CLI（例如 npm i -g @marp-team/marp-cli）或在配置中指定可执行命令路径。',
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new DocsMakerError(
      'SLIDES_RENDER_FAILED',
      `幻灯片渲染失败：${message}`,
      500,
      '请检查 markdown 内容是否符合 Marp 语法，并确认 marp 命令可执行。',
    );
  }
}

export async function createSlideJob(req: CreateSlideJobRequest): Promise<SlideJob> {
  const parsed = CreateSlideJobSchema.parse(req);
  const source = resolveSlideJobSource(parsed);
  const paths = resolveSlidePaths(parsed.workspacePath);
  await ensureSlideDirs(paths);
  await assertWritableWorkspace(paths.workspaceRoot);

  const jobId = makeSlideJobId();
  const createdAt = nowIso();

  const resolvedOutputPath = parsed.outputPath?.trim()
    ? ensureWithinWorkspace(parsed.outputPath, paths.workspaceRoot).absoluteTarget
    : path.join(paths.slidesOutputDir, `${sanitizeFilename(jobId)}.pptx`);
  const { absoluteTarget: outputPath, relativePath: relativeOutputPath } = ensureWithinWorkspace(
    resolvedOutputPath,
    paths.workspaceRoot,
  );
  await ensureDir(path.dirname(outputPath));

  let markdownFilePath: string | undefined;
  if (source.sourceType === 'markdown_content' && source.markdownContent) {
    markdownFilePath = path.join(paths.slidesMarkdownDir, `${sanitizeFilename(jobId)}.md`);
    await fs.writeFile(markdownFilePath, source.markdownContent, 'utf-8');
  } else if (source.sourceType === 'markdown_file' && source.markdownFilePath) {
    markdownFilePath = ensureWithinWorkspace(source.markdownFilePath, paths.workspaceRoot).absoluteTarget;
    try {
      await fs.access(markdownFilePath, fsConstants.R_OK);
    } catch {
      throw new DocsMakerError(
        'FILE_NOT_FOUND',
        `Markdown 文件不存在或不可读：${markdownFilePath}`,
        404,
        '请确认 markdown_file_path 存在且在 workspace 目录中。',
      );
    }
  }

  const job: SlideJob = SlideJobSchema.parse({
    jobId,
    workspacePath: paths.workspaceRoot,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    sourceType: source.sourceType,
    providerId: source.providerId,
    markdownFilePath,
    outputPath,
    relativeOutputPath,
    externalPrompt: source.externalPrompt,
    title: parsed.title?.trim() || undefined,
  });

  const store = await loadSlideJobsStore(paths);
  const nextJobs = [job, ...store.jobs].slice(0, MAX_SLIDE_JOBS);
  await saveSlideJobsStore(paths, {
    ...store,
    jobs: nextJobs,
  });

  await emitSlidesEvent(paths.workspaceRoot, {
    moduleId: 'slides-studio',
    type: 'slides.job.created',
    level: 'info',
    message: `幻灯片任务已创建：${jobId}`,
    payload: {
      jobId,
      sourceType: job.sourceType,
      outputPath: job.outputPath,
    },
  });

  void runSlideJob({
    workspacePath: paths.workspaceRoot,
    jobId,
  }).catch(() => {
    // runSlideJob handles failure state transitions; swallow to avoid unhandled rejection.
  });

  return job;
}

export async function runSlideJob(params: { workspacePath: string; jobId: string }): Promise<SlideJob> {
  const paths = resolveSlidePaths(params.workspacePath);
  await ensureSlideDirs(paths);

  let runningJob = await withUpdatedSlideJob(paths, params.jobId, (current) => ({
    ...current,
    status: 'running',
    updatedAt: nowIso(),
    errorCode: undefined,
    errorMessage: undefined,
    hint: undefined,
  }));

  await emitSlidesEvent(paths.workspaceRoot, {
    moduleId: 'slides-studio',
    type: 'slides.render.started',
    level: 'info',
    message: `幻灯片渲染开始：${runningJob.jobId}`,
    payload: {
      jobId: runningJob.jobId,
      sourceType: runningJob.sourceType,
      outputPath: runningJob.outputPath,
    },
  });

  try {
    const { config } = await bootstrapWorkspaceState(paths.workspaceRoot);
    const slidesConfig = config.modules['output-generator']?.slides ?? createDefaultSlidesConfig();
    let markdownFilePath = runningJob.markdownFilePath;

    if (runningJob.sourceType === 'external_prompt') {
      const providerId = runningJob.providerId || slidesConfig.defaultProviderId;
      const provider = slidesConfig.providers.find((item) => item.id === providerId);
      if (!provider) {
        throw new DocsMakerError(
          'WEBHOOK_REQUEST_FAILED',
          `未找到外部 Markdown provider: ${providerId}`,
          400,
          '请先在设置中配置有效的 slides provider。',
        );
      }
      if (!runningJob.externalPrompt?.trim()) {
        throw new DocsMakerError(
          'WEBHOOK_REQUEST_FAILED',
          'external_prompt 不能为空。',
          400,
          '请提供 external_prompt 作为外部工具生成 markdown 的输入。',
        );
      }

      const webhookResult = await invokeGenericWebhookProvider({
        provider,
        prompt: runningJob.externalPrompt.trim(),
        workspacePath: paths.workspaceRoot,
        providerId,
      });

      if (webhookResult.markdownContent?.trim()) {
        markdownFilePath = path.join(paths.slidesMarkdownDir, `${sanitizeFilename(runningJob.jobId)}-external.md`);
        await fs.writeFile(markdownFilePath, webhookResult.markdownContent, 'utf-8');
      } else if (webhookResult.markdownFilePath?.trim()) {
        markdownFilePath = ensureWithinWorkspace(webhookResult.markdownFilePath, paths.workspaceRoot).absoluteTarget;
      }

      await emitSlidesEvent(paths.workspaceRoot, {
        moduleId: 'slides-studio',
        type: 'slides.markdown.ready',
        level: 'info',
        message: `外部 Markdown 已就绪：${runningJob.jobId}`,
        payload: {
          jobId: runningJob.jobId,
          providerId,
          markdownFilePath,
        },
      });
    }

    if (!markdownFilePath) {
      throw new DocsMakerError(
        'SLIDES_RENDER_FAILED',
        '幻灯片渲染失败：未找到可用的 markdown 文件路径。',
        500,
        '请检查 markdown 输入来源是否正确。',
      );
    }

    ensureWithinWorkspace(markdownFilePath, paths.workspaceRoot);
    try {
      await fs.access(markdownFilePath, fsConstants.R_OK);
    } catch {
      throw new DocsMakerError(
        'FILE_NOT_FOUND',
        `Markdown 文件不存在或不可读：${markdownFilePath}`,
        404,
        '请检查 markdown 输入路径或外部工具返回的 markdownFilePath。',
      );
    }

    await renderMarkdownToPptxWithMarp({
      markdownFilePath,
      outputPath: runningJob.outputPath,
      workspaceRoot: paths.workspaceRoot,
      marp: slidesConfig.marp,
    });

    runningJob = await withUpdatedSlideJob(paths, params.jobId, (current) => ({
      ...current,
      status: 'succeeded',
      markdownFilePath,
      updatedAt: nowIso(),
      downloadUrl: buildSlideDownloadUrl(paths.workspaceRoot, current.outputPath),
      errorCode: undefined,
      errorMessage: undefined,
      hint: undefined,
    }));

    await emitSlidesEvent(paths.workspaceRoot, {
      moduleId: 'slides-studio',
      type: 'slides.generated',
      level: 'success',
      message: `幻灯片已生成：${runningJob.outputPath}`,
      payload: {
        jobId: runningJob.jobId,
        outputPath: runningJob.outputPath,
        markdownFilePath: runningJob.markdownFilePath,
        providerId: runningJob.providerId,
      },
    });

    return runningJob;
  } catch (error) {
    const docsErr =
      error instanceof DocsMakerError
        ? error
        : new DocsMakerError(
            'SLIDES_RENDER_FAILED',
            `幻灯片渲染失败：${error instanceof Error ? error.message : String(error)}`,
            500,
            '请检查外部 provider 或 marp 命令是否可用。',
          );

    const failedJob = await withUpdatedSlideJob(paths, params.jobId, (current) => ({
      ...current,
      status: 'failed',
      updatedAt: nowIso(),
      errorCode: docsErr.code,
      errorMessage: docsErr.message,
      hint: docsErr.hint,
    }));

    await emitSlidesEvent(paths.workspaceRoot, {
      moduleId: 'slides-studio',
      type: 'slides.render.failed',
      level: 'error',
      message: `幻灯片渲染失败：${failedJob.jobId}`,
      payload: {
        jobId: failedJob.jobId,
        errorCode: docsErr.code,
        errorMessage: docsErr.message,
      },
    });

    return failedJob;
  }
}

export async function getSlideJob(params: { workspacePath: string; jobId: string }): Promise<SlideJob> {
  const paths = resolveSlidePaths(params.workspacePath);
  await ensureSlideDirs(paths);
  const store = await loadSlideJobsStore(paths);
  const found = store.jobs.find((job) => job.jobId === params.jobId);
  if (!found) {
    throw new DocsMakerError('SLIDE_JOB_NOT_FOUND', `未找到幻灯片任务: ${params.jobId}`, 404);
  }
  return found;
}

export async function listSlideJobs(query: ListSlideJobsQuery): Promise<SlideJob[]> {
  const parsed = ListSlideJobsQuerySchema.parse(query);
  const paths = resolveSlidePaths(parsed.workspacePath);
  await ensureSlideDirs(paths);
  const store = await loadSlideJobsStore(paths);
  const limit = parsed.limit ?? DEFAULT_SLIDE_JOBS_LIMIT;

  return store.jobs
    .filter((job) => (parsed.status ? job.status === parsed.status : true))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}
