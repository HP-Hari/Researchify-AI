import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-secondary hover:text-foreground shadow-2xs",
        className,
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <div className="relative flex size-4 items-center justify-center">
        {isDark ? (
          <Moon className="size-3.5 text-accent transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="size-3.5 text-amber-500 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
      {showLabel ? (
        <span className="font-mono text-[11px] select-none">{isDark ? "Dark" : "Light"}</span>
      ) : null}
    </button>
  );
}
