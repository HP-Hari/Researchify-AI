// src/components/research/DocumentUpload.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
  FileSpreadsheet,
  File,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Loader2,
  Download,
  UploadCloud,
  FolderOpen,
  Eye,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface AttachedDocumentInfo {
  id: string;
  originalName: string;
  storedName: string;
  url: string;
  fileType: string;
  fileSize: number;
  wordCount: number;
  charCount: number;
  pageCount: number | null;
  previewSnippet: string;
  extractedText: string;
  uploadedAt: string;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getDocumentIcon(fileType: string, className = "size-4") {
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return <FileText className={`${className} text-rose-500`} />;
  if (t.includes("csv") || t.includes("sheet") || t.includes("xls"))
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  if (t.includes("doc")) return <FileText className={`${className} text-blue-500`} />;
  return <File className={`${className} text-amber-500`} />;
}

// Global upload helper
export async function uploadDocumentFile(file: File): Promise<AttachedDocumentInfo> {
  if (file.size > 30 * 1024 * 1024) {
    throw new Error("File exceeds 30MB upload limit.");
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] || "");
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const payload = { filename: file.name, contentBase64: base64 };
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errMsg = "Upload failed";
    try {
      const errData = await res.json();
      errMsg = errData.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return (await res.json()) as AttachedDocumentInfo;
}

export async function fetchUploadedDocuments(): Promise<AttachedDocumentInfo[]> {
  try {
    const res = await fetch("/api/upload");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.documents) ? data.documents : [];
  } catch (e) {
    console.error("Failed to fetch uploaded documents:", e);
    return [];
  }
}

interface DocumentUploadProps {
  attachedDoc: AttachedDocumentInfo | null;
  onDocChange: (doc: AttachedDocumentInfo | null) => void;
  onAnalyzeDoc?: (doc: AttachedDocumentInfo) => void;
  disabled?: boolean;
  registerTrigger?: (trigger: () => void) => void;
}

