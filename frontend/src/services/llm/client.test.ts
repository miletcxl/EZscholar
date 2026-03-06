import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatCompletion, LlmClientError } from './client';
import type { LLMProviderConfig } from './types';

const provider: LLMProviderConfig = {
  id: 'qwen',
  label: 'Qwen',
  baseUrl: 'https://example.com/v1',
  apiKey: 'test-key',
  defaultModel: 'qwen-plus',
  timeoutMs: 50,
};

const request = {
  messages: [{ role: 'user' as const, content: 'hello' }],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('chatCompletion retry and error handling', () => {
  it('returns success without retry', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'resp-1',
          choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const resp = await chatCompletion(provider, request);

    expect(resp.choices[0]?.message.content).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries once when first attempt is timeout-like abort', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp-2',
            choices: [{ index: 0, message: { role: 'assistant', content: 'retry-ok' }, finish_reason: 'stop' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const pending = chatCompletion(provider, request);
    await vi.runAllTimersAsync();
    const resp = await pending;

    expect(resp.choices[0]?.message.content).toBe('retry-ok');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws LLM_TIMEOUT after two timeout attempts', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('aborted', 'AbortError'));

    const pending = chatCompletion(provider, request);
    const assertion = expect(pending).rejects.toMatchObject({
      code: 'LLM_TIMEOUT',
      message: `请求超时（${provider.timeoutMs}ms）`,
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('retries once on network error', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp-3',
            choices: [{ index: 0, message: { role: 'assistant', content: 'network-retry-ok' }, finish_reason: 'stop' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const pending = chatCompletion(provider, request);
    await vi.runAllTimersAsync();
    const resp = await pending;

    expect(resp.choices[0]?.message.content).toBe('network-retry-ok');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry on HTTP 401', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(chatCompletion(provider, request)).rejects.toMatchObject({
      code: 'HTTP_401',
      httpStatus: 401,
    } satisfies Partial<LlmClientError>);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not retry on HTTP 500', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500, statusText: 'Server Error' }),
    );

    await expect(chatCompletion(provider, request)).rejects.toMatchObject({
      code: 'HTTP_500',
      httpStatus: 500,
    } satisfies Partial<LlmClientError>);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
