export type DocsMakerErrorCode =
  | 'LATEX_CJK_PACKAGE_MISSING'
  | 'XELATEX_NOT_FOUND'
  | 'CJK_FONT_NOT_FOUND'
  | 'PANDOC_NOT_FOUND'
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

export interface GenerateSlidesResponse {
  message: string;
}
