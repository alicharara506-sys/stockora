"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Send, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createConversationAction, sendMessageAction } from "@/server/actions/ai";

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  toolName: string | null;
  createdAt: string;
}

interface ChatClientProps {
  aiConfigured: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  usage: { limit: number; used: number; remaining: number };
}

const SUGGESTIONS = [
  "How were sales this week compared to last week?",
  "What are my top 5 products by revenue this month?",
  "Which variants are low on stock right now?",
  "What's my gross profit this month?",
];

export function ChatClient({ aiConfigured, conversations, activeConversationId, messages, usage }: ChatClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const limitReached = usage.remaining <= 0;

  function handleNewConversation() {
    startTransition(async () => {
      await createConversationAction();
    });
  }

  function handleSend(content: string) {
    if (!aiConfigured || !activeConversationId || !content.trim() || limitReached || isPending) return;
    setError(null);
    setDraft("");
    startTransition(async () => {
      const result = await sendMessageAction({ conversationId: activeConversationId, content });
      if (!result.success) {
        setError(result.error);
        setDraft(content);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]" style={{ minHeight: "70vh" }}>
      <Card className="flex flex-col p-3">
        <Button size="sm" className="mb-3" onClick={handleNewConversation} disabled={isPending}>
          <Plus className="size-4" />
          New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-3 text-xs text-brand-muted">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/ai-assistant?conversation=${c.id}`)}
              className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                c.id === activeConversationId
                  ? "bg-brand-purple-lightest text-brand-accent font-medium"
                  : "text-brand-black hover:bg-brand-purple-lightest/60"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <p className="mt-3 border-t border-brand-border pt-3 text-xs text-brand-muted">
          {usage.used} / {usage.limit} messages used this month
        </p>
      </Card>

      <Card className="flex flex-col p-0">
        {!aiConfigured && (
          <p role="status" className="border-b border-brand-border px-6 py-4 text-sm text-brand-muted">
            The AI assistant is not connected yet. Your workspace owner needs to connect Groq before you can send a message.
          </p>
        )}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {!activeConversationId && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-brand-muted">
              <Bot className="size-8" />
              <p className="text-sm">Start a new chat to ask about sales, inventory, or profit.</p>
            </div>
          )}

          {activeConversationId && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Bot className="size-8 text-brand-muted" />
              <p className="text-sm text-brand-muted">Try asking one of these:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={!aiConfigured || isPending || limitReached}
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-brand-border px-3 py-1.5 text-xs text-brand-black hover:bg-brand-purple-lightest"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === "TOOL") {
              return (
                <details key={message.id} className="mx-auto max-w-lg rounded-xl border border-brand-border bg-brand-purple-lightest/40 px-3 py-2 text-xs text-brand-muted">
                  <summary className="cursor-pointer select-none font-medium text-brand-accent">
                    <Wrench className="mr-1 inline size-3" />
                    Used {message.toolName}
                  </summary>
                </details>
              );
            }
            if (message.role === "SYSTEM") return null;

            const isUser = message.role === "USER";
            return (
              <div key={message.id} className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    isUser ? "bg-brand-black text-white" : "bg-brand-purple-lightest text-brand-accent"
                  }`}
                >
                  {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div
                  className={`max-w-lg whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    isUser ? "bg-brand-black text-white" : "border border-brand-border bg-brand-surface text-brand-black"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {isPending && (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-purple-lightest text-brand-accent">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm text-brand-muted">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-brand-border p-4">
          {error && <p className="mb-2 text-xs text-brand-danger">{error}</p>}
          {limitReached && (
            <p className="mb-2 text-xs text-brand-danger">
              You&apos;ve reached this month&apos;s AI message limit. Ask your workspace owner to upgrade the plan.
            </p>
          )}
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(draft);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(draft);
                }
              }}
              placeholder={!aiConfigured ? "AI connection needed" : activeConversationId ? "Ask about sales, inventory, or profit…" : "Start a new chat first"}
              disabled={!aiConfigured || !activeConversationId || isPending || limitReached}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-sm text-brand-black placeholder:text-brand-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!aiConfigured || !activeConversationId || !draft.trim() || isPending || limitReached}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
