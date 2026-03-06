import { z } from 'zod';

export const UploadDraftSchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  subDir: z.string().optional(),
});

export const UploadMarkdownSchema = z.object({
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

export const SlideJobStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed']);
export const SlideJobSourceTypeSchema = z.enum(['markdown_content', 'markdown_file', 'external_prompt']);

export const SlidesProviderConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.literal('generic-webhook').default('generic-webhook'),
  webhookUrl: z.string().min(1),
  authToken: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  headers: z.record(z.string()).optional(),
});

export const SlidesMarpConfigSchema = z.object({
  command: z.string().min(1).default('marp'),
  baseArgs: z.array(z.string()).default(['--allow-local-files', '--no-stdin']),
  timeoutMs: z.number().int().positive().default(120_000),
});

export const SlidesModuleConfigSchema = z.object({
  defaultProviderId: z.string().min(1).default('generic-webhook-default'),
  providers: z.array(SlidesProviderConfigSchema).default([]),
  marp: SlidesMarpConfigSchema.default({
    command: 'marp',
    baseArgs: ['--allow-local-files', '--no-stdin'],
    timeoutMs: 120_000,
  }),
});

export const CreateSlideJobSchema = z
  .object({
    workspacePath: z.string().min(1, 'workspacePath required'),
    markdownContent: z.string().optional(),
    markdownFilePath: z.string().optional(),
    externalPrompt: z.string().optional(),
    providerId: z.string().optional(),
    outputPath: z.string().optional(),
    title: z.string().optional(),
  })
  .superRefine((payload, ctx) => {
    const sourceCount = Number(Boolean(payload.markdownContent?.trim())) +
      Number(Boolean(payload.markdownFilePath?.trim())) +
      Number(Boolean(payload.externalPrompt?.trim()));

    if (sourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'markdownContent / markdownFilePath / externalPrompt 必须且只能提供一个',
      });
    }
  });

export const GetSlideJobQuerySchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
});

export const ListSlideJobsQuerySchema = z.object({
  workspacePath: z.string().min(1, 'workspacePath required'),
  limit: z.coerce.number().int().positive().max(200).optional(),
  status: SlideJobStatusSchema.optional(),
});

export const SlideJobSchema = z.object({
  jobId: z.string().min(1),
  workspacePath: z.string().min(1),
  status: SlideJobStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  sourceType: SlideJobSourceTypeSchema,
  providerId: z.string().optional(),
  markdownFilePath: z.string().optional(),
  outputPath: z.string().min(1),
  relativeOutputPath: z.string().optional(),
  downloadUrl: z.string().optional(),
  externalPrompt: z.string().optional(),
  title: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  hint: z.string().optional(),
});

export const SlideJobsStoreSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string().min(1),
  jobs: z.array(SlideJobSchema),
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

const OutputGeneratorModuleConfigSchema = z.object({
  slides: SlidesModuleConfigSchema.optional(),
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
      'output-generator': OutputGeneratorModuleConfigSchema.optional(),
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
  lastSlides: z.array(z.string()).default([]),
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
export type UploadMarkdownRequest = z.infer<typeof UploadMarkdownSchema>;
export type ParseWordDraftRequest = z.infer<typeof ParseWordDraftSchema>;
export type RenderAcademicReportRequest = z.infer<typeof RenderAcademicReportSchema>;
export type GeneratePresentationSlidesRequest = z.infer<typeof GeneratePresentationSlidesSchema>;
export type SlideJobStatus = z.infer<typeof SlideJobStatusSchema>;
export type SlideJobSourceType = z.infer<typeof SlideJobSourceTypeSchema>;
export type SlidesProviderConfig = z.infer<typeof SlidesProviderConfigSchema>;
export type SlidesModuleConfig = z.infer<typeof SlidesModuleConfigSchema>;
export type SlideJob = z.infer<typeof SlideJobSchema>;
export type SlideJobsStore = z.infer<typeof SlideJobsStoreSchema>;
export type CreateSlideJobRequest = z.infer<typeof CreateSlideJobSchema>;
export type GetSlideJobQuery = z.infer<typeof GetSlideJobQuerySchema>;
export type ListSlideJobsQuery = z.infer<typeof ListSlideJobsQuerySchema>;
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

export interface UploadMarkdownResponse {
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
  jobId: string;
  status: SlideJobStatus;
  outputPath: string;
  pollUrl: string;
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
  | 'MARP_NOT_FOUND'
  | 'WEBHOOK_REQUEST_FAILED'
  | 'WEBHOOK_TIMEOUT'
  | 'SLIDE_JOB_NOT_FOUND'
  | 'SLIDES_RENDER_FAILED'
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
