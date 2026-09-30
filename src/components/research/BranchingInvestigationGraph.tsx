import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  ExternalLink,
  Sparkles,
  GitBranch,
  Layers,
  ChevronDown,
  CheckCircle2,
  Search,
  Radio,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { cn } from "@/lib/utils";

export type BranchSource = {
  title?: string | undefined;
  url?: string | undefined;
  snippet?: string | undefined;
};

export type BranchSearch = {
  query?: string | undefined;
  purpose?: string | undefined;
  results?: BranchSource[] | undefined;
};

interface BranchPath {
  id: string;
  d: string;
  endX: number;
  endY: number;
}

export function BranchingInvestigationGraph({
  question,
  searches = [],
  isLive = false,
}: {
  question: string;
  searches: BranchSearch[];
  isLive?: boolean;
}) {
  const [activeBranchIndex, setActiveBranchIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedSnippet, setSelectedSnippet] = useState<{ title: string; url: string; snippet: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const branchRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<BranchPath[]>([]);

  // Format intelligent branch titles
  const branches = useMemo(() => {
    return searches.map((s, idx) => {
      let title = `Angle #${idx + 1}`;
      if (s.purpose && !s.purpose.toLowerCase().includes("general research") && s.purpose.trim().length > 5) {
        title = s.purpose;
      } else if (s.query && s.query.trim().length > 0) {
        const cleaned = s.query.replace(/^(search for|find|lookup|status of|current status of)\s+/i, "");
        title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      return {
        id: `branch-${idx}`,
        title,
        query: s.query || "",
        sources: s.results || [],
      };
    });
  }, [searches]);

  const totalSources = useMemo(() => {
    return branches.reduce((acc, b) => acc + b.sources.length, 0);
  }, [branches]);

  // Recalculate SVG curves from core to branch cards
  const updatePaths = () => {
    if (!containerRef.current || !coreRef.current || branches.length === 0) {
      setPaths([]);
      return;
    }
    const cRect = containerRef.current.getBoundingClientRect();
    const coreRect = coreRef.current.getBoundingClientRect();

    const startX = coreRect.left + coreRect.width / 2 - cRect.left;
    const startY = coreRect.bottom - cRect.top;

    const newPaths: BranchPath[] = [];

    branches.forEach((b, idx) => {
      const card = branchRefs.current[idx];
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const endX = cardRect.left + cardRect.width / 2 - cRect.left;
      const endY = cardRect.top - cRect.top;

      const deltaY = endY - startY;
      const cp1Y = startY + deltaY * 0.45;
      const cp2Y = startY + deltaY * 0.55;

      const d = `M ${startX} ${startY} C ${startX} ${cp1Y}, ${endX} ${cp2Y}, ${endX} ${endY}`;
      newPaths.push({ id: b.id, d, endX, endY });
    });

    setPaths(newPaths);
  };

  useLayoutEffect(() => {
    if (viewMode === "tree" && isExpanded) {
      updatePaths();
    }
  }, [branches, viewMode, isExpanded]);

  useEffect(() => {
    const handleResize = () => {
      if (viewMode === "tree" && isExpanded) {
        updatePaths();
      }
    };
    window.addEventListener("resize", handleResize);

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    // Secondary timer to catch late layout reflows
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [branches.length, viewMode, isExpanded]);

  if (branches.length === 0) return null;

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-lg transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
            <GitBranch className="size-4 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Autonomous Knowledge Tree
              </span>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent ring-1 ring-accent/30">
                  <Radio className="size-3 animate-spin" />
                  Live Decomposition
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  {branches.length} Investigation {branches.length === 1 ? "Branch" : "Branches"} • {totalSources} Sources Verified
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dynamic multi-branch evidence topology radiating from central hypothesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border/60 bg-background/60 p-0.5 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200",
                viewMode === "tree"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GitBranch className="size-3.5" />
              Neural Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200",
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" />
              Evidence Matrix
            </button>
          </div>

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
            title={isExpanded ? "Collapse tree" : "Expand tree"}
          >
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", !isExpanded && "-rotate-90")}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative p-5 sm:p-6"
          >
            {viewMode === "tree" ? (
              <div ref={containerRef} className="relative flex flex-col items-center">
                {/* SVG Branch Connections */}
                <svg
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
                  style={{ minHeight: "100%" }}
                >
                  <defs>
                    <linearGradient id="branchGlowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.9" />
                    </linearGradient>
                    <filter id="branchNeonFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {paths.map((p, idx) => {
                    const isActive = activeBranchIndex === idx;
                    return (
                      <g key={p.id}>
                        {/* Shadow path */}
                        <path
                          d={p.d}
                          fill="none"
                          stroke="currentColor"
                          className="text-border/60"
                          strokeWidth="2"
                        />
                        {/* Animated energy pulse along branch */}
                        <path
                          d={p.d}
                          fill="none"
                          stroke="url(#branchGlowGradient)"
                          strokeWidth={isActive ? "3.5" : "2"}
                          strokeDasharray="6 6"
                          filter={isActive ? "url(#branchNeonFilter)" : undefined}
                          className={cn(
                            "transition-all duration-300",
                            isActive ? "opacity-100" : "opacity-60"
                          )}
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="24"
                            to="0"
                            dur={isLive ? "1.2s" : "3s"}
                            repeatCount="indefinite"
                          />
                        </path>

                        {/* Node reception terminal dot */}
                        <circle
                          cx={p.endX}
                          cy={p.endY}
                          r={isActive ? "4" : "3"}
                          fill="hsl(var(--accent))"
                          className="transition-all duration-200"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* 1. Core Inquiry Center Node */}
                <motion.div
                  ref={coreRef}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 flex max-w-xl items-center gap-3 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 via-background to-accent/15 px-5 py-3 text-center shadow-md backdrop-blur-md"
                >
                  <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Sparkles className="size-4 animate-spin-slow" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                      Central Research Objective
                    </span>
                    <span className="line-clamp-2 text-xs sm:text-sm font-semibold text-foreground leading-snug">
                      {question}
                    </span>
                  </div>
                  {/* Subtle pulsing background aura */}
                  <div className="absolute -inset-1 -z-10 animate-pulse rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-md opacity-60" />
                </motion.div>

                {/* Vertical Spacing for Bezier Trunk Splitting */}
                <div className="h-12 w-full" />

                {/* 2. Decomposed Sub-Question Branches */}
                <div className="relative z-10 w-full">
                  <div
                    className={cn(
                      "grid gap-4",
                      branches.length === 1 && "max-w-xl mx-auto grid-cols-1",
                      branches.length === 2 && "max-w-3xl mx-auto grid-cols-1 md:grid-cols-2",
                      branches.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    )}
                  >
                    {branches.map((branch, index) => {
                      const isHovered = activeBranchIndex === index;
                      return (
                        <motion.div
                          key={branch.id}
                          ref={(el) => {
                            branchRefs.current[index] = el;
                          }}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08, duration: 0.3 }}
                          onMouseEnter={() => setActiveBranchIndex(index)}
                          onMouseLeave={() => setActiveBranchIndex(null)}
                          className={cn(
                            "group relative flex flex-col rounded-2xl border p-4 transition-all duration-300 backdrop-blur-md",
                            isHovered
                              ? "border-accent/90 bg-accent/10 shadow-xl -translate-y-1 ring-1 ring-accent/30"
                              : "border-border/80 bg-card/70 hover:border-border hover:shadow-md"
                          )}
                        >
                          {/* Branch Header */}
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary ring-1 ring-primary/20">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-2 text-xs font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                                {branch.title}
                              </h4>
                              {branch.query ? (
                                <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                  <Search className="size-3 shrink-0 text-accent" />
                                  <span className="truncate">"{branch.query}"</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {/* Branch Body: Discovered Leaf Sources */}
                          <div className="mt-3.5 border-t border-border/50 pt-2.5">
                            <div className="mb-2 flex items-center justify-between text-[10px]">
                              <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                                Verified Leaf Citations
                              </span>
                              <span className="font-mono text-muted-foreground">
                                {branch.sources.length} {branch.sources.length === 1 ? "source" : "sources"}
                              </span>
                            </div>

                            {branch.sources.length === 0 ? (
                              <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground/80 italic">
                                <Radio className="size-3 animate-pulse text-accent" />
                                Indexing web corpus…
                              </div>
                            ) : (
                              <ul className="space-y-1.5">
                                {branch.sources.slice(0, 4).map((src, sIdx) => {
                                  let hostname = "";
                                  try {
                                    if (src.url) hostname = new URL(src.url).hostname.replace(/^www\./, "");
                                  } catch {
                                    hostname = "web";
                                  }
                                  return (
                                    <li key={`${src.url}-${sIdx}`}>
                                      <div
                                        onClick={() => {
                                          if (src.snippet) {
                                            setSelectedSnippet({
                                              title: src.title || hostname,
                                              url: src.url || "#",
                                              snippet: src.snippet,
                                            });
                                          } else if (src.url) {
                                            window.open(src.url, "_blank", "noreferrer");
                                          }
                                        }}
                                        className="group/leaf flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs transition-all hover:border-accent hover:bg-secondary/70 hover:shadow-xs"
                                      >
                                        <div className="flex min-w-0 items-center gap-2">
                                          <span className="size-1.5 rounded-full bg-accent/80 shrink-0 group-hover/leaf:scale-125 transition-transform" />
                                          <span className="truncate font-medium text-foreground group-hover/leaf:text-accent">
                                            {src.title || hostname}
                                          </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <span className="font-mono text-[9px] text-muted-foreground">
                                            {hostname}
                                          </span>
                                          <a
                                            href={src.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-muted-foreground hover:text-foreground"
                                            title="Open link in new tab"
                                          >
                                            <ExternalLink className="size-3 text-muted-foreground opacity-60 transition-opacity group-hover/leaf:opacity-100" />
                                          </a>
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                                {branch.sources.length > 4 ? (
                                  <li className="pt-0.5 text-right font-mono text-[10px] text-muted-foreground">
                                    +{branch.sources.length - 4} additional verified citations
                                  </li>
                                ) : null}
                              </ul>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Evidence Matrix View */
              <div className="space-y-2.5">
                {branches.map((branch, idx) => (
                  <div
                    key={branch.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-3.5 sm:flex-row sm:items-center sm:justify-between transition-all hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary ring-1 ring-primary/20">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-foreground">{branch.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          Query: <span className="text-foreground/90">{branch.query}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {branch.sources.map((src, sIdx) => {
                        let hostname = "source";
                        try {
                          if (src.url) hostname = new URL(src.url).hostname.replace(/^www\./, "");
                        } catch {
                          hostname = "link";
                        }
                        return (
                          <a
                            key={`${src.url}-${sIdx}`}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2.5 py-1 text-xs text-foreground transition-all hover:border-accent hover:text-accent hover:shadow-xs"
                          >
                            <Globe className="size-3 text-muted-foreground" />
                            <span className="max-w-[140px] truncate font-medium">{hostname}</span>
                            <ExternalLink className="size-2.5 opacity-50" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Snippet Preview Modal */}
            <AnimatePresence>
              {selectedSnippet && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                  onClick={() => setSelectedSnippet(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-lg w-full rounded-2xl border border-border bg-card p-6 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <FileText className="size-4" />
                        Evidence Excerpt
                      </div>
                      <button
                        onClick={() => setSelectedSnippet(null)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                      >
                        ✕
                      </button>
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-foreground line-clamp-2">
                      {selectedSnippet.title}
                    </h3>

                    <div className="mt-3 rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed font-mono">
                      "{selectedSnippet.snippet}"
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedSnippet(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                      >
                        Close
                      </button>
                      <a
                        href={selectedSnippet.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Visit Original Source
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