export function DocumentUpload({
  attachedDoc,
  onDocChange,
  onAnalyzeDoc,
  disabled = false,
  registerTrigger,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  useEffect(() => {
    if (registerTrigger) {
      registerTrigger(handleClick);
    }
  }, [registerTrigger, handleClick]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText(`Ingesting & extracting evidence from ${file.name}…`);

    try {
      const docData = await uploadDocumentFile(file);
      onDocChange(docData);
      toast.success("Document Ingested & Grounded", {
        description: `${docData.originalName} (${docData.wordCount.toLocaleString()} words extracted)`,
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload Failed", {
        description: (err as Error).message || "Could not process document.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  return (
    <div className="w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.doc,.docx,.txt,.json,.md"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Uploading State Banner */}
      {isUploading ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-xs text-accent-foreground animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-accent" />
            <span className="font-medium">{uploadProgressText}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Extracting document vectors…</span>
        </div>
      ) : null}

      {/* Attached Document Evidence Card */}
      {attachedDoc && !isUploading ? (
        <div className="mb-2.5 rounded-xl border border-border/80 bg-card/90 p-3 shadow-xs backdrop-blur-md transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 rounded-lg border border-border/60 bg-muted/60 p-2 shadow-2xs">
                {getDocumentIcon(attachedDoc.fileType)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-semibold text-foreground truncate max-w-[280px] sm:max-w-md">
                    {attachedDoc.originalName}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" /> Grounding Evidence Ready
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span>{formatFileSize(attachedDoc.fileSize)}</span>
                  <span>•</span>
                  <span>{attachedDoc.wordCount.toLocaleString()} words</span>
                  {attachedDoc.pageCount ? (
                    <>
                      <span>•</span>
                      <span>
                        {attachedDoc.pageCount} {attachedDoc.pageCount === 1 ? "page" : "pages"}
                      </span>
                    </>
                  ) : null}
                  <span>•</span>
                  <a
                    href={attachedDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 hover:text-foreground underline underline-offset-2"
                  >
                    <Download className="size-2.5" /> Source File
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onAnalyzeDoc ? (
                <button
                  type="button"
                  onClick={() => onAnalyzeDoc(attachedDoc)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/25 transition-colors cursor-pointer shadow-2xs"
                  title="Run autonomous synthesis on this document"
                >
                  <Sparkles className="size-3.5" />
                  <span>Analyze Document</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onDocChange(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Remove attached document"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Collapsible Text Preview */}
          <div className="mt-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isPreviewOpen ? (
                <>
                  <ChevronUp className="size-3" /> Hide Extracted Text Excerpt
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" /> Preview Extracted Text ({attachedDoc.wordCount}{" "}
                  words)
                </>
              )}
            </button>

            {isPreviewOpen ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap select-text">
                {attachedDoc.extractedText.slice(0, 3000)}
                {attachedDoc.extractedText.length > 3000 ? (
                  <span className="text-accent italic block mt-1">
                    … [Truncated preview: {attachedDoc.extractedText.length - 3000} characters
                    remaining stored in memory]
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// DOCUMENT DROPZONE (Prominent on Empty State & Drag Over)
// ============================================================================
export function DocumentDropzone({
  onFileIngested,
  onAnalyzeDoc,
  disabled = false,
}: {
  onFileIngested: (doc: AttachedDocumentInfo) => void;
  onAnalyzeDoc?: (doc: AttachedDocumentInfo) => void;
  disabled?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setIsUploading(true);
    setProgressMsg(`Parsing and extracting evidence vectors from ${file.name}…`);
    try {
      const doc = await uploadDocumentFile(file);
      onFileIngested(doc);
      toast.success("Document Ingested Successfully", {
        description: `${doc.originalName} (${doc.wordCount.toLocaleString()} words extracted)`,
      });
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setIsUploading(false);
      setProgressMsg("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`group relative w-full max-w-xl rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
        isDragOver
          ? "border-accent bg-accent/10 shadow-lg ring-4 ring-accent/20"
          : "border-border/80 bg-card/40 hover:border-accent/60 hover:bg-card/70"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.doc,.docx,.txt,.json,.md"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void processFile(f);
        }}
        disabled={disabled || isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-3">
          <Loader2 className="size-8 animate-spin text-accent" />
          <p className="text-xs font-semibold text-foreground">{progressMsg}</p>
          <p className="text-[11px] text-muted-foreground">
            Indexing content for autonomous citation & cross-examination…
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-2.5 text-accent shadow-2xs group-hover:scale-105 transition-transform">
            <UploadCloud className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Drop Enterprise Documents to Ground Research
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Upload PDF reports, financial CSVs, Word (.docx), or TXT files. Researchify AI audits
              every claim and cross-references assertions.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Paperclip className="size-3.5" />
              Browse Files
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">PDF</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">DOCX</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">CSV</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">TXT</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">JSON</span>
            <span>· Max 30MB</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DOCUMENT LIBRARY MODAL (Accessible list of all ingested documents)
// ============================================================================
export function DocumentLibraryModal({
  trigger,
  onSelectDoc,
  onAnalyzeDoc,
  activeDocId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: React.ReactNode;
  onSelectDoc: (doc: AttachedDocumentInfo) => void;
  onAnalyzeDoc?: (doc: AttachedDocumentInfo) => void;
  activeDocId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [documents, setDocuments] = useState<AttachedDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<AttachedDocumentInfo | null>(null);

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    const docs = await fetchUploadedDocuments();
    setDocuments(docs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      void loadDocs();
    }
  }, [open, loadDocs]);

  const filtered = documents.filter((d) =>
    d.originalName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <FolderOpen className="size-3.5 text-accent" />
            <span>Document Library</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="size-5 text-accent" />
              <DialogTitle className="text-lg font-semibold">
                Ingested Enterprise Documents
              </DialogTitle>
            </div>
            <span className="rounded-full bg-accent/10 text-accent border border-accent/20 px-2.5 py-0.5 text-xs font-medium">
              {documents.length} Available
            </span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            All documents parsed and indexed in this session. Attach any document to ground your
            research inquiry or trigger an autonomous audit.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b border-border/60 bg-muted/20">
          <input
            type="text"
            placeholder="Search ingested documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-accent" />
              <p className="text-xs">Loading document registry…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                No documents matching your search.
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a PDF, CSV, Word, or TXT file to get started.
              </p>
            </div>
          ) : (
            filtered.map((doc) => {
              const isActive = activeDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs"
                      : "border-border/80 bg-card/80 hover:border-accent/40 hover:bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-lg border border-border/60 bg-muted/60 p-2 shadow-2xs shrink-0">
                      {getDocumentIcon(doc.fileType, "size-5")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-sm">
                          {doc.originalName}
                        </h4>
                        {isActive ? (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                            Active in Chat
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.wordCount.toLocaleString()} words</span>
                        {doc.pageCount ? (
                          <>
                            <span>•</span>
                            <span>{doc.pageCount} pages</span>
                          </>
                        ) : null}
                        <span>•</span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground underline underline-offset-2 inline-flex items-center gap-0.5"
                        >
                          <Download className="size-2.5" /> Download
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreview(selectedPreview?.id === doc.id ? null : doc)
                      }
                      className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Preview extracted text"
                    >
                      <Eye className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectDoc(doc);
                        setOpen(false);
                        toast.success("Document Attached", {
                          description: `${doc.originalName} is now ready as grounding evidence.`,
                        });
                      }}
                      className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                    >
                      Attach
                    </button>

                    {onAnalyzeDoc ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onAnalyzeDoc(doc);
                        }}
                        className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1 shadow-xs"
                      >
                        <Sparkles className="size-3" />
                        Analyze
                      </button>
                    ) : null}
                  </div>

                  {selectedPreview?.id === doc.id ? (
                    <div className="w-full mt-2 pt-2 border-t border-border/40 font-mono text-[11px] max-h-32 overflow-y-auto bg-muted/40 p-2 rounded-lg text-muted-foreground whitespace-pre-wrap">
                      {doc.extractedText.slice(0, 1500)}…
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ATTACH DOCUMENT BUTTON (Toolbar Integration)
// ============================================================================
export function AttachDocumentButton({
  onClick,
  disabled = false,
  hasAttachment = false,
  attachedDocName,
  onOpenLibrary,
}: {
  onClick?: () => void;
  disabled?: boolean;
  hasAttachment?: boolean;
  attachedDocName?: string | null;
  onOpenLibrary?: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer shadow-2xs ${
          hasAttachment
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title={
          hasAttachment
            ? `Attached: ${attachedDocName || "Document"}. Click to replace or upload another.`
            : "Upload PDF, CSV, Word (.docx), or TXT documents for autonomous research grounding"
        }
      >
        <Paperclip className="size-3.5" />
        <span className="truncate max-w-[140px] sm:max-w-xs">
          {hasAttachment
            ? `Attached: ${attachedDocName || "Document Ready"}`
            : "Upload Document"}
        </span>
      </button>

      {onOpenLibrary ? (
        <button
          type="button"
          onClick={onOpenLibrary}
          className="rounded-full border border-border/80 bg-muted/30 p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Browse Ingested Document Library"
        >
          <FolderOpen className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
