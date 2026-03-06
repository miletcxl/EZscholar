import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import {
  DocsMakerError,
  DownloadQuerySchema,
  GeneratePresentationSlidesSchema,
  ParseWordDraftSchema,
  RenderAcademicReportSchema,
  UploadDraftSchema,
  type UploadDraftResponse,
} from '../types.js';
import { ensureDir, ensureWithinWorkspace, sanitizeSubDir } from '../services/pathGuard.js';
import { parseWordDraft } from '../services/wordParser.js';
import { renderAcademicReport } from '../services/reportRenderer.js';
import { generatePresentationSlidesStub } from '../services/slidesStub.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024,
  },
});

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createDocsMakerRouter() {
  const router = Router();

  router.post('/upload-draft', upload.single('file'), async (req, res, next) => {
    try {
      const parsed = UploadDraftSchema.parse(req.body);
      const file = req.file;
      if (!file) {
        throw new DocsMakerError('FILE_REQUIRED', '请上传 .docx 文件', 400);
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.docx') {
        throw new DocsMakerError('UNSUPPORTED_FILE_TYPE', '仅支持 .docx 文件上传', 400);
      }

      const workspaceRoot = ensureWithinWorkspace(parsed.workspacePath, parsed.workspacePath).workspaceRoot;
      const subDir = parsed.subDir ? sanitizeSubDir(parsed.subDir) : 'docs-maker/drafts';
      const targetDir = path.join(workspaceRoot, subDir);
      ensureWithinWorkspace(targetDir, workspaceRoot);
      await ensureDir(targetDir);

      const now = new Date();
      const stampedName = `${now.getTime()}-${sanitizeFilename(file.originalname)}`;
      const savedFilePath = path.join(targetDir, stampedName);
      await fs.writeFile(savedFilePath, file.buffer);

      const payload: UploadDraftResponse = {
        savedFilePath,
        relativePath: path.relative(workspaceRoot, savedFilePath).replace(/\\/g, '/'),
        size: file.size,
        uploadedAt: now.toISOString(),
      };

      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/parse-word-draft', async (req, res, next) => {
    try {
      const parsed = ParseWordDraftSchema.parse(req.body);
      const payload = await parseWordDraft(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/render-academic-report', async (req, res, next) => {
    try {
      const parsed = RenderAcademicReportSchema.parse(req.body);
      const payload = await renderAcademicReport(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/generate-presentation-slides', async (req, res, next) => {
    try {
      GeneratePresentationSlidesSchema.parse(req.body);
      res.json(generatePresentationSlidesStub());
    } catch (error) {
      next(error);
    }
  });

  router.get('/download', async (req, res, next) => {
    try {
      const parsed = DownloadQuerySchema.parse(req.query);
      const { absoluteTarget } = ensureWithinWorkspace(parsed.path, parsed.workspacePath);
      await fs.access(absoluteTarget);
      res.download(absoluteTarget, path.basename(absoluteTarget));
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'ENOENT'
      ) {
        next(new DocsMakerError('FILE_NOT_FOUND', '文件不存在', 404));
        return;
      }
      next(error);
    }
  });

  return router;
}
