import { useState, useCallback } from "react";
import { Copy, Check, Download, Printer, Share2, Sparkles, FileText, Compass, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ReportToolbarProps {
  title: string;
  markdownContent: string;
  sourcesCount?: number;
  isStreaming?: boolean;
}

const SECTIONS = [
  { label: "Verdict", search: "Executive Verdict" },
  { label: "Synthesis", search: "Core Synthesis" },
  { label: "Timeline", search: "Timeline" },
  { label: "Verdict Analysis", search: "Verdict Analysis" },
  { label: "Findings", search: "Findings" },
  { label: "Disagreements", search: "Disagree" },
  { label: "Sources", search: "Sources" },
  { label: "Decision Framework", search: "Decision Framework" },
];

export function ReportToolbar({
  title,
  markdownContent,
  sourcesCount = 0,
  isStreaming = false,
}: ReportToolbarProps) {
  const [copied, setCopied] = useState(false);

  // Compute word count and reading time
  const words = markdownContent.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(words / 220));

  const handleCopy = useCallback(() => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent).then(() => {
      setCopied(true);
      toast.success("Dossier copied to clipboard", {
        description: "Full formatted Markdown ready to paste into docs, notes, or messages.",
      });
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  }, [markdownContent]);

  const handleExportMarkdown = useCallback(() => {
    if (!markdownContent) return;
    const sanitizedTitle = (title || "Research_Dossier")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);

    const header = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${new Date().toISOString()}"
author: "Researchify AI Autonomous Intelligence Core"
sources_consulted: ${sourcesCount}
word_count: ${words}
---

`;

    const blob = new Blob([header + markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizedTitle}_Research_Dossier.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Markdown file downloaded", {
      description: `${sanitizedTitle}_Research_Dossier.md saved to your device.`,
    });
  }, [markdownContent, title, sourcesCount, words]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Research link copied", {
        description: "Direct URL copied to clipboard.",
      });
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  }, []);

  const scrollToSection = useCallback((search: string) => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, blockquote, strong"));
    const match = headings.find((el) =>
      el.textContent?.toLowerCase().includes(search.toLowerCase())
    );
    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="no-print mb-6 rounded-2xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-md shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Dossier Meta Badge */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
            <Sparkles className="size-3 text-accent" />
            Verified Intelligence Dossier
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="font-medium text-foreground">{words.toLocaleString()} words</span>
          <span className="text-border">•</span>
          <span>{readTime} min read</span>
          {sourcesCount > 0 ? (
            <>
              <span className="text-border">•</span>
              <span className="font-medium text-foreground">{sourcesCount} primary sources</span>
            </>
          ) : null}
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 text-accent animate-pulse font-medium">
              • Live Synthesizing…
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy full markdown report"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            title="Export as Markdown (.md) file"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs"
          >
            <Download className="size-3.5" />
            <span>Export .MD</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs"
          >
            <Printer className="size-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Copy link to research session"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Jump Navigation Outline */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-border/40 pt-2.5 scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
          <Compass className="size-3 text-accent" /> Outline:
        </span>
        <div className="flex items-center gap-1.5">
          {SECTIONS.map((sec) => (
            <button
              key={sec.label}
              type="button"
              onClick={() => scrollToSection(sec.search)}
              className="rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap transition-colors hover:border-accent hover:text-foreground hover:bg-secondary"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
