import crypto from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DocsMakerError,
  ModuleSnapshotsSchema,
  ReminderSnapshotSchema,
  WorkspaceConfigSchema,
  WorkspaceEventSchema,
  type ModuleSnapshots,
  type WorkspaceConfig,
  type WorkspaceEvent,
  type WorkspaceGetEventsQuery,
  type WorkspaceMigrateFromLocalStorageRequest,
  type WorkspacePostEventRequest,
  type WorkspacePutConfigRequest,
} from '../types.js';
import { ensureDir, ensureWithinWorkspace } from './pathGuard.js';

const STATE_DIR_NAME = '.ezscholar';
const EVENTS_ROTATE_BYTES = 20 * 1024 * 1024;
const DEFAULT_RECENT_EVENTS_LIMIT = 100;

interface WorkspaceStatePaths {
  workspaceRoot: string;
  stateRoot: string;
  configFilePath: string;
  eventsDirPath: string;
  activeEventsFilePath: string;
  snapshotsFilePath: string;
  migrationFilePath: string;
}

interface WorkspaceMigrationMeta {
  migrated: boolean;
  source: string | null;
  migratedAt: string | null;
}

export interface WorkspaceBootstrapResponse {
  config: WorkspaceConfig;
  moduleSnapshots: ModuleSnapshots;
  recentEvents: WorkspaceEvent[];
  migration: WorkspaceMigrationMeta;
}

export interface WorkspacePostEventResponse {
  event: WorkspaceEvent;
  moduleSnapshots: ModuleSnapshots;
}

function nowIso() {
  return new Date().toISOString();
}

