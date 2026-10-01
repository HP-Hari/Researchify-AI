import { KeyRound, ExternalLink, Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ApiKeyModal({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("researchify.apiKey") || "";
      setApiKey(stored);
      setSavedKey(stored);
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem("researchify.apiKey");
      setSavedKey("");
      toast.success("API key removed. Running in offline synthesis mode.");
      setOpen(false);
      return;
    }

    if (!trimmed.startsWith("AIza") && !trimmed.startsWith("sk-") && !trimmed.startsWith("AQ.")) {
      toast.error("Invalid API Key format", {
        description: "Google Gemini keys start with 'AIzaSy...'. OpenAI/OpenRouter keys start with 'sk-'.",
      });
      return;
    }

    localStorage.setItem("researchify.apiKey", trimmed);
    setSavedKey(trimmed);
    toast.success("API Key saved!", {
      description: "Live web search and LLM intelligence are now active.",
    });
    setOpen(false);
  };

  const handleClear = () => {
    localStorage.removeItem("researchify.apiKey");
    setApiKey("");
    setSavedKey("");
    toast.info("API Key removed.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </div>
            <DialogTitle>Configure Research API Key</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Connect your own LLM API key for live web searching, deep crawling, and real-time report synthesis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs space-y-3">
            <div>
              <div className="flex items-center justify-between font-medium mb-1.5">
                <span>Google Gemini API Key (Recommended)</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-normal"
                >
                  Get free key <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Keys begin with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">AIzaSy...</code>.
              </p>
            </div>
            
            <div className="border-t border-border/50 pt-2">
              <div className="flex items-center justify-between font-medium mb-1.5">
                <span>OpenRouter API Key (Alternative)</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-normal"
                >
                  Get key <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Keys begin with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">sk-or-v1-</code>.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">API Key</label>
            <input
              type="password"
              placeholder="AIzaSy... or sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {savedKey ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="size-3" /> Key active: ••••••••{savedKey.slice(-4)}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Stored securely in your browser's localStorage. Never sent to third parties.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-3.5" />
                Remove Key
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
