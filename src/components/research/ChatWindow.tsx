import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Globe,
  FileText,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Scale,
  Calendar,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PageRead, SearchResults, FinancialCalcResult } from "@/components/research/SearchResultCard";
import { BranchingInvestigationGraph } from "@/components/research/BranchingInvestigationGraph";
import { ReportToolbar } from "@/components/research/ReportToolbar";
import { ApiKeyModal } from "@/components/research/ApiKeyModal";
import { EvidenceDrawer, type VerifiedSource } from "@/components/research/EvidenceDrawer";
import { DossierVisualizer } from "@/components/research/DossierVisualizer";
import { ExecutiveMemoView } from "@/components/research/ExecutiveMemoView";
import agentMark from "@/assets/agent-mark.png";
import { saveThreadMessages } from "@/lib/threads";

const PROMPT_LENSES = [
  {
    label: "Market & Unit Economics",
    prompt: "Evaluate the commercial viability, pricing elasticity, CAC payback, and unit economics of ",
  },
  {
    label: "Tech Scalability & Latency",
    prompt: "Compare real-world latency, operational failure modes, and architectural bottlenecks of ",
  },
  {
    label: "Regulatory & Antitrust Risks",
    prompt: "What are the regulatory hurdles, SEC/FTC compliance liabilities, and antitrust exposure of ",
  },
  {
    label: "Competitive Moats & Defensibility",
    prompt: "What is the true long-term pricing power, switching costs, and defensible moat of ",
  },
];

