import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// 1. Conflict Resolution Module Card
// ============================================================================
export interface ConflictResolutionData {
  status?: string;
  metricOrTopic: string;
  winningSource: "Source A" | "Source B" | "Weighted Synthesis";
  confidenceScore: number;
  metadataComparison: {
    sourceA: { name: string; year: number | string; authorityScore: number; claim: string };
    sourceB: { name: string; year: number | string; authorityScore: number; claim: string };
    authorityDelta: string;
    recencyDelta: string;
  };
  adjudicationRationale: string;
  adjudicatedMetric: string;
  suggestedReportCallout?: string;
}

export function ConflictResolutionCard({ output }: { output: ConflictResolutionData }) {
  if (!output || !output.metricOrTopic) return null;

  const { metricOrTopic, winningSource, confidenceScore, metadataComparison, adjudicationRationale, adjudicatedMetric } = output;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-500">
            <Scale className="size-3.5" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
              Conflict Resolution Adjudication
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {confidenceScore}% Analyst Confidence
              </span>
            </h4>
            <p className="text-muted-foreground text-[11px]">
              Target Discrepancy: <span className="font-medium text-foreground">{metricOrTopic}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Source A */}
        <div className={cn(
          "rounded-lg border p-3 space-y-1.5 transition-all",
          winningSource === "Source A"
            ? "border-emerald-500/40 bg-emerald-500/10 shadow-xs"
            : "border-border/60 bg-card/60"
        )}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
              Source A: {metadataComparison.sourceA.name}
              {winningSource === "Source A" && (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold">PREFERENCE</span>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="size-2.5" /> {metadataComparison.sourceA.year}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Authority Score: <strong className="text-foreground">{metadataComparison.sourceA.authorityScore}/100</strong>
          </div>
          <p className="text-[11px] font-mono text-foreground bg-muted/40 p-1.5 rounded border border-border/40">
            &ldquo;{metadataComparison.sourceA.claim}&rdquo;
          </p>
        </div>

        {/* Source B */}
        <div className={cn(
          "rounded-lg border p-3 space-y-1.5 transition-all",
          winningSource === "Source B"
            ? "border-emerald-500/40 bg-emerald-500/10 shadow-xs"
            : "border-border/60 bg-card/60"
        )}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
              Source B: {metadataComparison.sourceB.name}
              {winningSource === "Source B" && (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold">PREFERENCE</span>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="size-2.5" /> {metadataComparison.sourceB.year}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Authority Score: <strong className="text-foreground">{metadataComparison.sourceB.authorityScore}/100</strong>
          </div>
          <p className="text-[11px] font-mono text-foreground bg-muted/40 p-1.5 rounded border border-border/40">
            &ldquo;{metadataComparison.sourceB.claim}&rdquo;
          </p>
        </div>
      </div>

      {/* Analytical Metadata Delta */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
        <span className="rounded bg-muted px-2 py-0.5">
          Authority Delta: <strong className="text-foreground">{metadataComparison.authorityDelta}</strong>
        </span>
        <span className="rounded bg-muted px-2 py-0.5">
          Recency Delta: <strong className="text-foreground">{metadataComparison.recencyDelta}</strong>
        </span>
      </div>

      {/* Rationale and Adjudicated Metric */}
      <div className="rounded-lg bg-background/80 p-3 border border-border/60 space-y-1.5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-medium">Adjudication Rationale:</strong> {adjudicationRationale}
        </p>
        <div className="pt-1 border-t border-border/40 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground">Final Adjudicated Benchmark:</span>
          <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
            {adjudicatedMetric}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. Strict Editorial Post-Verification Card
// ============================================================================
export interface VerificationAuditData {
  status?: string;
  groundingFidelityScore: string;
  claimsAudited: number;
  claimsPassed: number;
  claimsFailed: number;
  editorialDirective: string;
  auditResults: Array<{
    claimId: string;
    claimText: string;
    citedUrl: string;
    supported: boolean;
    editorialDirective: "KEEP" | "DROP_OR_REWRITE";
    auditNote: string;
  }>;
}

export function EditorialVerificationCard({ output }: { output: VerificationAuditData }) {
  if (!output || !output.auditResults) return null;

  const { groundingFidelityScore, claimsAudited, claimsPassed, claimsFailed, editorialDirective, auditResults } = output;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-500">
            <ShieldCheck className="size-3.5" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
              Strict Editorial Post-Verification Pass
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {groundingFidelityScore} Grounding Fidelity
              </span>
            </h4>
            <p className="text-muted-foreground text-[11px]">
              {claimsPassed} of {claimsAudited} key empirical claims verified True against cited sources ({claimsFailed} dropped/flagged)
            </p>
          </div>
        </div>
      </div>

      {/* Claims Breakdown */}
      <div className="space-y-2">
        {auditResults.map((item, idx) => (
          <div
            key={`${item.claimId}-${idx}`}
            className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/60 p-2.5 text-[11px]"
          >
            {item.supported ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <XCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-muted-foreground">{item.claimId}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                  item.supported
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                )}>
                  {item.editorialDirective}
                </span>
              </div>
              <p className="text-foreground font-medium">{item.claimText}</p>
              <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                <span className="truncate max-w-[320px]">{item.auditNote}</span>
                {item.citedUrl ? (
                  <a
                    href={item.citedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline shrink-0"
                  >
                    <span>Source</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editorial Directive */}
      <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Editorial Verdict:</span>
        <strong className="text-foreground font-medium">{editorialDirective}</strong>
      </div>
    </div>
  );
}

// ============================================================================
// 3. System State & Verification Checklist Card
// ============================================================================
export function SystemStateChecklistCard({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- [") || l.startsWith("* ["));

  if (lines.length === 0) return null;

  return (
    <div className="my-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 font-sans">
      <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
        <CheckCircle2 className="size-4 text-primary" />
        <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase">
          Verified System State & Inquiry Ledger
        </h4>
        <span className="ml-auto text-[10px] rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          Mandatory Pre-Generation Check
        </span>
      </div>

      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {lines.map((line, idx) => {
          const isChecked = line.includes("[x]") || line.includes("[X]");
          const cleanText = line.replace(/^[-*]\s*\[[xX ]\]\s*/, "");
          const colonIdx = cleanText.indexOf(":");
          const title = colonIdx > -1 ? cleanText.slice(0, colonIdx) : cleanText;
          const desc = colonIdx > -1 ? cleanText.slice(colonIdx + 1) : "";

          return (
            <li key={idx} className="flex items-start gap-2">
              <span className={cn(
                "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
              )}>
                {isChecked && <CheckCircle2 className="size-3" />}
              </span>
              <span className="leading-tight">
                <strong className="text-foreground font-medium">{title}</strong>
                {desc ? <span className="text-muted-foreground">:{desc}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
