// ─── Settings: LLM Provider Panel ────────────────────────────────────────────
// Shows all available LLM providers, lets user select one, and run a
// connectivity test (ping) against each endpoint.

import { CheckCircle, Loader, XCircle, Zap } from 'lucide-react';
import { useLlmStore } from '../../stores/useLlmStore';
import './LlmProviderPanel.css';

function statusIcon(ok: boolean) {
    return ok ? (
        <CheckCircle size={14} className="provider-icon provider-icon--ok" />
    ) : (
        <XCircle size={14} className="provider-icon provider-icon--err" />
    );
}

export function LlmProviderPanel() {
    const { providers, activeProviderId, testResults, testing, setActiveProvider, runTest, updateProviderConfig } =
        useLlmStore();

    return (
        <div className="provider-panel">
            <p className="provider-panel-title">🤖 AI 推理引擎</p>
            <p className="provider-panel-desc">
                选择一个 Provider 作为 Cyber-Scholar Agent 的语言模型后端。
                更多 Provider 可在此扩展。当前版本会把 API Key 明文写入 workspace/.ezscholar/config.json，
                请勿提交该目录到公开仓库。
            </p>

            <ul className="provider-list">
                {providers.map((p) => {
                    const isActive = p.id === activeProviderId;
                    const result = testResults[p.id];
                    const isTesting = testing[p.id] ?? false;

                    return (
                        <li
                            key={p.id}
                            className={`provider-item ${isActive ? 'provider-item--active' : ''}`}
                            onClick={() => setActiveProvider(p.id)}
                            data-testid={`provider-${p.id}`}
                        >
                            {/* Radio indicator */}
                            <span className={`provider-radio ${isActive ? 'provider-radio--on' : ''}`} />

                            <div className="provider-info">
                                <span className="provider-label">{p.label}</span>
                                {/* Config Inputs */}
                                <div className="provider-config-inputs">
                                    <input
                                        type="text"
                                        className="provider-key-input provider-key-input--half"
                                        placeholder="模型名称 (如: gemini-2.0-flash)"
                                        value={p.defaultModel}
                                        onChange={(e) => updateProviderConfig(p.id, { defaultModel: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <input
                                        type="text"
                                        className="provider-key-input provider-key-input--half"
                                        placeholder="Base URL (包含 /v1)"
                                        value={p.baseUrl}
                                        onChange={(e) => updateProviderConfig(p.id, { baseUrl: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <input
                                        type="password"
                                        className="provider-key-input"
                                        placeholder={`输入 ${p.label} API Key`}
                                        value={p.apiKey}
                                        onChange={(e) => updateProviderConfig(p.id, { apiKey: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                {/* Test result */}
                                {result && (
                                    <span className={`provider-test-result ${result.ok ? 'ok' : 'err'}`}>
                                        {statusIcon(result.ok)}
                                        {result.ok
                                            ? `在线 · ${result.latencyMs}ms`
                                            : `离线 · ${result.error?.slice(0, 60) ?? '未知错误'}`}
                                    </span>
                                )}
                            </div>

                            {/* Test button */}
                            <button
                                className="provider-test-btn"
                                title="测试连通性"
                                disabled={isTesting}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    runTest(p.id);
                                }}
                            >
                                {isTesting ? <Loader size={13} className="spin" /> : <Zap size={13} />}
                                {isTesting ? '测试中…' : '测试'}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
