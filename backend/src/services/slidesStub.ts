import type { GenerateSlidesResponse } from '../types.js';

export function generatePresentationSlidesStub(): GenerateSlidesResponse {
  return {
    jobId: 'stub',
    status: 'failed',
    outputPath: '',
    pollUrl: '/api/docs-maker/slides/jobs/stub',
    message:
      'SUCCESS: Slides generation is currently a stub/placeholder. No actual PPTX was created.',
  };
}
