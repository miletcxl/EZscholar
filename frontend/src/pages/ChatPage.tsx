// ─── ChatPage ─────────────────────────────────────────────────────────────────
// Full-screen AI chat interface. Uses the active LLM provider from useLlmStore.

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, RotateCcw, User } from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import { useLlmStore } from '../stores/useLlmStore';
import './ChatPage.css';

// ─── Message bubble ───────────────────────────────────────────────────────────

import type { ChatMessage, ToolActionCard } from '../stores/useChatStore';

function ToolActionChip({ action }: { action: ToolActionCard }) {
    return (
        <div className={`tool-action-chip ${action.ok ? 'tool-action-chip--ok' : 'tool-action-chip--err'}`}>
            <span className="tool-action-dot" />
            <span>{action.summary}</span>
        </div>
    );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user';
    // Hide tool result messages — they are internal to the agentic loop
    if (msg.role === 'tool') return null;

    return (
        <div className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : 'chat-bubble-row--ai'}`}>
            <span className="chat-avatar">
                {isUser ? <User size={14} /> : <Bot size={14} />}
            </span>
            <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--ai'}`}>
                {msg.isStreaming ? (
                    <span className="chat-typing">
                        <span /><span /><span />
                    </span>
                ) : (
                    <>
                        {/* Tool action cards ABOVE the text */}
                        {msg.toolActions && msg.toolActions.length > 0 && (
                            <div className="tool-actions-list">
                                {msg.toolActions.map((a, i) => (
                                    <ToolActionChip key={i} action={a} />
                                ))}
                            </div>
                        )}
                        {msg.content && <p className="chat-content">{msg.content}</p>}
                    </>
                )}
            </div>
        </div>
    );
}


// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyChat({ activeLabel }: { activeLabel: string }) {
    return (
        <div className="chat-empty">
            <div className="chat-empty-icon">
                <Bot size={32} />
            </div>
            <h2 className="chat-empty-title">Cyber-Scholar</h2>
            <p className="chat-empty-desc">
                你的 AI 学术管理助手，当前使用&nbsp;<strong>{activeLabel}</strong>。
                <br />发送消息开始对话。
            </p>
            <div className="chat-empty-suggestions">
                {['帮我整理今天的 DDL 清单', '我的实验跑了多久了？', '给我推荐一篇相关的论文'].map((s) => (
                    <button key={s} className="chat-suggestion">{s}</button>
                ))}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChatPage() {
    const { messages, isLoading, error, sendMessage, clearHistory } = useChatStore();
    const { providers, activeProviderId } = useLlmStore();
    const activeProvider = providers.find((p) => p.id === activeProviderId);

    const [input, setInput] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    function handleSend() {
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
        // Reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setInput(e.target.value);
        // Auto-grow
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    }

    function handleSuggestion(text: string) {
        sendMessage(text);
    }

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-header">
                <Bot size={16} />
                <span className="chat-header-title">Cyber-Scholar AI</span>
                {activeProvider && (
                    <span className="chat-header-badge">{activeProvider.label}</span>
                )}
                {messages.length > 0 && (
                    <button className="chat-clear-btn" title="清空对话" onClick={clearHistory}>
                        <RotateCcw size={13} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={listRef}>
                {messages.length === 0 ? (
                    <EmptyChat
                        activeLabel={activeProvider?.label ?? '未配置'}
                    />
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))
                )}
                {/* Scroll anchor for empty suggestion clicks */}
            </div>

            {/* Suggestion click handler (only used in empty state) */}
            {messages.length === 0 && (
                <div style={{ display: 'none' }}>
                    {['帮我整理今天的 DDL 清单', '我的实验跑了多久了？', '给我推荐一篇相关的论文'].map((s) => (
                        <button key={s} onClick={() => handleSuggestion(s)} />
                    ))}
                </div>
            )}

            {/* Error bar */}
            {error && (
                <div className="chat-error-bar">⚠ {error}</div>
            )}

            {/* Input area */}
            <div className="chat-input-area">
                <div className="chat-input-box">
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        rows={1}
                        placeholder="发送消息…（Enter 发送，Shift+Enter 换行）"
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />

                    <button
                        className="chat-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        title="发送"
                    >
                        <ArrowUp size={16} />
                    </button>
                </div>
                <p className="chat-input-hint">Cyber-Scholar 可能犯错，重要事项请自行核实。</p>
            </div>
        </div>
    );
}
