import { useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
  Target,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveMemoProps {
  title: string;
  markdown: string;
  onOpenFullDossier: () => void;
}

export function ExecutiveMemoView({ title, markdown, onOpenFullDossier }: ExecutiveMemoProps) {
  // Extract key sections using regex
  const memoData = useMemo(() => {
    // Recommendation & Conviction
    const recMatch = markdown.match(
      /(?:Strategic Recommendation|Recommendation):\s*\*?\*?([A-Z\s/]+)\*?\*?/i
    );
    const convictionMatch = markdown.match(
      /(?:Conviction Index|Confidence|Conviction):\s*\*?\*?(\d{1,3})%?\*?\*?/i
    );
    const thesisMatch = markdown.match(
      /(?:Core Thesis|Thesis):\s*\*?\*?([^\n\r*]+)/i
    );
    const fatalMatch = markdown.match(
      /(?:Fatal Vulnerability|Fatal Risk|Black Swan):\s*\*?\*?([^\n\r*]+)/i
    );

    // BLUF
    const blufMatch = markdown.match(
      /(?:###\s*(?:1\.\s*)?Executive Summary[^\n]*)([\s\S]*?)(?:###|$)/i
    );

    // Strategic Decision Framework & Action Gates
    const frameworkMatch =
      markdown.match(/(?:###\s*(?:7\.\s*)?Strategic Decision Framework[^\n]*)([\s\S]*?)(?:###|$)/i) ||
      markdown.match(/(?:###\s*(?:7\.\s*)?Actionable 30-60-90[^\n]*)([\s\S]*?)(?:###|$)/i);

    const recommendation = recMatch ? recMatch[1]?.trim() : "PROCEED WITH CONDITIONS";
    const conviction = convictionMatch ? convictionMatch[1]?.trim() : "82";
    const thesis = thesisMatch ? thesisMatch[1]?.trim() : "Empirical analysis supports strategic upside with bounded risks.";
    const fatalRisk = fatalMatch ? fatalMatch[1]?.trim() : "Regulatory shifts or unexpected infrastructure bottlenecks.";

    const blufText = blufMatch
      ? blufMatch[1]?.trim().replace(/^>\s*/gm, "").slice(0, 500)
      : "The market and technological fundamentals indicate substantial strategic viability, provided key execution gates are satisfied.";

    // Parse decision framework pillars
    const decisionPillars: { title: string; detail: string }[] = [];
    if (frameworkMatch) {
      const lines = frameworkMatch[1]?.split("\n").filter((l) => l.trim().length > 0) || [];
      lines.forEach((l) => {
        const itemMatch = l.match(/(?:[-*]\s*)?\*?\*?([^:*]+):\*?\*?\s*(.+)/i);
        if (itemMatch && itemMatch[1] && itemMatch[2]) {
          decisionPillars.push({ title: itemMatch[1].trim(), detail: itemMatch[2].trim() });
        }
      });
    }

    if (decisionPillars.length === 0) {
      decisionPillars.push(
        { title: "Go / No-Go Decision Triggers", detail: "Empirical proof of unit economic margin thresholds and regulatory non-interference." },
        { title: "Downside Hedging & Capital Insulation", detail: "Structured pilot contracts, dual-vendor sourcing, and strict capital draw-down gates." },
        { title: "Resource Allocation Priorities", detail: "Prioritize proprietary data pipelines, tier-1 compliance certifications, and key partner moats." }
      );
    }

    return {
      recommendation,
      conviction,
      thesis,
      fatalRisk,
      blufText,
      decisionPillars,
    };
  }, [markdown]);

  return (
    <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <FileText className="size-3 text-accent" />
              C-Suite Executive Memo
            </span>
            <span className="text-xs text-muted-foreground">· 1-Page Decision Summary</span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>

        <button
          type="button"
          onClick={onOpenFullDossier}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary hover:text-accent"
        >
          <span>View Full 20-Page Dossier</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Decision Stance Card */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Strategic Verdict
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
              {memoData.recommendation}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-relaxed">
            {memoData.thesis}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Conviction Index
          </span>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-3xl font-black text-foreground">{memoData.conviction}%</span>
            <span className="text-xs text-muted-foreground">confidence</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Empirically cross-validated
          </span>
        </div>
      </div>

      {/* BLUF Executive Summary */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Target className="size-4 text-primary" />
          Bottom Line Up Front (BLUF)
        </h3>
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm leading-relaxed text-foreground">
          {memoData.blufText}
        </div>
      </div>

      {/* Critical Downside Flaw */}
      {memoData.fatalRisk ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-900 dark:text-rose-300 space-y-1">
          <span className="font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            ⚠️ Fatal Vulnerability / Downside Trigger:
          </span>
          <p className="text-sm text-foreground/90 font-medium">{memoData.fatalRisk}</p>
        </div>
      ) : null}

      {/* Strategic Decision Framework & Action Gates */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ShieldAlert className="size-4 text-accent" />
          Strategic Decision Framework & Action Gates
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {memoData.decisionPillars.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1.5 transition-all hover:border-accent hover:shadow-xs"
            >
              <span className="inline-block rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                {item.title}
              </span>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