function getRelatedQuestions(text: string, userQuery: string): string[] {
  const matchSection = text.match(
    /(?:###\s*(?:9\.\s*)?Related\s*(?:Strategic\s*)?(?:Questions|Inquiries)|###\s*9\.\s*Strategic Follow-Up)([\s\S]*?)(?:###|$)/i
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

  if (!clean || clean.length < 5) clean = "this strategy";

  return [
    `What are the critical real-world bottlenecks, tail risks, and failure modes of ${clean}?`,
    `What do verified institutional benchmarks and empirical case studies demonstrate regarding ${clean}?`,
    `How do leading alternatives, capital requirements, and unit economics compare against ${clean}?`,
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
  const [viewModeMap, setViewModeMap] = useState<Record<string, "dossier" | "memo" | "analytics">>({});
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__submitResearch = submit;
    }
  }, [submit]);

  // Compile all unique primary sources across the conversation
  const allSources: VerifiedSource[] = useMemo(() => {
    const list: VerifiedSource[] = [];
    const seen = new Set<string>();

    messages.forEach((msg) => {
      if (msg.role !== "assistant") return;
      msg.parts.forEach((p: any) => {
        if (p.type === "tool-web_search") {
          const out = p.output ?? (p.state === "output-available" ? p.output : undefined);
          const inp = p.input;
          if (out?.results && Array.isArray(out.results)) {
            out.results.forEach((r: any) => {
              if (r.url && !seen.has(r.url)) {
                seen.add(r.url);
                list.push({
                  title: r.title || r.url,
                  url: r.url,
                  snippet: r.snippet || "",
                  domain: r.domain,
                  tier: r.tier || "tier4",
                  tierLabel: r.tierLabel || "Verified Source",
                  angle: inp?.purpose,
                });
              }
            });
          }
        }
      });
    });

    return list;
  }, [messages]);

  return (
    <div className="flex h-full flex-col relative">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
              <img src={agentMark} alt="" width={816} height={816} className="size-20" />
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold">Autonomous Strategic Intelligence</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ask any strategic decision dilemma, unit economics question, or competitive market inquiry. Researchify AI decomposes vectors, extracts empirical data, validates evidence, and generates boardroom-ready intelligence.
                </p>
              </div>

              <ApiKeyModal
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 hover:bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-all shadow-xs cursor-pointer"
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
                    className="rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-accent hover:text-accent hover:bg-accent/5 cursor-pointer"
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
              prevUserMsg?.parts?.find((p) => p.type === "text")?.text || "Strategic Research Objective";

            const assistantFullText =
              message.role === "assistant"
                ? message.parts
                    .filter((p) => p.type === "text")
                    .map((p: any) => p.text)
                    .join("\n\n")
                : "";

            const currentViewMode = viewModeMap[message.id] || "dossier";

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
                      sourcesCount={allSources.length}
                      isStreaming={busy && messageIndex === messages.length - 1}
                      viewMode={currentViewMode}
                      onViewModeChange={(mode) =>
                        setViewModeMap((prev) => ({ ...prev, [message.id]: mode }))
                      }
                      onOpenEvidence={() => setIsEvidenceOpen(true)}
                    />
                  ) : null}

                  {/* Render based on view mode */}
                  {message.role === "assistant" && currentViewMode === "memo" && assistantFullText.trim().length > 80 ? (
                    <ExecutiveMemoView
                      title={queryTitle}
                      markdown={assistantFullText}
                      onOpenFullDossier={() =>
                        setViewModeMap((prev) => ({ ...prev, [message.id]: "dossier" }))
                      }
                    />
                  ) : message.role === "assistant" && currentViewMode === "analytics" && assistantFullText.trim().length > 80 ? (
                    <DossierVisualizer markdown={assistantFullText} title={queryTitle} />
                  ) : (
                    <>
                      {message.role === "assistant" && assistantFullText.trim().length > 150 ? (
                        <DossierVisualizer markdown={assistantFullText} title={queryTitle} />
                      ) : null}

                      {message.parts.map((part, index) => {
                        const key = `${message.id}-${index}`;

                        if (part.type === "text") {
                          return <MessageResponse key={key}>{part.text}</MessageResponse>;
                        }

                        if (part.type === "reasoning" && part.text.trim()) {
                          return (
                            <details key={key} className="mb-3 text-xs text-muted-foreground">
                              <summary className="cursor-pointer select-none font-medium">Strategic Planning & Reasoning</summary>
                              <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                            </details>
                          );
                        }

                        if (part.type === "tool-financial_calculator") {
                          return (
                            <Tool defaultOpen={true} key={key}>
                              <ToolHeader
                                type={part.type}
                                state={part.state}
                                title="Deterministic Financial & Economic Model"
                                className="[&_svg:first-child]:hidden"
                              />
                              <ToolContent>
                                <ToolInput input={part.input} />
                                <ToolOutput
                                  errorText={part.errorText}
                                  output={
                                    part.state === "output-available" ? (
                                      <FinancialCalcResult output={part.output as never} />
                                    ) : undefined
                                  }
                                />
                              </ToolContent>
                            </Tool>
                          );
                        }

                        if (part.type === "tool-web_search" || part.type === "tool-read_page") {
                          const isSearch = part.type === "tool-web_search";
                          const label = isSearch
                            ? `Searching empirical sources${
                                (part.input as { query?: string } | undefined)?.query
                                  ? `: ${(part.input as { query?: string }).query}`
                                  : ""
                              }`
                            : "Extracting primary document";
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
                    </>
                  )}

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

                    return (
                      <div className="mt-6 space-y-4 border-t border-border/60 pt-5">
                        {/* Executive Strategic Decision Lenses */}
                        <div className="space-y-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Sparkles className="size-3.5 text-accent" /> Autonomous Decision Deep Dives
                          </span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <button
                              type="button"
                              onClick={() =>
                                submit(
                                  `Conduct a ruthless red-team stress test on this verdict. Identify the specific hidden assumptions, black swans, and edge cases that could cause this strategy to fail.`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2 text-left text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="size-3.5 shrink-0 text-rose-500" />
                              <span>Red Team Stress Test</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                submit(
                                  `Provide a granular unit economics, CAC payback, and sensitivity analysis model for this market opportunity.`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            >
                              <TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
                              <span>Unit Economics Model</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                submit(
                                  `Analyze the jurisdictional compliance barriers, antitrust liabilities, and intellectual property defensibility for this initiative.`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 text-left text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            >
                              <Scale className="size-3.5 shrink-0 text-blue-500" />
                              <span>Regulatory & IP Audit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                submit(
                                  `Synthesize cross-source consensus and empirical data conflicts across institutions, and define the quantitative go/no-go decision thresholds.`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="size-3.5 shrink-0 text-purple-500" />
                              <span>Decision Framework & Synthesis</span>
                            </button>
                          </div>
                        </div>

                        {/* Related Inquiries */}
                        {related.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Related Strategic Questions
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  submit(
                                    "Please continue directly from where you left off and expand any remaining sections of the strategic dossier with further quantitative depth."
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary cursor-pointer"
                              >
                                <Play className="size-2.5 fill-current" /> Continue Dossier
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {related.map((question, qIdx) => (
                                <button
                                  key={qIdx}
                                  type="button"
                                  onClick={() => submit(question)}
                                  className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/70 p-3 text-left transition-all duration-200 hover:border-accent hover:bg-accent/5 hover:shadow-xs cursor-pointer"
                                >
                                  <span className="text-xs font-medium text-foreground line-clamp-3 group-hover:text-accent">
                                    {question}
                                  </span>
                                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-accent">
                                    Analyze this <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })() : null}
                </MessageContent>
              </Message>
            );
          })}

          {status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-accent animate-spin" />
              <Shimmer>Decomposing strategic vectors & planning autonomous investigation…</Shimmer>
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

      {/* Prompt Input Box */}
      <div className="border-t border-border bg-card/60 px-4 py-3 backdrop-blur-md">
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
              placeholder="Ask an open-ended strategic inquiry, market thesis, or technology dilemma…"
            />
            <PromptInputFooter className="justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Autonomous Enterprise Intelligence
                </span>
                <ApiKeyModal
                  trigger={
                    <button
                      type="button"
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer"
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

      {/* Slide-out Evidence & Grounding Drawer */}
      <EvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        sources={allSources}
        activeCitation={activeCitation}
      />
    </div>
  );
}
