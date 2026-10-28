import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { AIProviderError, DEFAULT_GROQ_MODEL, GroqProvider } from "./groq";
import type { AIProvider } from "./types";

const params: Parameters<AIProvider["runTurn"]>[0] = {
  systemPrompt: "Use the business tools for all figures.",
  history: [{ role: "user", content: "How many products do I have?" }],
  tools: [{ name: "getProducts", description: "Read product count", inputSchema: { type: "object" } }],
  executeTool: async () => ({ ok: true, data: { count: 3 } }),
};

function stubProvider(responses: Response[]) {
  const requests: RequestInit[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    requests.push(init ?? {});
    const response = responses.shift();
    assert.ok(response, "an unexpected additional API call was made");
    return response;
  };
  return { provider: new GroqProvider("test-key", undefined, fetcher), requests };
}

function answer(content: string | null, finishReason = "stop") {
  return Response.json({
    choices: [{ message: { role: "assistant", content }, finish_reason: finishReason }],
    usage: { total_tokens: 30 },
  });
}

function toolRequest(argumentsText = "{}") {
  return Response.json({
    choices: [{
      message: {
        role: "assistant",
        content: null,
        reasoning: "private reasoning should not be repeated in the request",
        tool_calls: [{ id: "call-1", type: "function", function: { name: "getProducts", arguments: argumentsText } }],
      },
      finish_reason: "tool_calls",
    }],
    usage: { total_tokens: 20 },
  });
}

describe("Groq assistant", () => {
  test("fetches business data and sends the matching tool result back before answering", async () => {
    const { provider, requests } = stubProvider([toolRequest(), answer("You have 3 products.")]);
    const executed: string[] = [];
    const result = await provider.runTurn({
      ...params,
      executeTool: async (name, input) => {
        executed.push(name);
        assert.deepEqual(input, {});
        return { ok: true, data: { count: 3 } };
      },
    });

    assert.equal(result.text, "You have 3 products.");
    assert.equal(result.totalTokens, 50);
    assert.deepEqual(executed, ["getProducts"]);
    assert.equal(result.toolCalls.length, 1);
    const first = JSON.parse(String(requests[0].body));
    assert.equal(first.model, DEFAULT_GROQ_MODEL);
    assert.equal(first.reasoning_effort, "low");
    assert.equal(first.include_reasoning, false);
    assert.equal(first.max_completion_tokens, 2048);
    assert.equal(requests[0].cache, "no-store");
    assert.ok(requests[0].signal instanceof AbortSignal);
    const second = JSON.parse(String(requests[1].body));
    assert.deepEqual(second.messages.at(-1), {
      role: "tool",
      tool_call_id: "call-1",
      content: JSON.stringify({ ok: true, data: { count: 3 } }),
    });
    assert.equal(String(requests[1].body).includes("private reasoning"), false);
  });

  test("passes permission denials to the model without inventing business figures", async () => {
    const { provider, requests } = stubProvider([toolRequest(), answer("You need permission to view products.")]);
    const result = await provider.runTurn({
      ...params,
      executeTool: async () => ({ ok: false, error: "Permission denied" }),
    });
    assert.match(result.text, /permission/);
    const body = JSON.parse(String(requests[1].body));
    assert.deepEqual(JSON.parse(body.messages.at(-1).content), { ok: false, error: "Permission denied" });
  });

  test("surfaces the free-tier retry time without retrying or exposing provider diagnostics", async () => {
    const { provider, requests } = stubProvider([
      new Response("internal diagnostic that must stay private", { status: 429, headers: { "retry-after": "12" } }),
    ]);
    await assert.rejects(provider.runTurn(params), (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.match(error.message, /12 seconds/);
      assert.doesNotMatch(error.message, /internal diagnostic/);
      return true;
    });
    assert.equal(requests.length, 1);
  });

  test("returns actionable errors for rejected credentials, unavailable models and service failures", async () => {
    for (const [status, expected] of [[401, /API key/], [403, /model access/], [404, /model is unavailable/], [503, /try again shortly/]] as const) {
      const { provider } = stubProvider([new Response("private error", { status })]);
      await assert.rejects(provider.runTurn(params), expected);
    }
  });

  test("rejects malformed tool arguments without executing a business tool", async () => {
    const { provider } = stubProvider([toolRequest("not valid JSON")]);
    let executed = false;
    await assert.rejects(provider.runTurn({
      ...params,
      executeTool: async () => { executed = true; return {}; },
    }), /valid data request/);
    assert.equal(executed, false);
  });

  test("does not treat malformed, empty or truncated completions as successful answers", async () => {
    for (const response of [Response.json({ choices: [] }), answer(null), answer("partial", "length")]) {
      const { provider } = stubProvider([response]);
      await assert.rejects(provider.runTurn(params), AIProviderError);
    }
  });

  test("bounds repeated tool calls instead of exhausting a free API allowance", async () => {
    const { provider, requests } = stubProvider(Array.from({ length: 5 }, () => toolRequest()));
    await assert.rejects(provider.runTurn(params), /too many steps/);
    assert.equal(requests.length, 5);
  });

  test("handles network failures without returning raw errors or credentials", async () => {
    const fetcher: typeof fetch = async () => { throw new TypeError("private connection details"); };
    const provider = new GroqProvider("test-key", undefined, fetcher);
    await assert.rejects(provider.runTurn(params), (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.match(error.message, /could not reach Groq/);
      assert.doesNotMatch(error.message, /private connection|test-key/);
      return true;
    });
  });
});
