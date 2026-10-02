import type { UIMessage } from "ai";

export type ResearchThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "researchify.ai.threads.v1";
const LEGACY_STORAGE_KEY = "cortex.research.threads.v1";

export function newThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function loadThreads(): ResearchThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchThread[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((thread) => thread && typeof thread.id === "string")
      .map((thread) => ({
        id: thread.id,
        title: thread.title || "Untitled research",
        updatedAt: thread.updatedAt || 0,
        messages: Array.isArray(thread.messages) ? thread.messages : [],
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function persist(threads: ResearchThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error("Could not save research history", error);
  }
}

export function createThread(id: string = newThreadId()): ResearchThread {
  const thread: ResearchThread = { id, title: "New research", updatedAt: Date.now(), messages: [] };
  const threads = loadThreads();
  if (!threads.some((t) => t.id === id)) {
    persist([thread, ...threads]);
  }
  return thread;
}

/** Idempotent: returns the thread for `id`, creating it if it does not exist yet. */
export function ensureThread(id: string): ResearchThread {
  const existing = loadThreads().find((thread) => thread.id === id);
  return existing ?? createThread(id);
}

export function saveThreadMessages(id: string, messages: UIMessage[]) {
  const threads = loadThreads();
  const index = threads.findIndex((thread) => thread.id === id);
  const title = deriveTitle(messages) ?? threads[index]?.title ?? "New research";
  const updated: ResearchThread = { id, title, updatedAt: Date.now(), messages };
  const next =
    index === -1 ? [updated, ...threads] : threads.map((t) => (t.id === id ? updated : t));
  persist(next.sort((a, b) => b.updatedAt - a.updatedAt));
  return next;
}

export function deleteThread(id: string) {
  const next = loadThreads().filter((thread) => thread.id !== id);
  persist(next);
  return next;
}

export function deriveTitle(messages: UIMessage[]): string | null {
  const first = messages.find((message) => message.role === "user");
  if (!first) return null;
  const text = first.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
  if (!text) return null;
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}
