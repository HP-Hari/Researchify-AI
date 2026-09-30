import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ChatWindow } from "@/components/research/ChatWindow";
import { ApiKeyModal } from "@/components/research/ApiKeyModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import agentMark from "@/assets/agent-mark.png";
import {
  deleteThread,
  ensureThread,
  loadThreads,
  newThreadId,
  type ResearchThread,
} from "@/lib/threads";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Research session — Researchify AI" },
      {
        name: "description",
        content: "An open research session: sub-tasks, live sources, and a cited report.",
      },
      { property: "og:title", content: "Research session — Researchify AI" },
      {
        property: "og:description",
        content: "An open research session: sub-tasks, live sources, and a cited report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ResearchThread[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureThread(threadId);
    setThreads(loadThreads());
    setReady(true);
  }, [threadId]);

  const refresh = useCallback(() => setThreads(loadThreads()), []);

  const active = threads.find((thread) => thread.id === threadId);

  const startNew = () => {
    const id = newThreadId();
    void navigate({ to: "/chat/$threadId", params: { threadId: id } });
  };

  const remove = (id: string) => {
    const next = deleteThread(id);
    setThreads(next);
    if (id === threadId) {
      const fallback = next[0]?.id ?? newThreadId();
      void navigate({ to: "/chat/$threadId", params: { threadId: fallback } });
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-4 py-4">
          <img src={agentMark} alt="" width={816} height={816} className="size-7" />
          <span className="font-display text-xl leading-none font-semibold">Researchify AI</span>
        </Link>

        <button
          type="button"
          onClick={startNew}
          className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New research
        </button>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          <p className="px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Saved in this browser
          </p>
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-center gap-1 rounded-md pr-1 ${
                thread.id === threadId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
              }`}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                className="min-w-0 flex-1 truncate px-2 py-2 text-sm"
              >
                {thread.title}
              </Link>
              <button
                type="button"
                aria-label="Delete research"
                onClick={() => remove(thread.id)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border/60 bg-sidebar/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              API Key
            </span>
            <ApiKeyModal
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
                >
                  <KeyRound className="size-3.5 text-primary" />
                  <span>Configure</span>
                </button>
              }
            />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Appearance
            </span>
            <ThemeToggle showLabel />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <img src={agentMark} alt="" width={816} height={816} className="size-6" />
            <span className="font-display text-lg leading-none font-semibold">Researchify AI</span>
          </div>
          <div className="flex items-center gap-2">
            <ApiKeyModal
              trigger={
                <button
                  type="button"
                  aria-label="API Key"
                  className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <KeyRound className="size-4" />
                </button>
              }
            />
            <ThemeToggle />
            <button
              type="button"
              onClick={startNew}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium"
            >
              New
            </button>
          </div>
        </header>

        {ready ? (
          <ChatWindow
            key={threadId}
            threadId={threadId}
            initialMessages={active?.messages ?? []}
            onMessagesChange={refresh}
          />
        ) : null}
      </main>
    </div>
  );
}
