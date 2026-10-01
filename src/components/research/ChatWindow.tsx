import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Globe, FileText, Play, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { PageRead, SearchResults } from "@/components/research/SearchResultCard";
import { BranchingInvestigationGraph } from "@/components/research/BranchingInvestigationGraph";
import { ReportToolbar } from "@/components/research/ReportToolbar";
import { ApiKeyModal } from "@/components/research/ApiKeyModal";
import agentMark from "@/assets/agent-mark.png";
import { saveThreadMessages } from "@/lib/threads";

const PROMPT_LENSES = [
  {
    label: "Market Viability",
    prompt: "What is the commercial viability, pricing elasticity, and unit economics of ",
  },
  {
    label: "Tech Trade-Offs",
    prompt: "Compare the real-world latency, failure modes, and scalability bottlenecks of ",
  },
  {
    label: "Regulatory & Risk",
    prompt: "What are the regulatory hurdles, compliance risks, and legal vulnerabilities of ",
  },
  {
    label: "Competitive Moats",
    prompt: "What is the true long-term defensibility and competitive moat of ",
  },
];

function getRelatedQuestions(text: string, userQuery: string): string[] {
  const matchSection = text.match(
    /(?:###\s*(?:9\.\s*)?Related\s*(?:Strategic\s*)?(?:Questions|Inquiries))([\s\S]*?)(?:###|$)/i
  );
  if (matchSection && matchSection[1]) {
    const lines = matchSection[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-*•\d.]+\s+/.test(l))
      .map((l) =>
        l
          .replace(/^[-*•\d.]+\s+/, "")
          .replace(/^\[|\]$/g, "")
          .trim()
      )
      .filter((l) => l.length > 10 && !l.toLowerCase().includes("specific follow-up"));
    if (lines.length >= 2) {
      return lines.slice(0, 3);
    }
  }

  let clean = userQuery
    .replace(/^please\s+(continue|expand|deepen|decompose)[^.]*?[.:]\s*/i, "")
    .replace(/^(expand and deepen the verdict analysis with|decompose the next critical sub-question and|please continue directly from where you left off)[^.]*?[.:]?\s*/i, "")
    .replace(/[?.!]+$/, "")
    .trim();

  if (!clean || clean.length < 5) clean = "this domain";

  return [
    `What are the critical real-world bottlenecks and failure modes of ${clean}?`,
    `What do verified benchmarks and independent case studies show regarding ${clean}?`,
    `How do leading alternatives and unit economics compare against ${clean}?`,
  ];
}