function makeEventId() {
  return `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function resolveWorkspaceStatePaths(workspacePath: string): WorkspaceStatePaths {
  const { workspaceRoot } = ensureWithinWorkspace(workspacePath, workspacePath);
  const stateRoot = path.join(workspaceRoot, STATE_DIR_NAME);
  ensureWithinWorkspace(stateRoot, workspaceRoot);

  const configFilePath = path.join(stateRoot, 'config.json');
  const eventsDirPath = path.join(stateRoot, 'history');
  const activeEventsFilePath = path.join(eventsDirPath, 'events.jsonl');
  const snapshotsFilePath = path.join(stateRoot, 'state', 'module-snapshots.json');
  const migrationFilePath = path.join(stateRoot, 'meta', 'migration.json');

  ensureWithinWorkspace(configFilePath, workspaceRoot);
  ensureWithinWorkspace(eventsDirPath, workspaceRoot);
  ensureWithinWorkspace(activeEventsFilePath, workspaceRoot);
  ensureWithinWorkspace(snapshotsFilePath, workspaceRoot);
  ensureWithinWorkspace(migrationFilePath, workspaceRoot);

  return {
    workspaceRoot,
    stateRoot,
    configFilePath,
    eventsDirPath,
    activeEventsFilePath,
    snapshotsFilePath,
    migrationFilePath,
  };
}

function createDefaultWorkspaceConfig(workspacePath: string): WorkspaceConfig {
  return {
    version: 1,
    updatedAt: nowIso(),
    workspacePath,
    llm: {
      activeProviderId: 'local',
      providers: [
        {
          id: 'local',
          label: '本地模型（OpenAI Compatible）',
          baseUrl: 'http://127.0.0.1:8045/v1',
          apiKey: '',
          defaultModel: 'gemini-3-flash',
          timeoutMs: 180_000,
        },
        {
          id: 'qwen',
          label: 'Qwen（通义千问 · DashScope）',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          apiKey: '',
          defaultModel: 'qwen-plus',
          timeoutMs: 120_000,
        },
      ],
    },
    ui: {
      theme: 'dark',
    },
    modules: {
      'deadline-engine': {
        defaultDelayMinutes: 30,
      },
    },
  };
}

function createDefaultModuleSnapshots(): ModuleSnapshots {
  return {
    version: 1,
    updatedAt: nowIso(),
    modules: {
      'deadline-engine': {
        reminders: [],
      },
      'output-generator': {
        lastReports: [],
      },
    },
  };
}

function createDefaultMigrationMeta(): WorkspaceMigrationMeta {
  return {
    migrated: false,
    source: null,
    migratedAt: null,
  };
}

async function ensureWorkspaceStateDirs(paths: WorkspaceStatePaths) {
  await ensureDir(paths.stateRoot);
  await ensureDir(path.dirname(paths.configFilePath));
  await ensureDir(paths.eventsDirPath);
  await ensureDir(path.dirname(paths.snapshotsFilePath));
  await ensureDir(path.dirname(paths.migrationFilePath));
}

async function writeJsonAtomic(filePath: string, payload: unknown) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

async function loadWorkspaceConfig(paths: WorkspaceStatePaths): Promise<WorkspaceConfig> {
  const fallback = createDefaultWorkspaceConfig(paths.workspaceRoot);

  try {
    const raw = await fs.readFile(paths.configFilePath, 'utf-8');
    const parsed = WorkspaceConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      const resolved: WorkspaceConfig = {
        ...parsed.data,
        workspacePath: paths.workspaceRoot,
      };
      return resolved;
    }

    const corruptPath = `${paths.configFilePath}.corrupt.${Date.now()}.json`;
    await fs.rename(paths.configFilePath, corruptPath);
    await writeJsonAtomic(paths.configFilePath, fallback);
    return fallback;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      await writeJsonAtomic(paths.configFilePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function loadModuleSnapshots(paths: WorkspaceStatePaths): Promise<ModuleSnapshots> {
  const fallback = createDefaultModuleSnapshots();

  try {
    const raw = await fs.readFile(paths.snapshotsFilePath, 'utf-8');
    const parsed = ModuleSnapshotsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
    await writeJsonAtomic(paths.snapshotsFilePath, fallback);
    return fallback;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      await writeJsonAtomic(paths.snapshotsFilePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function loadMigrationMeta(paths: WorkspaceStatePaths): Promise<WorkspaceMigrationMeta> {
  try {
    const raw = await fs.readFile(paths.migrationFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WorkspaceMigrationMeta>;
    if (typeof parsed?.migrated === 'boolean') {
      return {
        migrated: parsed.migrated,
        source: typeof parsed.source === 'string' ? parsed.source : null,
        migratedAt: typeof parsed.migratedAt === 'string' ? parsed.migratedAt : null,
      };
    }
    return createDefaultMigrationMeta();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return createDefaultMigrationMeta();
    }
    throw error;
  }
}

function parseEventLine(line: string): WorkspaceEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const candidate = JSON.parse(trimmed);
    const parsed = WorkspaceEventSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function loadAllEvents(paths: WorkspaceStatePaths): Promise<WorkspaceEvent[]> {
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(paths.eventsDirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const targets = fileNames
    .filter((name) => name === 'events.jsonl' || /^events-\d{8}-\d{6}-\d+\.jsonl$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  const events: WorkspaceEvent[] = [];
  for (const name of targets) {
    const filePath = path.join(paths.eventsDirPath, name);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      raw
        .split('\n')
        .map((line) => parseEventLine(line))
        .forEach((event) => {
          if (event) {
            events.push(event);
          }
        });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return events;
}

async function rotateEventsFileIfNeeded(paths: WorkspaceStatePaths, appendBytes: number) {
  try {
    const stat = await fs.stat(paths.activeEventsFilePath);
    if (stat.size + appendBytes <= EVENTS_ROTATE_BYTES) {
      return;
    }

    const stamp = new Date();
    const filename = `events-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(
      stamp.getDate(),
    ).padStart(2, '0')}-${String(stamp.getHours()).padStart(2, '0')}${String(
      stamp.getMinutes(),
    ).padStart(2, '0')}${String(stamp.getSeconds()).padStart(2, '0')}-${stamp.getTime()}.jsonl`;
    await fs.rename(paths.activeEventsFilePath, path.join(paths.eventsDirPath, filename));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }
}

function normalizeIncomingEvent(input: WorkspaceEvent): WorkspaceEvent {
  return {
    eventId: input.eventId?.trim() || makeEventId(),
    at: input.at?.trim() || nowIso(),
    moduleId: input.moduleId,
    type: input.type,
    level: input.level ?? 'info',
    message: input.message,
    payload: input.payload ?? {},
  };
}

function applyEventToSnapshots(snapshots: ModuleSnapshots, event: WorkspaceEvent): ModuleSnapshots {
  const next: ModuleSnapshots = {
    ...snapshots,
    updatedAt: event.at ?? nowIso(),
    modules: {
      ...snapshots.modules,
      'deadline-engine': {
        reminders: [...snapshots.modules['deadline-engine'].reminders],
      },
      'output-generator': {
        lastReports: [...snapshots.modules['output-generator'].lastReports],
      },
    },
  };

  if (event.moduleId === 'deadline-engine') {
    const reminders = next.modules['deadline-engine'].reminders;
    const payloadReminder = event.payload?.reminder;

    if (event.type === 'reminder.created') {
      const parsed = ReminderSnapshotSchema.safeParse(payloadReminder);
      if (parsed.success) {
        const idx = reminders.findIndex((item) => item.id === parsed.data.id);
        if (idx >= 0) {
          reminders[idx] = parsed.data;
        } else {
          reminders.unshift(parsed.data);
        }
      }
    } else if (
      event.type === 'reminder.fired' ||
      event.type === 'reminder.dismissed' ||
      event.type === 'reminder.cancelled'
    ) {
      const reminderIdRaw =
        typeof event.payload?.reminderId === 'string'
          ? event.payload.reminderId
          : typeof payloadReminder === 'object' &&
              payloadReminder !== null &&
              'id' in payloadReminder &&
              typeof (payloadReminder as { id?: unknown }).id === 'string'
            ? (payloadReminder as { id: string }).id
            : null;

      const nextStatus =
        event.type === 'reminder.fired'
          ? 'fired'
          : event.type === 'reminder.dismissed'
            ? 'dismissed'
            : 'cancelled';

      if (reminderIdRaw) {
        const idx = reminders.findIndex((item) => item.id === reminderIdRaw);
        if (idx >= 0) {
          const current = reminders[idx];
          reminders[idx] = {
            ...current,
            status: nextStatus,
            ...(typeof payloadReminder === 'object' && payloadReminder !== null
              ? (payloadReminder as Partial<(typeof reminders)[number]>)
              : {}),
          };
        }
      }
    }
  }

  if (event.moduleId === 'output-generator' && event.type === 'report.generated') {
    const outputPath = typeof event.payload?.outputPath === 'string' ? event.payload.outputPath : null;
    if (outputPath) {
      next.modules['output-generator'].lastReports = [
        outputPath,
        ...next.modules['output-generator'].lastReports.filter((item) => item !== outputPath),
      ].slice(0, 20);
    }
  }

  return next;
}

async function appendWorkspaceEvent(paths: WorkspaceStatePaths, eventInput: WorkspaceEvent) {
  const event = normalizeIncomingEvent(eventInput);
  const line = `${JSON.stringify(event)}\n`;
  await rotateEventsFileIfNeeded(paths, Buffer.byteLength(line, 'utf-8'));
  const handle = await fs.open(paths.activeEventsFilePath, 'a');
  try {
    await handle.writeFile(line, 'utf-8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  const snapshots = await loadModuleSnapshots(paths);
  const updatedSnapshots = applyEventToSnapshots(snapshots, event);
  await writeJsonAtomic(paths.snapshotsFilePath, updatedSnapshots);

  return {
    event,
    snapshots: updatedSnapshots,
  };
}

function filterEvents(events: WorkspaceEvent[], query: WorkspaceGetEventsQuery): WorkspaceEvent[] {
  const fromMs = query.from ? Date.parse(query.from) : Number.NEGATIVE_INFINITY;
  const toMs = query.to ? Date.parse(query.to) : Number.POSITIVE_INFINITY;
  const limit = query.limit ?? DEFAULT_RECENT_EVENTS_LIMIT;

  return [...events]
    .filter((event) => {
      if (query.moduleId && event.moduleId !== query.moduleId) {
        return false;
      }
      const eventMs = event.at ? Date.parse(event.at) : Number.NaN;
      if (!Number.isFinite(eventMs)) {
        return false;
      }
      return eventMs >= fromMs && eventMs <= toMs;
    })
    .sort((a, b) => Date.parse(b.at ?? '') - Date.parse(a.at ?? ''))
    .slice(0, limit);
}

function mergeConfigFromLocalState(
  workspacePath: string,
  localState: WorkspaceMigrateFromLocalStorageRequest['localState'],
): WorkspaceConfig {
  const base = createDefaultWorkspaceConfig(workspacePath);
  if (!localState) {
    return base;
  }

  const nextProviders = localState.llm?.providers?.length ? localState.llm.providers : base.llm.providers;
  const nextActiveId = localState.llm?.activeProviderId ?? base.llm.activeProviderId;
  const activeProviderId = nextProviders.some((provider) => provider.id === nextActiveId)
    ? nextActiveId
    : nextProviders[0]?.id ?? base.llm.activeProviderId;

  return {
    ...base,
    workspacePath,
    llm: {
      activeProviderId,
      providers: nextProviders,
    },
    ui: {
      theme: localState.ui?.theme ?? base.ui.theme,
    },
  };
}

export async function bootstrapWorkspaceState(workspacePath: string): Promise<WorkspaceBootstrapResponse> {
  const paths = resolveWorkspaceStatePaths(workspacePath);
  await ensureWorkspaceStateDirs(paths);

  try {
    await fs.access(paths.stateRoot, fsConstants.W_OK);
  } catch {
    throw new DocsMakerError(
      'WORKSPACE_NOT_WRITABLE',
      `工作区状态目录不可写: ${paths.stateRoot}`,
      403,
      '请检查 workspace 路径权限，确保当前用户可写入该目录。',
    );
  }

  const config = await loadWorkspaceConfig(paths);
  const moduleSnapshots = await loadModuleSnapshots(paths);
  const migration = await loadMigrationMeta(paths);
  const recentEvents = filterEvents(await loadAllEvents(paths), {
    workspacePath,
    limit: DEFAULT_RECENT_EVENTS_LIMIT,
  });

  return {
    config,
    moduleSnapshots,
    recentEvents,
    migration,
  };
}

export async function saveWorkspaceConfig(req: WorkspacePutConfigRequest): Promise<WorkspaceConfig> {
  const paths = resolveWorkspaceStatePaths(req.workspacePath);
  await ensureWorkspaceStateDirs(paths);

  const targetWorkspace = ensureWithinWorkspace(req.config.workspacePath, req.workspacePath).workspaceRoot;
  const parsed = WorkspaceConfigSchema.parse({
    ...req.config,
    workspacePath: targetWorkspace,
    version: 1,
    updatedAt: nowIso(),
  });

  await writeJsonAtomic(paths.configFilePath, parsed);
  return parsed;
}

export async function postWorkspaceEvent(req: WorkspacePostEventRequest): Promise<WorkspacePostEventResponse> {
  const paths = resolveWorkspaceStatePaths(req.workspacePath);
  await ensureWorkspaceStateDirs(paths);
  const { event, snapshots } = await appendWorkspaceEvent(paths, req.event);
  return {
    event,
    moduleSnapshots: snapshots,
  };
}

export async function getWorkspaceEvents(query: WorkspaceGetEventsQuery): Promise<WorkspaceEvent[]> {
  const paths = resolveWorkspaceStatePaths(query.workspacePath);
  await ensureWorkspaceStateDirs(paths);
  const events = await loadAllEvents(paths);
  return filterEvents(events, query);
}

export async function migrateFromLocalStorage(
  req: WorkspaceMigrateFromLocalStorageRequest,
): Promise<WorkspaceBootstrapResponse> {
  const paths = resolveWorkspaceStatePaths(req.workspacePath);
  await ensureWorkspaceStateDirs(paths);

  const migration = await loadMigrationMeta(paths);
  if (migration.migrated) {
    return bootstrapWorkspaceState(req.workspacePath);
  }

  const nextConfig = mergeConfigFromLocalState(paths.workspaceRoot, req.localState);
  await writeJsonAtomic(paths.configFilePath, {
    ...nextConfig,
    version: 1,
    updatedAt: nowIso(),
  });
  await writeJsonAtomic(paths.migrationFilePath, {
    migrated: true,
    source: 'localStorage',
    migratedAt: nowIso(),
  } satisfies WorkspaceMigrationMeta);

  return bootstrapWorkspaceState(req.workspacePath);
}
