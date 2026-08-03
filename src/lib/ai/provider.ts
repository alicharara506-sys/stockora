import "server-only";
import Anthropic from "@anthropic-ai/sdk";

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

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 5;

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  readonly isConfigured = true;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async runTurn(params: {
    systemPrompt: string;
    history: AIHistoryMessage[];
    tools: AIToolSpec[];
    executeTool: (name: string, input: unknown) => Promise<unknown>;
  }): Promise<AITurnResult> {
    const toolCalls: AIToolCallLog[] = [];
    let totalTokens = 0;

    const messages: Anthropic.MessageParam[] = params.history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const anthropicTools: Anthropic.Tool[] = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: params.systemPrompt,
        messages,
        tools: anthropicTools,
      });

      totalTokens += response.usage.input_tokens + response.usage.output_tokens;

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
        return { text: text || "I don't have a response for that.", toolCalls, totalTokens };
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await params.executeTool(block.name, block.input);
        toolCalls.push({ toolName: block.name, input: block.input, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return {
      text: "I looked into this using several tools but couldn't finish in time — try narrowing your question.",
      toolCalls,
      totalTokens,
    };
  }
}

class UnconfiguredProvider implements AIProvider {
  readonly isConfigured = false;

  async runTurn(): Promise<AITurnResult> {
    return {
      text:
        "The AI assistant isn't connected yet. Ask your workspace owner to add an ANTHROPIC_API_KEY " +
        "to enable it — until then, the Reports page covers the same analytics.",
      toolCalls: [],
      totalTokens: 0,
    };
  }
}

let cachedProvider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cachedProvider = apiKey ? new AnthropicProvider(apiKey) : new UnconfiguredProvider();
  return cachedProvider;
}