export function ChatWindow({
  threadId,
  initialMessages,
  onMessagesChange,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onMessagesChange: () => void;
}) {
  const [input, setInput] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("researchify.apiKey");
      if (stored && (stored.includes("ff0e6ccf") || stored.endsWith("4908c84c"))) {
        localStorage.removeItem("researchify.apiKey");
        setHasCustomKey(false);
      } else {
        setHasCustomKey(Boolean(stored));
      }
    }
  }, []);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => {
        if (typeof window === "undefined") return {};
        const key = localStorage.getItem("researchify.apiKey") || "";
        if (key && !key.includes("ff0e6ccf") && !key.endsWith("4908c84c")) {
          return { "x-api-key": key };
        }
        return {};
      },
    }),
    onError: (chatError) => {
      toast.error("Research failed", { description: chatError.message });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "submitted" || status === "streaming") return;
    saveThreadMessages(threadId, messages);
    onMessagesChange();
  }, [messages, status, threadId, onMessagesChange]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      void sendMessage({ text: trimmed });
    },
    [busy, sendMessage],
  );

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
              <img src={agentMark} alt="" width={816} height={816} className="size-20" />
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold">Autonomous Research Intelligence</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ask any strategic inquiry, technology dilemma, or market question. Researchify AI breaks it into research tasks, reads live sources, stress-tests claims with Verdict Analysis, and writes a cited dossier.
                </p>
              </div>

              <ApiKeyModal
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 hover:bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-all shadow-xs"
                  >
                    <span>{hasCustomKey ? "🟢 Live LLM API Connected" : "💡 Autonomous Synthesis Active · Connect LLM API"}</span>
                  </button>
                }
              />
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {PROMPT_LENSES.map((lens) => (
                  <button
                    key={lens.label}
                    type="button"
                    onClick={() => {
                      setInput(lens.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-accent hover:text-accent hover:bg-accent/5"
                  >
                    + {lens.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message, messageIndex) => {
            const searches =
              message.role === "assistant"
                ? message.parts
                    .filter((p) => p.type === "tool-web_search")
                    .map((p) => {
                      const anyPart = p as any;
                      const input = anyPart.input as { query?: string; purpose?: string } | undefined;
                      const output = (anyPart.output ?? (anyPart.state === "output-available" ? anyPart.output : undefined)) as
                        | { results?: Array<{ title?: string; url?: string; snippet?: string }> }
                        | undefined;
                      return {
                        query: input?.query,
                        purpose: input?.purpose,
                        results: output?.results,
                      };
                    })
                : [];

            const prevUserMsg = messages
              .slice(0, messageIndex)
              .reverse()
              .find((m) => m.role === "user");
            const queryTitle =
              prevUserMsg?.parts?.find((p) => p.type === "text")?.text || "Research Objective";

            const assistantFullText =
              message.role === "assistant"
                ? message.parts
                    .filter((p) => p.type === "text")
                    .map((p: any) => p.text)
                    .join("\n\n")
                : "";

            const totalSourcesCount = searches.reduce(
              (acc, s) => acc + (s.results?.length ?? 0),
              0
            );

            return (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  className={message.role === "user" ? "bg-primary text-primary-foreground" : undefined}
                >
                  {searches.length > 0 ? (
                    <BranchingInvestigationGraph
                      question={queryTitle}
                      searches={searches}
                      isLive={busy && message.id === messages[messages.length - 1]?.id}
                    />
                  ) : null}

                  {message.role === "assistant" && assistantFullText.trim().length > 80 ? (
                    <ReportToolbar
                      title={queryTitle}
                      markdownContent={assistantFullText}
                      sourcesCount={totalSourcesCount}
                      isStreaming={busy && messageIndex === messages.length - 1}
                    />
                  ) : null}
                  {message.parts.map((part, index) => {
                  const key = `${message.id}-${index}`;

                  if (part.type === "text") {
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  }

                  if (part.type === "reasoning" && part.text.trim()) {
                    return (
                      <details key={key} className="mb-3 text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none font-medium">Thinking</summary>
                        <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                      </details>
                    );
                  }

                  if (part.type === "tool-web_search" || part.type === "tool-read_page") {
                    const isSearch = part.type === "tool-web_search";
                    const label = isSearch
                      ? `Searching the web${
                          (part.input as { query?: string } | undefined)?.query
                            ? `: ${(part.input as { query?: string }).query}`
                            : ""
                        }`
                      : "Reading a page";
                    return (
                      <Tool defaultOpen={false} key={key}>
                        <ToolHeader
                          type={part.type}
                          state={part.state}
                          title={label}
                          className="[&_svg:first-child]:hidden"
                        />
                        <ToolContent>
                          <ToolInput input={part.input} />
                          <ToolOutput
                            errorText={part.errorText}
                            output={
                              part.state === "output-available" ? (
                                isSearch ? (
                                  <SearchResults output={part.output as never} />
                                ) : (
                                  <PageRead output={part.output as never} />
                                )
                              ) : undefined
                            }
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}

                {message.role === "assistant" && !busy && messageIndex === messages.length - 1 ? (() => {
                  const assistantText =
                    message.parts
                      ?.filter((p) => p.type === "text")
                      .map((p: any) => p.text)
                      .join(" ") ||
                    (message as any).content ||
                    "";

                  const firstUserMessage = messages.find(
                    (m) =>
                      m.role === "user" &&
                      !m.parts?.some(
                        (p: any) =>
                          p.text?.startsWith("Please continue") ||
                          p.text?.startsWith("Expand and deepen")
                      )
                  );
                  const lastUserMessage = [...messages.slice(0, messageIndex + 1)]
                    .reverse()
                    .find((m) => m.role === "user");

                  const targetUserMessage = firstUserMessage ?? lastUserMessage;
                  const primaryUserQuery =
                    targetUserMessage?.parts
                      ?.filter((p) => p.type === "text")
                      .map((p: any) => p.text)
                      .join(" ") ||
                    (targetUserMessage as any)?.content ||
                    "";

                  const related = getRelatedQuestions(assistantText, primaryUserQuery);
                  if (related.length === 0) return null;

                  return (
                    <div className="mt-5 space-y-2.5 border-t border-border/50 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Sparkles className="size-3.5 text-accent" /> Questions Related to Your Research
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            submit(
                              "Please continue directly from where you left off and complete any remaining sections of the research dossier in full detail."
                            )
                          }
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
                        >
                          <Play className="size-2.5 fill-current" /> Continue Dossier
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {related.map((question, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            onClick={() => submit(question)}
                            className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/70 p-3.5 text-left transition-all duration-200 hover:border-accent hover:bg-accent/5 hover:shadow-xs"
                          >
                            <span className="text-xs font-medium text-foreground line-clamp-3 group-hover:text-accent">
                              {question}
                            </span>
                            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-accent">
                              Research this <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })() : null}
              </MessageContent>
            </Message>
          );
        })}

          {status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-accent" />
              <Shimmer>Planning the research…</Shimmer>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-card/60 px-4 py-3">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(message, event) => {
              event.preventDefault();
              submit(message.text ?? input);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ask an open-ended research question…"
            />
            <PromptInputFooter className="justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Evidence-backed intelligence
                </span>
                <ApiKeyModal
                  trigger={
                    <button
                      type="button"
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 transition-colors"
                    >
                      {hasCustomKey ? "Custom Key Active" : "Live API Active"}
                    </button>
                  }
                />
              </div>
              <PromptInputSubmit
                status={status}
                disabled={!busy && input.trim().length === 0}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
