import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SlidesProviderConfig {
  id: string;
  label: string;
  kind: 'generic-webhook';
  webhookUrl: string;
  authToken?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface SlidesModuleConfig {
  defaultProviderId: string;
  providers: SlidesProviderConfig[];
  marp: {
    command: string;
    baseArgs: string[];
    timeoutMs: number;
  };
}

const DEFAULT_SLIDES_CONFIG: SlidesModuleConfig = {
  defaultProviderId: 'generic-webhook-default',
  providers: [
    {
      id: 'generic-webhook-default',
      label: 'Generic Webhook',
      kind: 'generic-webhook',
      webhookUrl: '',
      authToken: '',
      timeoutMs: 45_000,
      headers: {},
    },
  ],
  marp: {
    command: 'marp',
    baseArgs: ['--allow-local-files', '--no-stdin'],
    timeoutMs: 120_000,
  },
};

function normalizeSlidesConfig(input?: Partial<SlidesModuleConfig>): SlidesModuleConfig {
  if (!input) {
    return DEFAULT_SLIDES_CONFIG;
  }

  const providers = Array.isArray(input.providers)
    ? input.providers.map((provider) => ({
      id: provider.id?.trim() || 'provider',
      label: provider.label?.trim() || provider.id?.trim() || 'Provider',
      kind: 'generic-webhook' as const,
      webhookUrl: provider.webhookUrl?.trim() || '',
      authToken: provider.authToken ?? '',
      timeoutMs: typeof provider.timeoutMs === 'number' ? provider.timeoutMs : 45_000,
      headers: provider.headers ?? {},
    }))
    : DEFAULT_SLIDES_CONFIG.providers;

  const fallbackProviderId = providers[0]?.id ?? DEFAULT_SLIDES_CONFIG.defaultProviderId;
  const defaultProviderId = providers.some((provider) => provider.id === input.defaultProviderId)
    ? (input.defaultProviderId as string)
    : fallbackProviderId;

  const normalizedBaseArgs = Array.isArray(input.marp?.baseArgs) && input.marp.baseArgs.length > 0
    ? input.marp.baseArgs.map((arg) => arg.trim()).filter(Boolean)
    : [...DEFAULT_SLIDES_CONFIG.marp.baseArgs];

  if (!normalizedBaseArgs.includes('--no-stdin')) {
    normalizedBaseArgs.push('--no-stdin');
  }

  return {
    defaultProviderId,
    providers,
    marp: {
      command: input.marp?.command?.trim() || DEFAULT_SLIDES_CONFIG.marp.command,
      baseArgs: normalizedBaseArgs,
      timeoutMs: typeof input.marp?.timeoutMs === 'number' ? input.marp.timeoutMs : DEFAULT_SLIDES_CONFIG.marp.timeoutMs,
    },
  };
}

interface OutputGeneratorState {
  slidesConfig: SlidesModuleConfig;
  setSlidesConfig: (next: SlidesModuleConfig) => void;
  upsertProvider: (provider: SlidesProviderConfig) => void;
  setDefaultProviderId: (providerId: string) => void;
  updateMarpConfig: (next: Partial<SlidesModuleConfig['marp']>) => void;
  hydrateFromWorkspace: (next?: SlidesModuleConfig) => void;
}

export const useOutputGeneratorStore = create<OutputGeneratorState>()(
  persist(
    (set) => ({
      slidesConfig: DEFAULT_SLIDES_CONFIG,
      setSlidesConfig: (next) => set({ slidesConfig: normalizeSlidesConfig(next) }),
      upsertProvider: (provider) =>
        set((state) => {
          const providers = [...state.slidesConfig.providers];
          const idx = providers.findIndex((item) => item.id === provider.id);
          if (idx >= 0) {
            providers[idx] = {
              ...providers[idx],
              ...provider,
              id: provider.id.trim(),
              label: provider.label.trim() || provider.id.trim(),
              kind: 'generic-webhook',
            };
          } else {
            providers.push({
              ...provider,
              id: provider.id.trim(),
              label: provider.label.trim() || provider.id.trim(),
              kind: 'generic-webhook',
            });
          }

          const defaultProviderId = providers.some((item) => item.id === state.slidesConfig.defaultProviderId)
            ? state.slidesConfig.defaultProviderId
            : providers[0]?.id || DEFAULT_SLIDES_CONFIG.defaultProviderId;

          return {
            slidesConfig: {
              ...state.slidesConfig,
              defaultProviderId,
              providers,
            },
          };
        }),
      setDefaultProviderId: (providerId) =>
        set((state) => ({
          slidesConfig: {
            ...state.slidesConfig,
            defaultProviderId: providerId.trim(),
          },
        })),
      updateMarpConfig: (next) =>
        set((state) => ({
          slidesConfig: {
            ...state.slidesConfig,
            marp: {
              ...state.slidesConfig.marp,
              ...next,
            },
          },
        })),
      hydrateFromWorkspace: (next) =>
        set({
          slidesConfig: normalizeSlidesConfig(next),
        }),
    }),
    {
      name: 'cyber-scholar-output-generator',
      partialize: (state) => ({
        slidesConfig: state.slidesConfig,
      }),
    },
  ),
);
