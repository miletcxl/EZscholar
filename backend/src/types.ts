import { z } from 'zod';

export const UploadDraftSchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  subDir: z.string().optional(),
});

export const ParseWordDraftSchema = z.object({
  inputFilePath: z.string().min(1, 'inputFilePath required'),
  outputAssetDir: z.string().min(1, 'outputAssetDir required'),
  workspacePath: z.string().min(1, 'workspacePath required'),
});

export const RenderAcademicReportSchema = z.object({
  markdownContent: z.string().min(1, 'markdownContent required'),
  format: z.enum(['pdf', 'docx']),
  outputPath: z.string().min(1, 'outputPath required'),
  workspacePath: z.string().min(1, 'workspacePath required'),
});

export const GeneratePresentationSlidesSchema = z.object({
  slideOutlineMarkdown: z.string().min(1, 'slideOutlineMarkdown required'),
  outputPath: z.string().min(1, 'outputPath required'),
  workspacePath: z.string().min(1, 'workspacePath required'),
});

export const DownloadQuerySchema = z.object({
  path: z.string().min(1, 'path required'),
  workspacePath: z.string().min(1, 'workspacePath required'),
});

const ThemeSchema = z.enum(['dark', 'light']);

const ReminderStatusSchema = z.enum(['pending', 'fired', 'dismissed', 'cancelled']);

const LlmProviderSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseUrl: z.string().min(1),
  apiKey: z.string(),
  defaultModel: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
});

const DeadlineEngineModuleConfigSchema = z.object({
  defaultDelayMinutes: z.number().positive().optional(),
});

export const WorkspaceConfigSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string(),
  workspacePath: z.string().min(1),
  llm: z.object({
    activeProviderId: z.string().min(1),
    providers: z.array(LlmProviderSchema),
  }),
  ui: z.object({
    theme: ThemeSchema,
  }),
  modules: z
    .object({
      'deadline-engine': DeadlineEngineModuleConfigSchema.optional(),
    })
    .passthrough()
    .default({}),
});

export const ReminderSnapshotSchema = z.object({
  id: z.string().min(1),
  taskName: z.string().min(1),
  message: z.string().min(1),
  delayMs: z.number().nonnegative(),
  createdAt: z.string().min(1),
  fireAt: z.string().min(1),
  status: ReminderStatusSchema,
  repeatIntervalMinutes: z.number().int().positive().optional(),
});

const OutputGeneratorSnapshotSchema = z.object({
  lastReports: z.array(z.string()).default([]),
});

export const ModuleSnapshotsSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string(),
  modules: z.object({
    'deadline-engine': z.object({
      reminders: z.array(ReminderSnapshotSchema).default([]),
    }),
    'output-generator': OutputGeneratorSnapshotSchema,
  }),
});

const EventLevelSchema = z.enum(['info', 'success', 'warning', 'error']);

export const WorkspaceEventSchema = z.object({
  eventId: z.string().min(1).optional(),
  at: z.string().optional(),
  moduleId: z.string().min(1),
  type: z.string().min(1),
  level: EventLevelSchema.default('info'),
  message: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
});

export const WorkspaceBootstrapQuerySchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
});

export const WorkspacePutConfigSchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  config: WorkspaceConfigSchema,
});

export const WorkspacePostEventSchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  event: WorkspaceEventSchema,
});

export const WorkspaceGetEventsQuerySchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  limit: z.coerce.number().int().positive().max(500).optional(),
  moduleId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const WorkspaceMigrateFromLocalStorageSchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  localState: z
    .object({
      llm: z
        .object({
          activeProviderId: z.string().optional(),
          providers: z.array(LlmProviderSchema).optional(),
        })
        .optional(),
      ui: z
        .object({
          theme: ThemeSchema.optional(),
        })
        .optional(),
      workspacePath: z.string().optional(),
    })
    .optional(),
});

export type UploadDraftRequest = z.infer<typeof UploadDraftSchema>;
export type ParseWordDraftRequest = z.infer<typeof ParseWordDraftSchema>;
export type RenderAcademicReportRequest = z.infer<typeof RenderAcademicReportSchema>;
export type GeneratePresentationSlidesRequest = z.infer<typeof GeneratePresentationSlidesSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type ReminderSnapshot = z.infer<typeof ReminderSnapshotSchema>;
export type ModuleSnapshots = z.infer<typeof ModuleSnapshotsSchema>;
export type WorkspaceEvent = z.infer<typeof WorkspaceEventSchema>;
export type WorkspacePutConfigRequest = z.infer<typeof WorkspacePutConfigSchema>;
export type WorkspacePostEventRequest = z.infer<typeof WorkspacePostEventSchema>;
export type WorkspaceGetEventsQuery = z.infer<typeof WorkspaceGetEventsQuerySchema>;
export type WorkspaceMigrateFromLocalStorageRequest = z.infer<
  typeof WorkspaceMigrateFromLocalStorageSchema
>;

export interface UploadDraftResponse {
  savedFilePath: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export interface ParseWordDraftResponse {
  markdownContent: string;
  assetFiles: string[];
  outputAssetDir: string;
  sourceFilePath: string;
}

export interface RenderAcademicReportResponse {
  outputPath: string;
  relativePath: string;
  format: 'pdf' | 'docx';
  engineUsed: 'typst' | 'pandoc-xelatex';
  downloadUrl: string;
}

export interface GenerateSlidesResponse {
  message: string;
}

export type DocsMakerErrorCode =
  | 'LATEX_CJK_PACKAGE_MISSING'
  | 'XELATEX_NOT_FOUND'
  | 'CJK_FONT_NOT_FOUND'
  | 'PANDOC_NOT_FOUND'
  | 'RENDER_FAILED'
  | 'FILE_REQUIRED'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'WORKSPACE_PATH_VIOLATION'
  | 'WORKSPACE_NOT_WRITABLE'
  | 'INVALID_SUBDIR'
  | 'FILE_NOT_FOUND'
  | string;

export class DocsMakerError extends Error {
  readonly code: DocsMakerErrorCode;
  readonly hint?: string;
  readonly status: number;

  constructor(code: DocsMakerErrorCode, message: string, status = 400, hint?: string) {
    super(message);
    this.name = 'DocsMakerError';
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}
