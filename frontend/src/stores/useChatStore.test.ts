import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/llm/client', () => ({
  chatCompletion: vi.fn(),
}));

vi.mock('./useLlmStore', () => ({
  getActiveProvider: vi.fn(),
}));

vi.mock('../services/agent/toolExecutors', () => ({
  executeTool: vi.fn(),
}));

import { useChatStore } from './useChatStore';
import { chatCompletion } from '../services/llm/client';
import { getActiveProvider } from './useLlmStore';
import type { LLMProviderConfig } from '../services/llm/types';

const provider: LLMProviderConfig = {
  id: 'qwen',
  label: 'Qwen',
  baseUrl: 'https://example.com/v1',
  apiKey: 'test-key',
  defaultModel: 'qwen-plus',
  timeoutMs: 120_000,
};

describe('useChatStore error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({ messages: [], isLoading: false, error: null });
    vi.mocked(getActiveProvider).mockReturnValue(provider);
  });

  it('maps LLM_TIMEOUT to readable Chinese error', async () => {
    const timeoutErr = Object.assign(new Error('请求超时（120000ms）'), {
      code: 'LLM_TIMEOUT',
      hint: 'timeout hint',
    });
    vi.mocked(chatCompletion).mockRejectedValue(timeoutErr);

    await useChatStore.getState().sendMessage('渲染为精美的pdf');

    const state = useChatStore.getState();
    expect(state.error).toBe('请求超时：模型响应时间过长。已自动重试 1 次仍失败，请重试或更换模型。');
    expect(state.messages.some((m) => m.content.includes('❌ 请求失败：请求超时：模型响应时间过长。'))).toBe(true);
  });

  it('maps HTTP 401 to auth error message', async () => {
    vi.mocked(chatCompletion).mockRejectedValue(new Error('[qwen] HTTP 401: Unauthorized'));

    await useChatStore.getState().sendMessage('你好');

    const state = useChatStore.getState();
    expect(state.error).toBe('鉴权失败：请检查 API Key。');
  });

  it('keeps original message for unknown errors', async () => {
    vi.mocked(chatCompletion).mockRejectedValue(new Error('unexpected failure'));

    await useChatStore.getState().sendMessage('hello');

    const state = useChatStore.getState();
    expect(state.error).toBe('unexpected failure');
  });

  it('maps LATEX_CJK_PACKAGE_MISSING to concise pdf hint', async () => {
    const latexErr = Object.assign(new Error('latex package missing'), {
      code: 'LATEX_CJK_PACKAGE_MISSING',
    });
    vi.mocked(chatCompletion).mockRejectedValue(latexErr);

    await useChatStore.getState().sendMessage('渲染 pdf');

    const state = useChatStore.getState();
    expect(state.error).toBe('PDF 渲染失败：缺少 xeCJK。请安装 texlive-lang-chinese 后重试。');
  });
});
