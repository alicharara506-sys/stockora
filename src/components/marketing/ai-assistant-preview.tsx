import { Bot, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";

const SUGGESTED_PROMPTS = [
  "What were my sales last week?",
  "Which products are low in stock?",
  "What was my profit this month?",
  "Which branch performed best?",
];

export function AIAssistantPreview() {
  return (
    <section id="ai-assistant" className="py-20">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Badge variant="purple" className="mb-4 w-fit">
            New
          </Badge>
          <h2 className="font-display text-3xl font-bold text-brand-black">
            Stockora AI — your smart assistant
          </h2>
          <p className="mt-4 max-w-md text-brand-muted">
            Ask anything about your business and get instant answers, grounded in your own sales,
            inventory, and customer data — scoped to what your role is allowed to see.
          </p>
          <ul className="mt-6 space-y-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li
                key={prompt}
                className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-black"
              >
                <Sparkles className="size-4 shrink-0 text-brand-purple" />
                {prompt}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-card-lg">
          <div className="flex items-center gap-2.5 border-b border-brand-border pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple text-white">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Stockora AI</p>
              <p className="flex items-center gap-1 text-xs text-brand-success">
                <span className="size-1.5 rounded-full bg-brand-success" /> Online
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-purple px-4 py-2.5 text-sm text-white">
              What were my sales last week?
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-brand-bg px-4 py-2.5 text-sm text-brand-black">
              Your total sales last week were $18,460 — an increase of 15% compared to the
              previous week.
              <p className="mt-1 text-[11px] text-brand-muted">Beirut Main + Mall · Jul 21–27</p>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-brand-bg px-4 py-2.5 text-sm text-brand-black">
              Show me your top-selling items this month?
              <p className="mt-1 text-[11px] text-brand-muted">Kids T-Shirt · Denim Jeans · Sneakers</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
