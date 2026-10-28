import "server-only";
import { AIProviderError, DEFAULT_GROQ_MODEL, GroqProvider } from "./groq";
import type { AIProvider, AITurnResult } from "./types";

export { AIProviderError } from "./groq";
export type { AIProvider, AIHistoryMessage, AIToolSpec, AITurnResult } from "./types";

class UnconfiguredProvider implements AIProvider {
  readonly isConfigured = false;

  async runTurn(): Promise<AITurnResult> {
    throw new AIProviderError("The AI assistant is not connected yet. Ask your workspace owner to connect Groq.");
  }
}

export function getAIProvider(): AIProvider {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return new UnconfiguredProvider();

  return new GroqProvider(apiKey, process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL);
}
