import { useState, useCallback } from "react";
import { Copy, Check, Download, Printer, Sparkles, Compass } from "lucide-react";
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
    // Build a full standalone HTML document for print-to-PDF
    // This bypasses the single-page clip issue by rendering in an isolated iframe
    const sanitizedTitle = (title || "Research Dossier")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .slice(0, 60);

    // Convert markdown-ish content to basic HTML for the print document
    const htmlBody = markdownContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${sanitizedTitle} — Researchify AI</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 18pt; margin: 0 0 8pt; border-bottom: 2px solid #334155; padding-bottom: 6pt; }
    h2 { font-size: 14pt; margin: 16pt 0 6pt; color: #1e293b; }
    h3 { font-size: 12pt; margin: 12pt 0 4pt; color: #334155; }
    p { margin: 0 0 8pt; }
    ul { margin: 4pt 0 8pt 16pt; padding: 0; }
    li { margin: 2pt 0; }
    strong { color: #0f172a; }
    blockquote {
      border-left: 4px solid #0f766e;
      background: #f8fafc;
      padding: 10pt 14pt;
      margin: 10pt 0;
      border-radius: 4pt;
    }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: left; font-size: 10pt; }
    th { background: #f1f5f9; font-weight: 600; }
    .header { text-align: center; margin-bottom: 16pt; padding-bottom: 10pt; border-bottom: 1px solid #e2e8f0; }
    .header small { color: #64748b; font-size: 9pt; }
    .footer { margin-top: 24pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${sanitizedTitle}</h1>
    <small>Generated by Researchify AI · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${words.toLocaleString()} words · ${sourcesCount} sources consulted</small>
  </div>
  <div class="content"><p>${htmlBody}</p></div>
  <div class="footer">Researchify AI — Autonomous Research Intelligence</div>
</body>
</html>`;

    // Create an invisible iframe for clean print context
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // Wait for styles to apply, then trigger print
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Cleanup after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }

    toast.success("PDF export ready", {
      description: 'Use "Save as PDF" in the print dialog for a full multi-page document.',
    });
  }, [markdownContent, title, sourcesCount, words]);



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
