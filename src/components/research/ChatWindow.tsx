import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Globe, FileText, Play, ArrowRight, Sparkles, ShieldAlert } from "lucide-react";
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
import agentMark from "@/assets/agent-mark.png";
import { saveThreadMessages } from "@/lib/threads";

const STARTERS = [
  "How are European grid operators handling battery storage in 2026?",
  "Compare the evidence on four-day work weeks in the last three years",
  "What is the current state of solid-state battery commercialisation?",
];

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
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
                <h1 className="text-4xl">Ask a hard question.</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Researchify AI splits it into research tasks, reads multiple live sources, compares what they
                  say, and writes a report you can check line by line.
                </p>
              </div>
              <div className="flex w-full max-w-lg flex-col gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => submit(starter)}
                    className="rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-accent hover:bg-secondary"
                  >
                    {starter}
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

                {message.role === "assistant" && !busy && messageIndex === messages.length - 1 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                    <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="size-3 text-accent" /> Continue Research:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        submit(
                          "Please continue directly from where you left off and complete the remaining sections of the research dossier in full detail."
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground shadow-xs"
                    >
                      <Play className="size-3 fill-current" />
                      Continue & Complete Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        submit(
                          "Expand and deepen the adversarial Red Team counter-arguments with more contradictory evidence."
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <ShieldAlert className="size-3" />
                      Deepen Red Team Critique
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        submit(
                          "Decompose the next critical sub-question and search for fresh primary sources."
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <ArrowRight className="size-3" />
                      Explore Next Sub-Question
                    </button>
                  </div>
                ) : null}
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
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                Every claim gets a numbered source
              </span>
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
