// ─── LLM Provider Zustand Store ───────────────────────────────────────────────
// Manages active provider selection and per-provider test results.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BUILT_IN_PROVIDERS, DEFAULT_PROVIDER_ID } from '../services/llm/providers';
import { testProvider } from '../services/llm/client';
import type { LLMProviderConfig, ProviderTestResult } from '../services/llm/types';

interface LlmState {
    /** The currently selected provider id */
    activeProviderId: string;
    /** All available providers (built-in + any user-added) */
    providers: LLMProviderConfig[];
    /** Map of providerId → last test result */
    testResults: Record<string, ProviderTestResult & { testedAt: string }>;
    /** Is a test currently running for a given provider */
    testing: Record<string, boolean>;

    setActiveProvider: (id: string) => void;
    addProvider: (config: LLMProviderConfig) => void;
    removeProvider: (id: string) => void;
    updateProviderConfig: (id: string, updates: Partial<LLMProviderConfig>) => void;
    runTest: (id: string) => Promise<void>;
}

export const useLlmStore = create<LlmState>()(
    persist(
        (set, get) => ({
            activeProviderId: DEFAULT_PROVIDER_ID,
            providers: BUILT_IN_PROVIDERS,
            testResults: {},
            testing: {},

            setActiveProvider: (id) => set({ activeProviderId: id }),

            addProvider: (config) =>
                set((state) => ({
                    providers: [...state.providers.filter((p) => p.id !== config.id), config],
                })),

            removeProvider: (id) =>
                set((state) => ({
                    providers: state.providers.filter((p) => p.id !== id),
                    activeProviderId:
                        state.activeProviderId === id ? DEFAULT_PROVIDER_ID : state.activeProviderId,
                })),

            updateProviderConfig: (id, updates) =>
                set((state) => ({
                    providers: state.providers.map((p) =>
                        p.id === id ? { ...p, ...updates } : p
                    ),
                })),

            runTest: async (id) => {
                const provider = get().providers.find((p) => p.id === id);
                if (!provider) return;

                set((state) => ({ testing: { ...state.testing, [id]: true } }));

                const result = await testProvider(provider);

                set((state) => ({
                    testing: { ...state.testing, [id]: false },
                    testResults: {
                        ...state.testResults,
                        [id]: { ...result, testedAt: new Date().toISOString() },
                    },
                }));
            },
        }),
        {
            name: 'cyber-scholar-llm',
            // Persist selection AND the customized provider list (keys)
            partialize: (state) => ({
                activeProviderId: state.activeProviderId,
                providers: state.providers,
            }),
        }
    ),
);

/** Convenience selector: get the active provider config */
export function getActiveProvider(): LLMProviderConfig | undefined {
    const { providers, activeProviderId } = useLlmStore.getState();
    return providers.find((p) => p.id === activeProviderId);
}
