import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Loader2, Upload } from 'lucide-react';
import {
  parseWordDraft,
  renderAcademicReport,
  uploadDraft,
} from '../../services/docs-maker/client';
import type {
  ParseWordDraftResponse,
  RenderAcademicReportResponse,
  UploadDraftResponse,
} from '../../services/docs-maker/types';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import './OutputGeneratorPanel.css';

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

function switchOutputExt(filePath: string, format: 'pdf' | 'docx') {
  return filePath.replace(/\.(pdf|docx)$/i, `.${format}`);
}

export function OutputGeneratorPanel() {
  const { workspacePath } = useWorkspaceStore();

  const [sessionToken] = useState(() => Date.now());
  const [draftSubDir, setDraftSubDir] = useState('docs-maker/drafts');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draftFilePath, setDraftFilePath] = useState('');
  const [outputAssetDir, setOutputAssetDir] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [outputPath, setOutputPath] = useState('');

  const [uploadResult, setUploadResult] = useState<UploadDraftResponse | null>(null);
  const [parseResult, setParseResult] = useState<ParseWordDraftResponse | null>(null);
  const [renderResult, setRenderResult] = useState<RenderAcademicReportResponse | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [errorHint, setErrorHint] = useState('');

  const defaultAssetDir = useMemo(
    () => joinPath(workspacePath, 'docs-maker', 'assets', String(sessionToken)),
    [sessionToken, workspacePath],
  );

  useEffect(() => {
    setOutputAssetDir(defaultAssetDir);
  }, [defaultAssetDir]);

  useEffect(() => {
    setOutputPath(
      joinPath(workspacePath, 'docs-maker', 'output', `report-${sessionToken}.${format}`),
    );
  }, [format, sessionToken, workspacePath]);

  function resetError() {
    setErrorMessage('');
    setErrorHint('');
  }

  function applyError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const maybeHint =
      err && typeof err === 'object' && 'hint' in err && typeof (err as { hint?: unknown }).hint === 'string'
        ? (err as { hint: string }).hint
        : '';

    setErrorMessage(message);
    setErrorHint(maybeHint);
  }

  async function handleUpload() {
    resetError();

    if (!selectedFile) {
      setErrorMessage('请先选择 .docx 文件。');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setParseResult(null);
    setRenderResult(null);

    try {
      const result = await uploadDraft({
        file: selectedFile,
        workspacePath,
        subDir: draftSubDir || undefined,
      });
      setUploadResult(result);
      setDraftFilePath(result.savedFilePath);
    } catch (err) {
      applyError(err);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleParse() {
    resetError();

    if (!draftFilePath.trim()) {
      setErrorMessage('请填写或上传草稿文件路径。');
      return;
    }

    if (!outputAssetDir.trim()) {
      setErrorMessage('请填写图片输出目录。');
      return;
    }

    setIsParsing(true);
    setParseResult(null);
    setRenderResult(null);

    try {
      const result = await parseWordDraft({
        inputFilePath: draftFilePath.trim(),
        outputAssetDir: outputAssetDir.trim(),
        workspacePath,
      });
      setParseResult(result);
      setMarkdownContent(result.markdownContent);
    } catch (err) {
      applyError(err);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleRender() {
    resetError();

    if (!markdownContent.trim()) {
      setErrorMessage('请先解析草稿或手动填写 Markdown。');
      return;
    }

    if (!outputPath.trim()) {
      setErrorMessage('请填写报告输出路径。');
      return;
    }

    setIsRendering(true);
    setRenderResult(null);

    try {
      const result = await renderAcademicReport({
        markdownContent,
        format,
        outputPath: outputPath.trim(),
        workspacePath,
      });
      setRenderResult(result);
    } catch (err) {
      applyError(err);
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <section className="panel output-generator-panel" data-testid="output-generator-panel">
      <header className="panel-header">
        <h2>Docs Maker（模块二）</h2>
      </header>

      <p className="output-generator-intro">
        上传 Word 草稿后提取图片并转 Markdown，可编辑后渲染为 PDF/Docx，并支持下载与 workspace 落盘。
      </p>

      <div className="output-grid">
        <div className="output-field">
          <label htmlFor="docx-file">草稿文件 (.docx)</label>
          <input
            id="docx-file"
            type="file"
            accept=".docx"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="output-field">
          <label htmlFor="draft-subdir">上传子目录（相对 workspace）</label>
          <input
            id="draft-subdir"
            value={draftSubDir}
            onChange={(event) => setDraftSubDir(event.target.value)}
            placeholder="docs-maker/drafts"
          />
        </div>
      </div>

      <div className="output-actions">
        <button type="button" className="output-btn" onClick={handleUpload} disabled={isUploading}>
          {isUploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
          上传并落盘
        </button>
      </div>

      <div className="output-field">
        <label htmlFor="draft-path">草稿路径（支持手动路径模式）</label>
        <input
          id="draft-path"
          value={draftFilePath}
          onChange={(event) => setDraftFilePath(event.target.value)}
          placeholder="C:\\Users\\...\\workspace\\docs-maker\\drafts\\xxx.docx"
        />
      </div>

      <div className="output-field">
        <label htmlFor="asset-dir">图片输出目录</label>
        <input
          id="asset-dir"
          value={outputAssetDir}
          onChange={(event) => setOutputAssetDir(event.target.value)}
          placeholder="C:\\Users\\...\\workspace\\docs-maker\\assets\\<timestamp>"
        />
      </div>

      <div className="output-actions">
        <button type="button" className="output-btn" onClick={handleParse} disabled={isParsing}>
          {isParsing ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
          解析草稿
        </button>
      </div>

      <div className="output-field">
        <label htmlFor="markdown-content">Markdown（可编辑）</label>
        <textarea
          id="markdown-content"
          rows={12}
          value={markdownContent}
          onChange={(event) => setMarkdownContent(event.target.value)}
          placeholder="解析后 markdown 将显示在这里，可手动修改再渲染"
        />
      </div>

      <div className="output-grid">
        <div className="output-field">
          <label htmlFor="report-format">输出格式</label>
          <select
            id="report-format"
            value={format}
            onChange={(event) => {
              const nextFormat = event.target.value as 'pdf' | 'docx';
              setFormat(nextFormat);
              setOutputPath((prev) => switchOutputExt(prev, nextFormat));
            }}
          >
            <option value="pdf">PDF</option>
            <option value="docx">Docx</option>
          </select>
        </div>

        <div className="output-field">
          <label htmlFor="report-output-path">报告输出路径</label>
          <input
            id="report-output-path"
            value={outputPath}
            onChange={(event) => setOutputPath(event.target.value)}
            placeholder="C:\\Users\\...\\workspace\\docs-maker\\output\\report-xxx.pdf"
          />
        </div>
      </div>

      <div className="output-actions">
        <button type="button" className="output-btn output-btn--primary" onClick={handleRender} disabled={isRendering}>
          {isRendering ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />}
          渲染报告
        </button>
      </div>

      {(uploadResult || parseResult || renderResult) && (
        <div className="output-result" data-testid="output-result">
          {uploadResult && (
            <p>
              已上传：<code>{uploadResult.savedFilePath}</code>
            </p>
          )}
          {parseResult && (
            <p>
              解析成功：提取图片 {parseResult.assetFiles.length} 张，目录 <code>{parseResult.outputAssetDir}</code>
            </p>
          )}
          {renderResult && (
            <>
              <p>
                渲染成功：<code>{renderResult.outputPath}</code>
              </p>
              <p>引擎：{renderResult.engineUsed}</p>
              <a className="output-download-link" href={renderResult.downloadUrl}>
                下载文件
              </a>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="output-error" role="alert" data-testid="output-error">
          <p>{errorMessage}</p>
          {errorHint && <p className="output-error-hint">提示：{errorHint}</p>}
        </div>
      )}
    </section>
  );
}
