import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  Compass,
  FileSpreadsheet,
  Layers,
  FileText,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportToolbarProps {
  title: string;
  markdownContent: string;
  sourcesCount?: number;
  isStreaming?: boolean;
  viewMode?: "dossier" | "memo" | "analytics";
  onViewModeChange?: (mode: "dossier" | "memo" | "analytics") => void;
  onOpenEvidence?: () => void;
}

const SECTIONS = [
  { label: "Verdict", search: "Executive Verdict" },
  { label: "BLUF Summary", search: "Executive Summary" },
  { label: "Benchmarks", search: "Quantitative" },
  { label: "Timeline", search: "Chronological" },
  { label: "Feasibility", search: "Technical Feasibility" },
  { label: "Regulatory", search: "Regulatory" },
  { label: "Bull vs Bear", search: "Bull Case" },
  { label: "Decision Framework", search: "Decision Framework" },
  { label: "Sources", search: "Sources" },
];

function extractTablesToCSV(md: string = ""): string {
  const safeMd = typeof md === "string" ? md : "";
  const lines = safeMd.split("\n");
  const csvRows: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (trimmed.includes("---")) continue;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => `"${c.trim().replace(/"/g, '""')}"`);
      csvRows.push(cells.join(","));
      inTable = true;
    } else if (inTable) {
      csvRows.push("");
      inTable = false;
    }
  }

  return csvRows.join("\n");
}

export function ReportToolbar({
  title,
  markdownContent = "",
  sourcesCount = 0,
  isStreaming = false,
  viewMode = "dossier",
  onViewModeChange,
  onOpenEvidence,
}: ReportToolbarProps) {
  const [copied, setCopied] = useState(false);
  const safeContent = typeof markdownContent === "string" ? markdownContent : "";

  // Word count and reading time
  const words = safeContent.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(words / 220));

  const handleCopy = useCallback(() => {
    if (!safeContent) return;
    navigator.clipboard
      .writeText(safeContent)
      .then(() => {
        setCopied(true);
        toast.success("Dossier copied to clipboard", {
          description: "Full formatted Markdown ready to paste into Notion, Docs, or Slack.",
        });
        setTimeout(() => setCopied(false), 2200);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  }, [markdownContent]);

  const handleExportMarkdown = useCallback(() => {
    if (!safeContent) return;
    const sanitizedTitle = (title || "Research_Dossier")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);

    const header = `---
title: "${(title || "Research Dossier").replace(/"/g, '\\"')}"
date: "${new Date().toISOString()}"
author: "Researchify AI Autonomous Intelligence Core"
sources_consulted: ${sourcesCount}
word_count: ${words}
classification: "Boardroom Strategic Dossier"
---

`;

    const blob = new Blob([header + safeContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizedTitle}_Strategic_Dossier.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Markdown dossier downloaded", {
      description: `${sanitizedTitle}_Strategic_Dossier.md saved to your device.`,
    });
  }, [safeContent, title, sourcesCount, words]);

  const handleExportCSV = useCallback(() => {
    if (!safeContent) return;
    const csvData = extractTablesToCSV(safeContent);
    if (!csvData || csvData.trim().length === 0) {
      toast.info("No data tables found in this section to export as CSV.");
      return;
    }

    const sanitizedTitle = (title || "Research_Data")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizedTitle}_Financial_Benchmarks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Financial & market CSV downloaded", {
      description: "Ready for Excel, Google Sheets, or financial models.",
    });
  }, [safeContent, title]);

  const handlePrint = useCallback(() => {
    const sanitizedTitle = (title || "Executive Strategic Dossier")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .slice(0, 60);

    const htmlBody = safeContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br/>");

    const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${sanitizedTitle} — Researchify AI Executive Dossier</title>
  <style>
    @page { size: letter; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 0;
    }
    .cover-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12pt;
      margin-bottom: 18pt;
    }
    .badge {
      display: inline-block;
      background: #f1f5f9;
      color: #0f766e;
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      padding: 3pt 8pt;
      border-radius: 4pt;
      letter-spacing: 0.5px;
      margin-bottom: 8pt;
    }
    h1 { font-size: 19pt; font-weight: 800; color: #0f172a; margin: 0 0 6pt; }
    h2 { font-size: 13pt; font-weight: 700; color: #1e293b; margin: 16pt 0 6pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; }
    h3 { font-size: 11.5pt; font-weight: 700; color: #334155; margin: 12pt 0 4pt; }
    p { margin: 0 0 8pt; }
    ul { margin: 4pt 0 8pt 18pt; padding: 0; }
    li { margin: 2pt 0; }
    strong { color: #020617; }
    blockquote {
      border-left: 4px solid #0f766e;
      background: #f8fafc;
      padding: 10pt 14pt;
      margin: 10pt 0;
      border-radius: 4pt;
      font-size: 10pt;
    }
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: left; font-size: 9.5pt; }
    th { background: #f8fafc; font-weight: 700; color: #0f172a; }
    .meta-line { font-size: 9pt; color: #64748b; margin-bottom: 6pt; }
    .footer { margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #cbd5e1; font-size: 8.5pt; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="cover-header">
    <div class="badge">Verified Autonomous Strategic Intelligence</div>
    <h1>${sanitizedTitle}</h1>
    <div class="meta-line">
      Generated by Researchify AI Core · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · ${words.toLocaleString()} words · ${sourcesCount} primary sources verified
    </div>
  </div>
  <div class="content"><p>${htmlBody}</p></div>
  <div class="footer">
    Researchify AI — Autonomous Strategic Intelligence Dossier · Strictly Confidential
  </div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }

    toast.success("Boardroom PDF ready", {
      description: 'Select "Save as PDF" for an executive presentation document.',
    });
  }, [markdownContent, title, sourcesCount, words]);

  const scrollToSection = useCallback((search: string) => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, blockquote, strong"));
    const match = headings.find((el) =>
      el.textContent?.toLowerCase().includes(search.toLowerCase()),
    );
    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="no-print mb-6 rounded-2xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-md shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Dossier Meta Badge & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle Buttons */}
          {onViewModeChange ? (
            <div className="inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange("dossier")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                  viewMode === "dossier"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText className="size-3" />
                <span>Full Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("memo")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                  viewMode === "memo"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="size-3" />
                <span>Executive Memo (1-Page)</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("analytics")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                  viewMode === "analytics"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart3 className="size-3" />
                <span>Visual Analytics</span>
              </button>
            </div>
          ) : null}

          {/* Evidence Drawer Button */}
          {onOpenEvidence ? (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Evidence Drawer ({sourcesCount})</span>
            </button>
          ) : null}

          <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground">
            {words.toLocaleString()} words
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{readTime} min read</span>

          {isStreaming ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent animate-pulse font-medium">
              • Live Synthesizing…
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy full markdown dossier"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Export extracted financial & benchmark tables to CSV"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-500" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            title="Export as Markdown (.md) file"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>MD</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as Executive PDF"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:border-accent hover:text-accent hover:shadow-xs cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Jump Navigation Outline */}
      {viewMode === "dossier" ? (
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
                className="rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap transition-colors hover:border-accent hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
