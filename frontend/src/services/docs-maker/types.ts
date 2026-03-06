export type DocsMakerErrorCode =
  | 'LATEX_CJK_PACKAGE_MISSING'
  | 'XELATEX_NOT_FOUND'
  | 'CJK_FONT_NOT_FOUND'
  | 'PANDOC_NOT_FOUND'
  | 'MARP_NOT_FOUND'
  | 'WEBHOOK_REQUEST_FAILED'
  | 'WEBHOOK_TIMEOUT'
  | 'SLIDE_JOB_NOT_FOUND'
  | 'SLIDES_RENDER_FAILED'
  | 'RENDER_FAILED'
  | string;

export interface DocsMakerApiError {
  error_code: DocsMakerErrorCode;
  message: string;
  hint?: string;
}

export interface UploadDraftRequest {
  file: File;
  workspacePath: string;
  subDir?: string;
}

export interface UploadDraftResponse {
  savedFilePath: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export interface UploadMarkdownRequest {
  file: File;
  workspacePath: string;
  subDir?: string;
}

export interface UploadMarkdownResponse {
  savedFilePath: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export interface ParseWordDraftRequest {
  inputFilePath: string;
  outputAssetDir: string;
  workspacePath: string;
}

export interface ParseWordDraftResponse {
  markdownContent: string;
  assetFiles: string[];
  outputAssetDir: string;
  sourceFilePath: string;
}

export interface RenderAcademicReportRequest {
  markdownContent: string;
  format: 'pdf' | 'docx';
  outputPath: string;
  workspacePath: string;
}

export interface RenderAcademicReportResponse {
  outputPath: string;
  relativePath: string;
  format: 'pdf' | 'docx';
  engineUsed: 'typst' | 'pandoc-xelatex';
  downloadUrl: string;
}

export interface GenerateSlidesRequest {
  slideOutlineMarkdown: string;
  outputPath: string;
  workspacePath: string;
}

export interface CreateSlideJobRequest {
  markdownContent?: string;
  markdownFilePath?: string;
  externalPrompt?: string;
  providerId?: string;
  outputPath?: string;
  title?: string;
  workspacePath: string;
}

export type SlideJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface SlideJob {
  jobId: string;
  workspacePath: string;
  status: SlideJobStatus;
  createdAt: string;
  updatedAt: string;
  sourceType: 'markdown_content' | 'markdown_file' | 'external_prompt';
  providerId?: string;
  markdownFilePath?: string;
  outputPath: string;
  relativeOutputPath?: string;
  downloadUrl?: string;
  externalPrompt?: string;
  title?: string;
  errorCode?: string;
  errorMessage?: string;
  hint?: string;
}

export interface GenerateSlidesResponse {
  jobId: string;
  status: SlideJobStatus;
  outputPath: string;
  pollUrl: string;
  message: string;
}
