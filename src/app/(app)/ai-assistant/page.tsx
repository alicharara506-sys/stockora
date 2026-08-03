import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { getUsageStatus } from "@/lib/ai/usage";
import { ChatClient } from "@/components/ai-assistant/chat-client";

export default async function AiAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const context = await requireBusinessContext();
  const { conversation: requestedId } = await searchParams;

  const conversations = await prisma.aIConversation.findMany({
    where: { businessId: context.business.id, userId: context.userId },
    orderBy: { createdAt: "desc" },
    include: { messages: { where: { role: "USER" }, orderBy: { createdAt: "asc" }, take: 1 } },
    take: 30,
  });

  const activeConversationId =
    requestedId && conversations.some((c) => c.id === requestedId) ? requestedId : (conversations[0]?.id ?? null);

  const messages = activeConversationId
    ? await prisma.aIMessage.findMany({
        where: { conversationId: activeConversationId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const usage = await getUsageStatus(context.business.id, context.userId);

  return (
    <ChatClient
      conversations={conversations.map((c) => ({
        id: c.id,
        title: c.title ?? c.messages[0]?.content.slice(0, 60) ?? "New conversation",
        createdAt: c.createdAt.toISOString(),
      }))}
      activeConversationId={activeConversationId}
      messages={messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        createdAt: m.createdAt.toISOString(),
      }))}
      usage={usage}
    />
  );
}
