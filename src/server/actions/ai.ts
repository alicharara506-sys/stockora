"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenancy";
import { AIProviderError, getAIProvider, type AITurnResult } from "@/lib/ai/provider";
import { getToolSpecs, runTool } from "@/lib/ai/tools";
import { getUsageStatus, recordUsage } from "@/lib/ai/usage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createConversationAction(): Promise<never> {
  const context = await requireBusinessContext();
  const conversation = await prisma.aIConversation.create({
    data: { businessId: context.business.id, userId: context.userId },
  });
  revalidatePath("/ai-assistant");
  redirect(`/ai-assistant?conversation=${conversation.id}`);
}

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

function buildSystemPrompt(businessName: string, roleName: string) {
  return [
    `You are the Stockora AI assistant for "${businessName}", a retail point-of-sale and inventory platform.`,
    `The person you're talking to holds the "${roleName}" role.`,
    "Answer questions about sales, inventory, customers, and profitability using ONLY the provided tools — never invent numbers.",
    "If a tool call is denied for permission reasons, tell the user plainly which permission they're missing rather than guessing at numbers.",
    "Keep answers concise and cite concrete figures returned by tools. Today's date context comes from the tools themselves.",
  ].join(" ");
}

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const context = await requireBusinessContext();
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { conversationId, content } = parsed.data;

  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, businessId: context.business.id, userId: context.userId },
  });
  if (!conversation) return { success: false, error: "Conversation not found." };

  const provider = getAIProvider();
  if (!provider.isConfigured) {
    return { success: false, error: "The AI assistant is not connected yet. Ask your workspace owner to connect Groq." };
  }

  const usage = await getUsageStatus(context.business.id, context.userId);
  if (usage.remaining <= 0) {
    return {
      success: false,
      error: `You've reached this month's AI message limit (${usage.limit}). Ask your workspace owner to upgrade the plan.`,
    };
  }

  const priorMessages = await prisma.aIMessage.findMany({
    where: { conversationId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: 19,
  });

  let result: AITurnResult;
  try {
    result = await provider.runTurn({
      systemPrompt: buildSystemPrompt(context.business.name, context.role.name),
      history: [
        ...priorMessages.reverse().map((m) => ({
          role: m.role === "USER" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
        { role: "user", content },
      ],
      tools: getToolSpecs(),
      executeTool: (name, toolInput) =>
        runTool(name, toolInput, { businessId: context.business.id, permissions: context.permissions }),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof AIProviderError ? error.message : "The AI assistant could not respond. Please try again.",
    };
  }

  await prisma.$transaction([
    prisma.aIMessage.create({
      data: { conversationId, role: "USER", content },
    }),
    ...result.toolCalls.map((call) =>
      prisma.aIMessage.create({
        data: {
          conversationId,
          role: "TOOL",
          content: `Called ${call.toolName}`,
          toolName: call.toolName,
          toolResult: call.result as never,
        },
      }),
    ),
    prisma.aIMessage.create({
      data: { conversationId, role: "ASSISTANT", content: result.text },
    }),
  ]);

  await recordUsage(context.business.id, context.userId, result.totalTokens);

  revalidatePath("/ai-assistant");
  return { success: true };
}
