import { useState, useMemo } from "react";
import {
  ExternalLink,
  ShieldCheck,
  Building2,
  GraduationCap,
  Newspaper,
  Globe,
  Search,
  Filter,
  X,
  FileText,
  Copy,
  Check,
  Calendar,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface VerifiedSource {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
  tier?: "tier1" | "tier2" | "tier3" | "tier4";
  tierLabel?: string;
  angle?: string;
  authorityScore?: number;
  sourceType?: string;
  estimatedYear?: string;
  verificationStatus?: "verified" | "caution" | "unverified";
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sources: VerifiedSource[];
  activeCitation?: number | null;
}

export function EvidenceDrawer({
  isOpen,
  onClose,
  sources,
  activeCitation,
}: EvidenceDrawerProps) {
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const filteredSources = useMemo(() => {
    return sources.filter((src) => {
      const matchesTier = selectedTier === "all" || src.tier === selectedTier;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        src.title.toLowerCase().includes(q) ||
        src.snippet.toLowerCase().includes(q) ||
        (src.domain && src.domain.toLowerCase().includes(q));
      return matchesTier && matchesQuery;
    });
  }, [sources, selectedTier, searchQuery]);

  const tierCounts = useMemo(() => {
    const counts = { all: sources.length, tier1: 0, tier2: 0, tier3: 0, tier4: 0 };
    sources.forEach((s) => {
      if (s.tier && s.tier in counts) {
        counts[s.tier as keyof typeof counts]++;
      } else {
        counts.tier4++;
      }
    });
    return counts;
  }, [sources]);

  const copyCitation = (src: VerifiedSource, index: number) => {
    const text = `[${index + 1}] "${src.title}", ${src.domain || src.url} - ${src.url}`;
    navigator.clipboard.writeText(text);
    setCopiedUrl(src.url);
    toast.success("Citation copied", { description: text });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Grounding and Evidence Drawer"
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl duration-300 animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Grounding & Evidence Drawer</h2>
              <p className="text-xs text-muted-foreground">
                {sources.length} verified empirical sources backing this dossier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="space-y-3 border-b border-border/60 p-4 bg-card/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search evidence by keyword, topic, or domain…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/80 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Tier Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTier("all")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedTier === "all"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              All Sources ({tierCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("tier1")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedTier === "tier1"
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              )}
            >
              <GraduationCap className="size-3" />
              Tier 1: Regulatory / Academic ({tierCounts.tier1})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("tier2")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedTier === "tier2"
                  ? "bg-blue-600 text-white"
                  : "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
              )}
            >
              <Building2 className="size-3" />
              Tier 2: Institutional Market Analyst ({tierCounts.tier2})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("tier3")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedTier === "tier3"
                  ? "bg-purple-600 text-white"
                  : "border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
              )}
            >
              <Newspaper className="size-3" />
              Tier 3: Tech Press ({tierCounts.tier3})
            </button>
          </div>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSources.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No evidence matching your filter.
            </div>
          ) : (
            filteredSources.map((source, index) => {
              const isHighlighted = activeCitation === index + 1;
              const isTier1 = source.tier === "tier1";
              const isTier2 = source.tier === "tier2";

              return (
                <div
                  key={`${source.url}-${index}`}
                  className={cn(
                    "group relative rounded-xl border p-4 transition-all duration-200",
                    isHighlighted
                      ? "border-accent ring-2 ring-accent/30 bg-accent/5"
                      : "border-border/80 bg-card hover:border-border hover:shadow-xs"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-bold text-foreground">
                        [{index + 1}]
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          isTier1
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : isTier2
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        {source.tierLabel || "Verified Source"}
                      </span>
                      {source.angle ? (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          • {source.angle}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => copyCitation(source, index)}
                        title="Copy formal citation"
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        {copiedUrl === source.url ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open primary document"
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-semibold text-foreground leading-snug line-clamp-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {source.title}
                    </a>
                  </h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Globe className="size-3" />
                      <span>{source.domain || source.url}</span>
                    </div>

                    {source.estimatedYear ? (
                      <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        <Calendar className="size-2.5" />
                        {source.estimatedYear}
                      </span>
                    ) : null}

                    {source.authorityScore ? (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        <Award className="size-2.5 text-accent" />
                        Authority: {source.authorityScore}/100
                      </span>
                    ) : null}

                    {source.sourceType ? (
                      <span className="text-[10px] text-muted-foreground/80 truncate max-w-[200px]">
                        • {source.sourceType}
                      </span>
                    ) : null}
                  </div>

                  {source.snippet ? (
                    <blockquote className="mt-2.5 rounded-lg border-l-2 border-primary/40 bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed italic">
                      “{source.snippet}”
                    </blockquote>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 px-4 py-3 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>Grounding verified across SEC, ArXiv & institutional indices</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-secondary px-3 py-1 font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
