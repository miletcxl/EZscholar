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
    const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), provider.timeoutMs ?? 30_000);

    // Build body — omit stream, include tools only if present
    const body: Record<string, unknown> = { ...request, model, stream: false };
    if (!request.tools || request.tools.length === 0) {
        delete body['tools'];
        delete body['tool_choice'];
    }

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
            throw new Error(`[${provider.id}] HTTP ${resp.status}: ${errText}`);
        }

        return (await resp.json()) as ChatCompletionResponseWithTools;
    } finally {
        clearTimeout(timerId);
    }
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
