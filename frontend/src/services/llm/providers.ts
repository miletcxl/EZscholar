// ─── LLM Provider Registry ────────────────────────────────────────────────────
// Pre-configured providers. New providers can be added here or registered
// at runtime through the Settings page.

import type { LLMProviderConfig } from './types';

export const BUILT_IN_PROVIDERS: LLMProviderConfig[] = [
    {
        id: 'local',
        label: '本地模型（OpenAI Compatible）',
        baseUrl: import.meta.env.VITE_LOCAL_API_BASE_URL ?? 'http://127.0.0.1:8045/v1',
        apiKey: import.meta.env.VITE_LOCAL_API_KEY ?? '',
        defaultModel: import.meta.env.VITE_LOCAL_MODEL ?? 'gemini-3-flash',
        timeoutMs: 60_000,
    },
    {
        id: 'qwen',
        label: 'Qwen（通义千问 · DashScope）',
        baseUrl: import.meta.env.VITE_QWEN_API_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: import.meta.env.VITE_QWEN_API_KEY ?? '',
        defaultModel: import.meta.env.VITE_QWEN_MODEL ?? 'qwen-plus',
        timeoutMs: 30_000,
    },
];

export const DEFAULT_PROVIDER_ID = 'local';
