import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 my-2 text-xs space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{this.props.fallbackTitle || "Research View Irregularity Handled"}</span>
          </div>
          <p className="text-muted-foreground">
            A transient formatting irregularity occurred while rendering dynamic elements. The content is preserved below.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium text-xs cursor-pointer shadow-2xs"
          >
            <RefreshCw className="size-3" /> Refresh View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
