import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import type { AIProvider, AIToolCallLog, AITurnResult } from "./types";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ITERATIONS = 5;
const TURN_TIMEOUT_MS = 45_000;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_TIMEOUT_MS = 12_000;
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
]);

function networkErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return;
  const cause = "cause" in error ? error.cause : undefined;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string") {
    return cause.code;
  }
  return "code" in error && typeof error.code === "string" ? error.code : undefined;
}

const toolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal("function"),
  function: z.object({ name: z.string().min(1), arguments: z.string() }),
});

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      role: z.literal("assistant"),
      content: z.string().nullable().optional(),
      tool_calls: z.array(toolCallSchema).optional(),
    }),
    finish_reason: z.string().nullable().optional(),
  })).min(1),
  usage: z.object({ total_tokens: z.number().int().nonnegative() }).optional(),
});

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: z.infer<typeof toolCallSchema>[];
  tool_call_id?: string;
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

// Credentials are supplied exclusively by the server-only provider module.
export class GroqProvider implements AIProvider {
  readonly isConfigured = true;

  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_GROQ_MODEL,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(body: string, signal: AbortSignal): Promise<Response> {
    for (let attempt = 0; attempt < MAX_CONNECTION_ATTEMPTS; attempt++) {
      const attemptSignal = AbortSignal.any([signal, AbortSignal.timeout(CONNECTION_TIMEOUT_MS)]);
      try {
        return await this.fetcher("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          cache: "no-store",
          signal: attemptSignal,
          body,
        });
      } catch (error) {
        if (signal.aborted) {
          throw new AIProviderError("The AI request took too long. Please try a shorter question.");
        }
        const code = networkErrorCode(error);
        const retryable = attemptSignal.aborted || (code !== undefined && RETRYABLE_NETWORK_CODES.has(code));
        console.warn("Groq connection attempt failed", {
          attempt: attempt + 1,
          code: code && RETRYABLE_NETWORK_CODES.has(code) ? code : attemptSignal.aborted ? "ATTEMPT_TIMEOUT" : "NETWORK_ERROR",
        });
        if (!retryable || attempt === MAX_CONNECTION_ATTEMPTS - 1) {
          throw new AIProviderError("Stockora could not reach Groq. Check the server's internet connection and try again shortly.");
        }
        try {
          await delay(200 * 2 ** attempt, undefined, { signal });
        } catch {
          throw new AIProviderError("The AI request took too long. Please try a shorter question.");
        }
      }
    }
    throw new AIProviderError("Stockora could not reach Groq. Please try again shortly.");
  }

  private async complete(messages: GroqMessage[], tools: unknown[], signal: AbortSignal) {
    const response = await this.request(JSON.stringify({
      model: this.model,
      messages,
      ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
      max_completion_tokens: 2048,
      ...(this.model.startsWith("openai/gpt-oss-")
        ? { reasoning_effort: "low", include_reasoning: false }
        : {}),
    }), signal);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? ` Please try again in ${Math.ceil(retryAfter)} seconds.`
          : " Please try again later.";
        throw new AIProviderError(`Groq's free usage limit has been reached.${wait}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError("Groq could not authorize this request. Ask your workspace owner to check the API key and model access.");
      }
      if (response.status === 404) {
        throw new AIProviderError("The selected AI model is unavailable. Ask your workspace owner to check the Groq model setting.");
      }
      throw new AIProviderError("Groq could not complete this request. Please try again shortly.");
    }

    try {
      return completionSchema.parse(await response.json());
    } catch {
      throw new AIProviderError(signal.aborted
        ? "The AI request took too long. Please try a shorter question."
        : "Groq returned an incomplete response. Please try again.");
    }
  }

  async runTurn(params: Parameters<AIProvider["runTurn"]>[0]): Promise<AITurnResult> {
    const toolCalls: AIToolCallLog[] = [];
    let totalTokens = 0;
    const signal = AbortSignal.timeout(TURN_TIMEOUT_MS);
    const messages: GroqMessage[] = [
      { role: "system", content: params.systemPrompt },
      ...params.history,
    ];
    const tools = params.tools.map((tool) => ({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    }));

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const data = await this.complete(messages, tools, signal);
      totalTokens += data.usage?.total_tokens ?? 0;
      const { message, finish_reason: finishReason } = data.choices[0];

      if (finishReason === "length") {
        throw new AIProviderError("The AI answer was too long to complete. Please narrow your question.");
      }
      if (!message.tool_calls?.length) {
        const text = message.content?.trim();
        if (!text) throw new AIProviderError("Groq returned an empty answer. Please try a more specific question.");
        return { text, toolCalls, totalTokens };
      }

      messages.push(message);
      for (const call of message.tool_calls) {
        let input: unknown;
        try {
          input = JSON.parse(call.function.arguments);
        } catch {
          throw new AIProviderError("The AI could not form a valid data request. Please rephrase your question.");
        }
        const result = await params.executeTool(call.function.name, input);
        toolCalls.push({ toolName: call.function.name, input, result });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    throw new AIProviderError("The AI needed too many steps to finish. Please ask a more specific question.");
  }
}
