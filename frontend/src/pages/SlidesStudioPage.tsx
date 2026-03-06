import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import {
  createSlideJob,
  getSlideJob,
  listSlideJobs,
  uploadMarkdown,
} from '../services/docs-maker/client';
import type { SlideJob } from '../services/docs-maker/types';
import { useOutputGeneratorStore } from '../stores/useOutputGeneratorStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import './SlidesStudioPage.css';

type SourceMode = 'upload_md' | 'markdown_path' | 'external_prompt';

function joinPath(base: string, ...segments: string[]) {
  const useBackslash = /\\/.test(base);
  const sep = useBackslash ? '\\' : '/';
  const normalizedBase = base.replace(/[\\/]+$/, '');
  const normalizedSegments = segments
    .map((segment) => segment.replace(/[\\/]+/g, sep).replace(/^[\\/]+|[\\/]+$/g, ''))
    .filter(Boolean);

  if (normalizedSegments.length === 0) {
    return normalizedBase;
  }

  return [normalizedBase, ...normalizedSegments].join(sep);
}

function splitArgs(input: string): string[] {
  return input
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const POLL_MS = 1500;

export function SlidesStudioPage() {
  const { workspacePath } = useWorkspaceStore();
  const slidesConfig = useOutputGeneratorStore((state) => state.slidesConfig);
  const upsertProvider = useOutputGeneratorStore((state) => state.upsertProvider);
  const setDefaultProviderId = useOutputGeneratorStore((state) => state.setDefaultProviderId);
  const updateMarpConfig = useOutputGeneratorStore((state) => state.updateMarpConfig);

  const [sourceMode, setSourceMode] = useState<SourceMode>('upload_md');
  const [markdownFile, setMarkdownFile] = useState<File | null>(null);
  const [markdownFilePath, setMarkdownFilePath] = useState('');
  const [externalPrompt, setExternalPrompt] = useState('');

  const [outputPath, setOutputPath] = useState('');
  const [title, setTitle] = useState('slides-from-ui');

  const [currentJob, setCurrentJob] = useState<SlideJob | null>(null);
  const [jobHistory, setJobHistory] = useState<SlideJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorHint, setErrorHint] = useState('');

  const activeProvider = useMemo(() => {
    return (
      slidesConfig.providers.find((provider) => provider.id === slidesConfig.defaultProviderId)
      ?? slidesConfig.providers[0]
      ?? null
    );
  }, [slidesConfig.defaultProviderId, slidesConfig.providers]);

  useEffect(() => {
    setOutputPath(joinPath(workspacePath, 'docs-maker', 'slides', 'output', `slides-${Date.now()}.pptx`));
  }, [workspacePath]);

  const refreshHistory = useCallback(async () => {
    if (!workspacePath.trim()) {
      return;
    }
    setIsLoadingHistory(true);
    try {
      const jobs = await listSlideJobs({
        workspacePath,
        limit: 20,
      });
      setJobHistory(jobs);
    } catch (error) {
      console.warn('failed to load slide jobs history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    if (!currentJob || (currentJob.status !== 'queued' && currentJob.status !== 'running')) {
      return;
    }

    let stopped = false;
    const timer = setInterval(() => {
      void getSlideJob(workspacePath, currentJob.jobId)
        .then((job) => {
          if (stopped) {
            return;
          }
          setCurrentJob(job);
          if (job.status === 'succeeded' || job.status === 'failed') {
            void refreshHistory();
          }
        })
        .catch((error) => {
          if (!stopped) {
            console.warn('slide job polling failed', error);
          }
        });
    }, POLL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [currentJob, refreshHistory, workspacePath]);

  function applyError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = err && typeof err === 'object' && 'hint' in err && typeof (err as { hint?: unknown }).hint === 'string'
      ? (err as { hint: string }).hint
      : '';
    setErrorMessage(message);
    setErrorHint(hint);
  }

  function clearError() {
    setErrorMessage('');
    setErrorHint('');
  }

  async function handleCreateJob() {
    clearError();
    if (!workspacePath.trim()) {
      setErrorMessage('workspace 未配置。');
      return;
    }

    setIsSubmitting(true);
    try {
      let createPayload: Parameters<typeof createSlideJob>[0] = {
        workspacePath,
        outputPath: outputPath.trim() || undefined,
        title: title.trim() || undefined,
      };

      if (sourceMode === 'upload_md') {
        if (!markdownFile) {
          setErrorMessage('请先选择 markdown 文件。');
          setIsSubmitting(false);
          return;
        }
        const uploaded = await uploadMarkdown({
          file: markdownFile,
          workspacePath,
          subDir: 'docs-maker/slides/markdown',
        });
        setMarkdownFilePath(uploaded.savedFilePath);
        createPayload = {
          ...createPayload,
          markdownFilePath: uploaded.savedFilePath,
        };
      } else if (sourceMode === 'markdown_path') {
        if (!markdownFilePath.trim()) {
          setErrorMessage('请填写 markdown 路径。');
          setIsSubmitting(false);
          return;
        }
        createPayload = {
          ...createPayload,
          markdownFilePath: markdownFilePath.trim(),
        };
      } else {
        if (!externalPrompt.trim()) {
          setErrorMessage('请填写 external prompt。');
          setIsSubmitting(false);
          return;
        }
        createPayload = {
          ...createPayload,
          externalPrompt: externalPrompt.trim(),
          providerId: slidesConfig.defaultProviderId,
        };
      }

      const created = await createSlideJob(createPayload);
      setCurrentJob(created);
      await refreshHistory();
    } catch (error) {
      applyError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="slides-studio-page">
      <section className="panel">
        <header className="panel-header">
          <h2>Slides Studio</h2>
        </header>
        <p className="slides-studio-intro">
          流程：获取 Markdown（上传/路径/外部工具）→ 异步生成 PPTX（Marp CLI）。
        </p>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h3>输入来源</h3>
        </header>
        <div className="slides-mode-row">
          <label>
            <input
              type="radio"
              name="slides-source"
              checked={sourceMode === 'upload_md'}
              onChange={() => setSourceMode('upload_md')}
            />
            上传 .md
          </label>
          <label>
            <input
              type="radio"
              name="slides-source"
              checked={sourceMode === 'markdown_path'}
              onChange={() => setSourceMode('markdown_path')}
            />
            已有 markdown 路径
          </label>
          <label>
            <input
              type="radio"
              name="slides-source"
              checked={sourceMode === 'external_prompt'}
              onChange={() => setSourceMode('external_prompt')}
            />
            外部工具生成 markdown
          </label>
        </div>

        {sourceMode === 'upload_md' && (
          <div className="slides-field">
            <label htmlFor="slides-md-upload">选择 markdown 文件</label>
            <input
              id="slides-md-upload"
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={(event) => setMarkdownFile(event.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {sourceMode === 'markdown_path' && (
          <div className="slides-field">
            <label htmlFor="slides-md-path">markdown 路径</label>
            <input
              id="slides-md-path"
              value={markdownFilePath}
              onChange={(event) => setMarkdownFilePath(event.target.value)}
              placeholder="C:\\Users\\...\\workspace\\docs-maker\\slides\\markdown\\x.md"
            />
          </div>
        )}

        {sourceMode === 'external_prompt' && (
          <div className="slides-field">
            <label htmlFor="slides-external-prompt">external prompt</label>
            <textarea
              id="slides-external-prompt"
              rows={6}
              value={externalPrompt}
              onChange={(event) => setExternalPrompt(event.target.value)}
              placeholder="请基于以下要点生成 10 页演示文稿 markdown..."
            />
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h3>输出与执行</h3>
        </header>
        <div className="slides-grid">
          <div className="slides-field">
            <label htmlFor="slides-title">任务标题</label>
            <input
              id="slides-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="slides-from-ui"
            />
          </div>
          <div className="slides-field">
            <label htmlFor="slides-output-path">PPTX 输出路径</label>
            <input
              id="slides-output-path"
              value={outputPath}
              onChange={(event) => setOutputPath(event.target.value)}
              placeholder="C:\\Users\\...\\workspace\\docs-maker\\slides\\output\\slides.pptx"
            />
          </div>
        </div>
        <button type="button" className="slides-btn slides-btn--primary" onClick={handleCreateJob} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          创建 PPTX 任务
        </button>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h3>Provider 与 Marp 配置（workspace 持久化）</h3>
        </header>
        <div className="slides-grid">
          <div className="slides-field">
            <label htmlFor="slides-provider-id">默认 Provider ID</label>
            <input
              id="slides-provider-id"
              value={slidesConfig.defaultProviderId}
              onChange={(event) => {
                const next = event.target.value.trim();
                const normalizedId = next || activeProvider?.id || 'generic-webhook-default';
                setDefaultProviderId(normalizedId);
                if (activeProvider) {
                  upsertProvider({
                    ...activeProvider,
                    id: normalizedId,
                    label: activeProvider.label,
                  });
                }
              }}
            />
          </div>
          <div className="slides-field">
            <label htmlFor="slides-provider-url">Webhook URL</label>
            <input
              id="slides-provider-url"
              value={activeProvider?.webhookUrl ?? ''}
              onChange={(event) => {
                const providerId = slidesConfig.defaultProviderId || 'generic-webhook-default';
                upsertProvider({
                  id: providerId,
                  label: activeProvider?.label ?? providerId,
                  kind: 'generic-webhook',
                  webhookUrl: event.target.value,
                  authToken: activeProvider?.authToken ?? '',
                  timeoutMs: activeProvider?.timeoutMs ?? 45_000,
                  headers: activeProvider?.headers ?? {},
                });
              }}
              placeholder="https://example.com/slides-markdown-webhook"
            />
          </div>
          <div className="slides-field">
            <label htmlFor="slides-provider-token">Auth Token</label>
            <input
              id="slides-provider-token"
              value={activeProvider?.authToken ?? ''}
              onChange={(event) => {
                const providerId = slidesConfig.defaultProviderId || 'generic-webhook-default';
                upsertProvider({
                  id: providerId,
                  label: activeProvider?.label ?? providerId,
                  kind: 'generic-webhook',
                  webhookUrl: activeProvider?.webhookUrl ?? '',
                  authToken: event.target.value,
                  timeoutMs: activeProvider?.timeoutMs ?? 45_000,
                  headers: activeProvider?.headers ?? {},
                });
              }}
            />
          </div>
          <div className="slides-field">
            <label htmlFor="slides-provider-timeout">Provider Timeout (ms)</label>
            <input
              id="slides-provider-timeout"
              type="number"
              value={activeProvider?.timeoutMs ?? 45_000}
              onChange={(event) => {
                const providerId = slidesConfig.defaultProviderId || 'generic-webhook-default';
                upsertProvider({
                  id: providerId,
                  label: activeProvider?.label ?? providerId,
                  kind: 'generic-webhook',
                  webhookUrl: activeProvider?.webhookUrl ?? '',
                  authToken: activeProvider?.authToken ?? '',
                  timeoutMs: Number(event.target.value) || 45_000,
                  headers: activeProvider?.headers ?? {},
                });
              }}
            />
          </div>
        </div>
        <div className="slides-grid">
          <div className="slides-field">
            <label htmlFor="slides-marp-command">Marp Command</label>
            <input
              id="slides-marp-command"
              value={slidesConfig.marp.command}
              onChange={(event) => updateMarpConfig({ command: event.target.value })}
            />
          </div>
          <div className="slides-field">
            <label htmlFor="slides-marp-args">Marp Base Args (空格分隔)</label>
            <input
              id="slides-marp-args"
              value={slidesConfig.marp.baseArgs.join(' ')}
              onChange={(event) => updateMarpConfig({ baseArgs: splitArgs(event.target.value) })}
            />
          </div>
        </div>
      </section>

      {(currentJob || jobHistory.length > 0) && (
        <section className="panel">
          <header className="panel-header">
            <h3>任务状态</h3>
          </header>
          {currentJob && (
            <div className="slides-job-card">
              <p>
                当前任务：<code>{currentJob.jobId}</code>
              </p>
              <p>状态：{currentJob.status}</p>
              <p>
                输出：<code>{currentJob.outputPath}</code>
              </p>
              {currentJob.downloadUrl && currentJob.status === 'succeeded' && (
                <a className="slides-download-link" href={currentJob.downloadUrl}>
                  下载 PPTX
                </a>
              )}
              {currentJob.status === 'failed' && (
                <p className="slides-job-error">
                  失败：{currentJob.errorCode} - {currentJob.errorMessage}
                </p>
              )}
            </div>
          )}
          <div className="slides-history">
            <p>{isLoadingHistory ? '加载历史中...' : `最近任务 ${jobHistory.length} 条`}</p>
            {jobHistory.map((job) => (
              <div key={job.jobId} className="slides-history-row">
                <span>{job.jobId}</span>
                <span>{job.status}</span>
                <span>{new Date(job.updatedAt).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {errorMessage && (
        <section className="panel slides-error-panel" role="alert">
          <p>{errorMessage}</p>
          {errorHint && <p className="slides-error-hint">提示：{errorHint}</p>}
        </section>
      )}

      <section className="panel slides-tip-panel">
        <p>
          <FileUp size={14} />
          也可以在首页 AI 对话中直接调用 <code>generate_presentation_slides</code> 创建任务。
        </p>
      </section>
    </div>
  );
}
