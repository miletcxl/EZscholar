import type {
  CreateSlideJobRequest,
  DocsMakerApiError,
  GenerateSlidesRequest,
  GenerateSlidesResponse,
  ParseWordDraftRequest,
  ParseWordDraftResponse,
  RenderAcademicReportRequest,
  RenderAcademicReportResponse,
  SlideJob,
  UploadDraftRequest,
  UploadDraftResponse,
  UploadMarkdownRequest,
  UploadMarkdownResponse,
} from './types';

class DocsMakerClientError extends Error {
  readonly errorCode: string;
  readonly hint?: string;

  constructor(errorCode: string, message: string, hint?: string) {
    super(message);
    this.name = 'DocsMakerClientError';
    this.errorCode = errorCode;
    this.hint = hint;
  }
}

function formatHttpError(status: number, payloadText: string): DocsMakerClientError {
  return new DocsMakerClientError('HTTP_ERROR', `Docs Maker 接口错误 (${status})：${payloadText || '无响应内容'}`);
}

async function parseError(resp: Response): Promise<never> {
  const text = await resp.text().catch(() => '');
  if (text) {
    try {
      const payload = JSON.parse(text) as DocsMakerApiError;
      throw new DocsMakerClientError(
        payload.error_code || 'UNKNOWN_ERROR',
        payload.message || `Docs Maker 接口错误 (${resp.status})`,
        payload.hint,
      );
    } catch (err) {
      if (err instanceof DocsMakerClientError) {
        throw err;
      }
    }
  }
  throw formatHttpError(resp.status, text);
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    await parseError(resp);
  }
  return (await resp.json()) as T;
}

const BASE_URL = '/api/docs-maker';

export async function uploadDraft(req: UploadDraftRequest): Promise<UploadDraftResponse> {
  const formData = new FormData();
  formData.append('file', req.file);
  formData.append('workspacePath', req.workspacePath);
  if (req.subDir) {
    formData.append('subDir', req.subDir);
  }

  return requestJson<UploadDraftResponse>(`${BASE_URL}/upload-draft`, {
    method: 'POST',
    body: formData,
  });
}

export async function uploadMarkdown(req: UploadMarkdownRequest): Promise<UploadMarkdownResponse> {
  const formData = new FormData();
  formData.append('file', req.file);
  formData.append('workspacePath', req.workspacePath);
  if (req.subDir) {
    formData.append('subDir', req.subDir);
  }

  return requestJson<UploadMarkdownResponse>(`${BASE_URL}/upload-markdown`, {
    method: 'POST',
    body: formData,
  });
}

export async function parseWordDraft(req: ParseWordDraftRequest): Promise<ParseWordDraftResponse> {
  return requestJson<ParseWordDraftResponse>(`${BASE_URL}/parse-word-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function renderAcademicReport(
  req: RenderAcademicReportRequest,
): Promise<RenderAcademicReportResponse> {
  return requestJson<RenderAcademicReportResponse>(`${BASE_URL}/render-academic-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function generatePresentationSlides(
  req: GenerateSlidesRequest,
): Promise<GenerateSlidesResponse> {
  return requestJson<GenerateSlidesResponse>(`${BASE_URL}/generate-presentation-slides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function createSlideJob(req: CreateSlideJobRequest): Promise<SlideJob> {
  return requestJson<SlideJob>(`${BASE_URL}/slides/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function getSlideJob(workspacePath: string, jobId: string): Promise<SlideJob> {
  const qs = new URLSearchParams({
    workspacePath,
  });

  return requestJson<SlideJob>(`${BASE_URL}/slides/jobs/${encodeURIComponent(jobId)}?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function listSlideJobs(params: {
  workspacePath: string;
  limit?: number;
  status?: 'queued' | 'running' | 'succeeded' | 'failed';
}): Promise<SlideJob[]> {
  const qs = new URLSearchParams({
    workspacePath: params.workspacePath,
  });
  if (typeof params.limit === 'number') {
    qs.set('limit', String(params.limit));
  }
  if (params.status) {
    qs.set('status', params.status);
  }

  return requestJson<SlideJob[]>(`${BASE_URL}/slides/jobs?${qs.toString()}`, {
    method: 'GET',
  });
}

export { DocsMakerClientError };
