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

interface GroqToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface GroqMessage {
  role: string;
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

/**
 * Groq's Chat Completions API is OpenAI-compatible (function-calling shape,
 * not Anthropic's tool_use blocks) and has a genuinely free tier — no
 * payment method required. Implemented with plain `fetch` so enabling it
 * never requires an `npm install`.
 */
class GroqProvider implements AIProvider {
  readonly isConfigured = true;

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async runTurn(params: {
    systemPrompt: string;
    history: AIHistoryMessage[];
    tools: AIToolSpec[];
    executeTool: (name: string, input: unknown) => Promise<unknown>;
  }): Promise<AITurnResult> {
    const toolCalls: AIToolCallLog[] = [];
    let totalTokens = 0;

    const messages: GroqMessage[] = [
      { role: "system", content: params.systemPrompt },
      ...params.history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const tools = params.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.inputSchema },
    }));

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, messages, tools, max_tokens: 1024 }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          text: `The AI provider returned an error (${response.status}): ${errText.slice(0, 300)}`,
          toolCalls,
          totalTokens,
        };
      }

      const data = await response.json();
      totalTokens += data.usage?.total_tokens ?? 0;
      const message: GroqMessage = data.choices[0].message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { text: message.content?.trim() || "I don't have a response for that.", toolCalls, totalTokens };
      }

      messages.push(message);

      for (const call of message.tool_calls) {
        let input: unknown = {};
        try {
          input = JSON.parse(call.function.arguments || "{}");
        } catch {
          // Malformed tool-call arguments from the model — treat as empty input
          // and let runTool()'s own schema validation report the real problem.
        }
        const result = await params.executeTool(call.function.name, input);
        toolCalls.push({ toolName: call.function.name, input, result });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
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
        "The AI assistant isn't connected yet. Add a free GROQ_API_KEY (or a paid ANTHROPIC_API_KEY) " +
        "to your .env file to enable it — until then, the Reports page covers the same analytics.",
      toolCalls: [],
      totalTokens: 0,
    };
  }
}

let cachedProvider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (groqKey) {
    cachedProvider = new GroqProvider(groqKey, process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile");
  } else if (anthropicKey) {
    cachedProvider = new AnthropicProvider(anthropicKey);
  } else {
    cachedProvider = new UnconfiguredProvider();
  }
  return cachedProvider;
}
