import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    LLMProviderConfig,
    ProviderTestResult,
} from './types';
import type { ChatCompletionTool, ChoiceWithTools } from '../agent/toolTypes';

/**
 * Extended response that may contain tool_calls.
 */
export interface ChatCompletionResponseWithTools
    extends Omit<ChatCompletionResponse, 'choices'> {
    choices: ChoiceWithTools[];
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_REQUEST_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;

export class LlmClientError extends Error {
    readonly code: string;
    readonly hint?: string;
    readonly httpStatus?: number;
    readonly retriable: boolean;

    constructor(options: {
        code: string;
        message: string;
        hint?: string;
        httpStatus?: number;
        retriable?: boolean;
    }) {
        super(options.message);
        this.name = 'LlmClientError';
        this.code = options.code;
        this.hint = options.hint;
        this.httpStatus = options.httpStatus;
        this.retriable = options.retriable ?? false;
    }
}

function isAbortError(err: unknown): boolean {
    return !!(
        err &&
        typeof err === 'object' &&
        'name' in err &&
        (err as { name?: unknown }).name === 'AbortError'
    );
}

function isLikelyNetworkError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;

    if (err.name !== 'TypeError') return false;
    return /(failed to fetch|fetch failed|networkerror|load failed)/i.test(err.message);
}

function normalizeRequestError(err: unknown, timeoutMs: number): LlmClientError {
    if (err instanceof LlmClientError) {
        return err;
    }

    if (isAbortError(err)) {
        return new LlmClientError({
            code: 'LLM_TIMEOUT',
            message: `请求超时（${timeoutMs}ms）`,
            hint: '请稍后重试，或在设置中使用更快模型/更高超时配置（当前为默认值）。',
            retriable: true,
        });
    }

    if (isLikelyNetworkError(err)) {
        return new LlmClientError({
            code: 'LLM_NETWORK_ERROR',
            message: '网络连接失败：无法连接到模型服务。',
            hint: '请检查网络、Base URL 与本地服务状态后重试。',
            retriable: true,
        });
    }

    return new LlmClientError({
        code: 'LLM_REQUEST_FAILED',
        message: err instanceof Error ? err.message : String(err),
    });
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function requestCompletionOnce(
    provider: LLMProviderConfig,
    body: Record<string, unknown>,
    timeoutMs: number,
): Promise<ChatCompletionResponseWithTools> {
    const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => resp.statusText);
            throw new LlmClientError({
                code: `HTTP_${resp.status}`,
                message: `[${provider.id}] HTTP ${resp.status}: ${errText}`,
                httpStatus: resp.status,
                retriable: false,
            });
        }

        return (await resp.json()) as ChatCompletionResponseWithTools;
    } catch (err) {
        throw normalizeRequestError(err, timeoutMs);
    } finally {
        clearTimeout(timerId);
    }
}

/**
 * Send a chat completion request to the configured provider.
 * Throws on network error or non-2xx status.
 */
export async function chatCompletion(
    provider: LLMProviderConfig,
    request: Omit<ChatCompletionRequest, 'model'> & {
        model?: string;
        tools?: ChatCompletionTool[];
        tool_choice?: 'auto' | 'none' | 'required';
    },
): Promise<ChatCompletionResponseWithTools> {
    const model = request.model ?? provider.defaultModel;
    const timeoutMs = provider.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Build body — omit stream, include tools only if present
    const body: Record<string, unknown> = { ...request, model, stream: false };
    if (!request.tools || request.tools.length === 0) {
        delete body['tools'];
        delete body['tool_choice'];
    }

    for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
        try {
            return await requestCompletionOnce(provider, body, timeoutMs);
        } catch (err) {
            const normalized = normalizeRequestError(err, timeoutMs);
            const shouldRetry = normalized.retriable && attempt < MAX_REQUEST_ATTEMPTS;

            if (!shouldRetry) {
                throw normalized;
            }

            await delay(RETRY_DELAY_MS);
        }
    }

    throw new LlmClientError({
        code: 'LLM_REQUEST_FAILED',
        message: '请求失败：超过最大重试次数。',
    });
}


/**
 * Fire a minimal request to verify provider connectivity.
 * Returns latency and any error message.
 */
export async function testProvider(provider: LLMProviderConfig): Promise<ProviderTestResult> {
    const start = Date.now();
    try {
        const resp = await chatCompletion(provider, {
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5,
            temperature: 0,
        });
        const latencyMs = Date.now() - start;
        return {
            ok: true,
            latencyMs,
            modelEcho: resp.choices[0]?.message?.content ?? '(empty)',
        };
    } catch (err) {
        return {
            ok: false,
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

/**
 * Convenience: call a provider with a simple system + user prompt.
 * Returns the assistant's reply text.
 */
export async function simpleChat(
    provider: LLMProviderConfig,
    systemPrompt: string,
    userMessage: string,
): Promise<string> {
    const resp = await chatCompletion(provider, {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
    });
    return resp.choices[0]?.message?.content ?? '';
}
