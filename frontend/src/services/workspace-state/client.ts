import type {
  WorkspaceBootstrapResponse,
  WorkspaceGetEventsRequest,
  WorkspaceMigrateFromLocalStorageRequest,
  WorkspacePostEventRequest,
  WorkspacePostEventResponse,
  WorkspacePutConfigRequest,
  WorkspaceEvent,
  WorkspaceConfig,
} from './types';

const BASE_URL = '/api/workspace-state';

interface ApiErrorPayload {
  error_code?: string;
  message?: string;
  hint?: string;
}

class WorkspaceStateError extends Error {
  readonly errorCode?: string;
  readonly hint?: string;
  readonly status: number;

  constructor(message: string, status: number, errorCode?: string, hint?: string) {
    super(message);
    this.name = 'WorkspaceStateError';
    this.status = status;
    this.errorCode = errorCode;
    this.hint = hint;
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await resp.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }
    throw new WorkspaceStateError(
      payload?.message ?? `Request failed with ${resp.status}`,
      resp.status,
      payload?.error_code,
      payload?.hint,
    );
  }
  return (await resp.json()) as T;
}

export async function bootstrapWorkspaceState(workspacePath: string): Promise<WorkspaceBootstrapResponse> {
  const qs = new URLSearchParams({ workspacePath });
  return requestJson<WorkspaceBootstrapResponse>(`${BASE_URL}/bootstrap?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function putWorkspaceConfig(req: WorkspacePutConfigRequest): Promise<WorkspaceConfig> {
  return requestJson<WorkspaceConfig>(`${BASE_URL}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function postWorkspaceEvent(req: WorkspacePostEventRequest): Promise<WorkspacePostEventResponse> {
  return requestJson<WorkspacePostEventResponse>(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}

export async function getWorkspaceEvents(req: WorkspaceGetEventsRequest): Promise<WorkspaceEvent[]> {
  const qs = new URLSearchParams({
    workspacePath: req.workspacePath,
  });
  if (typeof req.limit === 'number') {
    qs.set('limit', String(req.limit));
  }
  if (req.moduleId) {
    qs.set('moduleId', req.moduleId);
  }
  if (req.from) {
    qs.set('from', req.from);
  }
  if (req.to) {
    qs.set('to', req.to);
  }

  return requestJson<WorkspaceEvent[]>(`${BASE_URL}/events?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function migrateFromLocalStorage(
  req: WorkspaceMigrateFromLocalStorageRequest,
): Promise<WorkspaceBootstrapResponse> {
  return requestJson<WorkspaceBootstrapResponse>(`${BASE_URL}/migrate-from-localstorage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
}
