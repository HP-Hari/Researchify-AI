import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import agentMark from "@/assets/agent-mark.png";
import { loadThreads, newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortex — Autonomous Research Agent" },
      {
        name: "description",
        content:
          "Ask an open-ended question. Cortex breaks it into research tasks, compares live sources, and writes a cited report.",
      },
      { property: "og:title", content: "Cortex — Autonomous Research Agent" },
      {
        property: "og:description",
        content:
          "Ask an open-ended question. Cortex breaks it into research tasks, compares live sources, and writes a cited report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = loadThreads();
    const target = existing.find((thread) => thread.messages.length === 0) ?? existing[0];
    const threadId = target?.id ?? newThreadId();
    void navigate({ to: "/chat/$threadId", params: { threadId }, replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src={agentMark} alt="" width={816} height={816} className="size-14 animate-pulse" />
        <p className="font-display text-2xl">Cortex</p>
      </div>
    </div>
  );
}
