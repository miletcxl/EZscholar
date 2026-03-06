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

export type UploadDraftRequest = z.infer<typeof UploadDraftSchema>;
export type ParseWordDraftRequest = z.infer<typeof ParseWordDraftSchema>;
export type RenderAcademicReportRequest = z.infer<typeof RenderAcademicReportSchema>;
export type GeneratePresentationSlidesRequest = z.infer<typeof GeneratePresentationSlidesSchema>;

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
