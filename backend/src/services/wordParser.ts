import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import type { ParseWordDraftRequest, ParseWordDraftResponse } from '../types.js';
import { ensureDir, ensureWithinWorkspace } from './pathGuard.js';

interface MammothImageLike {
  contentType: string;
  read: (encoding: string) => Promise<string>;
}

interface MammothResultLike {
  value: string;
}

type MammothConvertToMarkdown = (
  input: { path: string },
  options: {
    convertImage: unknown;
  },
) => Promise<MammothResultLike>;

const mammothCompat = mammoth as unknown as {
  convertToMarkdown: MammothConvertToMarkdown;
  images: {
    imgElement: (fn: (image: MammothImageLike) => Promise<{ src: string }>) => unknown;
  };
};

function extFromContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('bmp')) return 'bmp';
  if (contentType.includes('webp')) return 'webp';
  return 'bin';
}

export async function parseWordDraft(
  req: ParseWordDraftRequest,
): Promise<ParseWordDraftResponse> {
  const { workspaceRoot } = ensureWithinWorkspace(req.inputFilePath, req.workspacePath);
  const { absoluteTarget: sourceFilePath } = ensureWithinWorkspace(req.inputFilePath, req.workspacePath);
  const { absoluteTarget: outputAssetDir } = ensureWithinWorkspace(req.outputAssetDir, req.workspacePath);

  await ensureDir(outputAssetDir);

  const assetFiles: string[] = [];
  let index = 0;

  const result = await mammothCompat.convertToMarkdown(
    { path: sourceFilePath },
    {
      convertImage: mammothCompat.images.imgElement(async (image) => {
        index += 1;
        const ext = extFromContentType(image.contentType || '');
        const fileName = `img-${index}.${ext}`;
        const outputPath = path.join(outputAssetDir, fileName);
        const base64 = await image.read('base64');
        await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));

        const rel = path.relative(workspaceRoot, outputPath).replace(/\\/g, '/');
        assetFiles.push(outputPath);
        return { src: `./${rel}` };
      }),
    },
  );

  return {
    markdownContent: result.value,
    assetFiles,
    outputAssetDir,
    sourceFilePath,
  };
}
