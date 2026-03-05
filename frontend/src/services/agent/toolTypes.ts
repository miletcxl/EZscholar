// ─── Tool Execution Types ─────────────────────────────────────────────────────
// Extended OpenAI chat completion types to include tool calling.

export interface ChatCompletionToolFunction {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
}

export interface ChatCompletionTool {
    type: 'function';
    function: ChatCompletionToolFunction;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

/** Extended response choice that may have a tool_calls field */
export interface ChoiceWithTools {
    index: number;
    message: {
        role: 'assistant';
        content: string | null;
        tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | string;
}

/** Result returned by a tool executor after running */
export interface ToolExecutionResult {
    toolCallId: string;
    toolName: string;
    /** Human-readable summary for the chat UI */
    summary: string;
    /** The raw result to pass back to the model as a tool message */
    content: string;
    /** Whether the execution was successful */
    ok: boolean;
}
