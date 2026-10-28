export interface AIToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AIHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIToolCallLog {
  toolName: string;
  input: unknown;
  result: unknown;
}

export interface AITurnResult {
  text: string;
  toolCalls: AIToolCallLog[];
  totalTokens: number;
}

export interface AIProvider {
  readonly isConfigured: boolean;
  runTurn(params: {
    systemPrompt: string;
    history: AIHistoryMessage[];
    tools: AIToolSpec[];
    executeTool: (name: string, input: unknown) => Promise<unknown>;
  }): Promise<AITurnResult>;
}
