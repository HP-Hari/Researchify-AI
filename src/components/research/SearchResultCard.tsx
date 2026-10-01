import { ExternalLink } from "lucide-react";

type Hit = { title?: string; url?: string; snippet?: string };

export function SearchResults({
  output,
}: {
  output: { query?: string; purpose?: string; results?: Hit[]; error?: string } | undefined;
}) {
  if (!output) return null;

  if (output.error) {
    return <p className="p-3 text-sm text-destructive">Search failed: {output.error}</p>;
  }

  const results = output.results ?? [];

  return (
    <div className="space-y-2 p-3">
      {output.purpose ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Goal:</span> {output.purpose}
        </p>
      ) : null}
      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results for “{output.query}”.</p>
      ) : (
        <ul className="space-y-1.5">
          {results.map((hit, index) => (
            <li key={`${hit.url}-${index}`}>
              <a
                href={hit.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary"
              >
                <span className="mt-0.5 font-mono text-[11px] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{hit.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{hit.url}</span>
                </span>
                <ExternalLink className="mt-1 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageRead({
  output,
}: {
  output: { url?: string; title?: string; purpose?: string; error?: string } | undefined;
}) {
  if (!output) return null;
  if (output.error) {
    return <p className="p-3 text-sm text-destructive">Could not read page: {output.error}</p>;
  }
  return (
    <div className="space-y-1 p-3">
      <p className="text-sm font-medium">{output.title}</p>
      <a
        href={output.url}
        target="_blank"
        rel="noreferrer"
        className="block truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {output.url}
      </a>
      {output.purpose ? <p className="text-xs text-muted-foreground">{output.purpose}</p> : null}
    </div>
  );
}

export function FinancialCalcResult({
  output,
}: {
  output: any;
}) {
  if (!output) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 font-mono">
      <div className="font-semibold text-foreground text-sm flex items-center justify-between">
        <span>{output.model || "Deterministic Financial Model"}</span>
        {output.resultPercent ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            {output.resultPercent}
          </span>
        ) : null}
      </div>
      {output.formula ? (
        <p className="text-muted-foreground">Formula: {output.formula}</p>
      ) : null}
      {output.grossMargin ? (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
          <div>Gross Margin: <strong className="text-foreground">{output.grossMargin}</strong></div>
          <div>Gross Profit: <strong className="text-foreground">${output.grossProfit}</strong></div>
        </div>
      ) : null}
    </div>
  );
}

