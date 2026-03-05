// ─── LLM Provider Types ───────────────────────────────────────────────────────
// Extensible multi-provider architecture.
// Each provider must be OpenAI-compatible (chat/completions endpoint).

export type ProviderId = 'local' | 'qwen' | string; // string allows future providers

export interface LLMProviderConfig {
    id: ProviderId;
    label: string;          // Human-readable name shown in Settings
    baseUrl: string;        // Full base URL, e.g. http://127.0.0.1:8045/v1
    apiKey: string;
    defaultModel: string;
    /** Optional timeout in ms (default: 30000) */
    timeoutMs?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: false; // Phase 1: non-streaming only
}

export interface ChatCompletionResponse {
    id: string;
    choices: {
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/** Result of a connectivity test */
export interface ProviderTestResult {
    ok: boolean;
    latencyMs: number;
    error?: string;
    modelEcho?: string; // The model name echoed back by the API
}
