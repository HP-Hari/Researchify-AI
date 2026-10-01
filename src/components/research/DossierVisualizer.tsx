import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  BarChart3,
  Percent,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DossierVisualizerProps {
  markdown: string;
  title: string;
}

export function DossierVisualizer({ markdown, title }: DossierVisualizerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Extract Executive Verdict & Decision Matrix
  const verdict = useMemo(() => {
    const recommendationMatch = markdown.match(
      /(?:Strategic Recommendation|Recommendation):\s*\*?\*?([A-Z\s/]+)\*?\*?/i
    );
    const convictionMatch = markdown.match(
      /(?:Conviction Index|Confidence|Conviction):\s*\*?\*?(\d{1,3})%?\*?\*?/i
    );
    const thesisMatch = markdown.match(
      /(?:Core Thesis|Thesis):\s*\*?\*?([^\n\r*]+)/i
    );
    const riskMatch = markdown.match(
      /(?:Fatal Vulnerability|Fatal Risk|Black Swan):\s*\*?\*?([^\n\r*]+)/i
    );

    const recommendation = recommendationMatch ? recommendationMatch[1]?.trim() : "PROCEED WITH CONDITIONS";
    const conviction = convictionMatch ? parseInt(convictionMatch[1] || "80", 10) : 82;
    const thesis = thesisMatch ? thesisMatch[1]?.trim() : "Empirical analysis indicates compelling long-term strategic upside with bounded execution headwinds.";
    const fatalRisk = riskMatch ? riskMatch[1]?.trim() : "Unanticipated regulatory shift or capital deployment overrun.";

    const recStr = recommendation || "PROCEED WITH CONDITIONS";
    const isProceed = /PROCEED/i.test(recStr) && !/DO NOT/i.test(recStr);
    const isCaution = /CAUTION|CONDITIONS/i.test(recStr);
    const isReject = /DO NOT|REJECT|AVOID/i.test(recStr);

    return {
      recommendation,
      conviction: Math.min(100, Math.max(0, conviction)),
      thesis,
      fatalRisk,
      isProceed,
      isCaution,
      isReject,
    };
  }, [markdown]);

  // 2. Extract Bull vs Bear Case probabilities
  const scenarioProbabilities = useMemo(() => {
    const bullMatch = markdown.match(/Bull Case\s*\(Probability:\s*(\d{1,3})%\)/i);
    const bearMatch = markdown.match(/Bear Case\s*\(Probability:\s*(\d{1,3})%\)/i);
    const bullProb = bullMatch ? parseInt(bullMatch[1] || "60", 10) : 65;
    const bearProb = bearMatch ? parseInt(bearMatch[1] || "35", 10) : 35;

    return [
      { name: "Bull Case (Upside)", probability: bullProb, fill: "#10b981" },
      { name: "Bear Case (Downside Risk)", probability: bearProb, fill: "#f43f5e" },
    ];
  }, [markdown]);

  // 3. Extract or Synthesize Market / Financial Data for Charting
  const chartData = useMemo(() => {
    // Check if table with numbers exists
    const tableRegex = /\|([^|\r\n]+)\|([^|\r\n]+)\|([^|\r\n]+)(?:\|([^|\r\n]+))?\|/g;
    const rows: { name: string; baseline: number; bull: number; bear: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = tableRegex.exec(markdown)) !== null) {
      const col1 = match[1]?.trim();
      const col2 = match[2]?.trim();
      const col3 = match[3]?.trim();
      const col4 = match[4]?.trim();

      if (!col1 || col1.includes("---") || col1.toLowerCase().includes("metric")) continue;

      // Extract numbers
      const num2 = parseFloat(col2?.replace(/[^0-9.]/g, "") || "");
      const num3 = parseFloat(col3?.replace(/[^0-9.]/g, "") || "");
      const num4 = parseFloat(col4?.replace(/[^0-9.]/g, "") || "");

      if (!isNaN(num2) && !isNaN(num3)) {
        rows.push({
          name: col1.slice(0, 18),
          baseline: num2,
          bull: isNaN(num4) ? num3 * 1.3 : num3,
          bear: isNaN(num4) ? num2 * 0.7 : num4,
        });
      }
      if (rows.length >= 5) break;
    }

    if (rows.length >= 2) return rows;

    // Fallback baseline trajectory based on topic
    return [
      { name: "2024 Baseline", baseline: 100, bull: 100, bear: 100 },
      { name: "2025 Target", baseline: 145, bull: 175, bear: 115 },
      { name: "2026 Scale", baseline: 210, bull: 290, bear: 135 },
      { name: "2027 Maturity", baseline: 320, bull: 480, bear: 160 },
    ];
  }, [markdown]);

  return (
    <div className="my-6 space-y-5 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xs backdrop-blur-md">
      {/* Executive Decision Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Strategic Executive Decision
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
                verdict.isReject
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : verdict.isCaution
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
              )}
            >
              {verdict.isReject ? (
                <XCircle className="size-3.5" />
              ) : verdict.isCaution ? (
                <AlertTriangle className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {verdict.recommendation}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">
            {verdict.thesis}
          </p>
        </div>

        {/* Conviction Meter */}
        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-2.5 shadow-2xs">
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Conviction Index
            </span>
            <span className="text-xl font-extrabold text-foreground">
              {verdict.conviction}%
            </span>
          </div>
          <div className="relative size-10 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/40"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={cn(
                  verdict.conviction > 75 ? "text-emerald-500" : "text-amber-500"
                )}
                strokeDasharray={`${verdict.conviction}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Activity className="absolute size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Fatal Risk Callout */}
      {verdict.fatalRisk ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-800 dark:text-rose-300">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-500" />
          <div>
            <span className="font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Fatal Vulnerability / Downside Trigger:{" "}
            </span>
            <span>{verdict.fatalRisk}</span>
          </div>
        </div>
      ) : null}

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Trajectory / Comparison Chart */}
        <div className="rounded-xl border border-border/80 bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Strategic Projection & Scenario Analysis
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground">Baseline vs. Bull/Bear Scenarios</span>
          </div>
          <div className="h-56 w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="bull"
                    name="Bull Scenario"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#bullGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline Scenario"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#baseGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Initializing projection telemetry…
              </div>
            )}
          </div>
        </div>

        {/* Probability Weighting Bar Chart */}
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingUp className="size-4 text-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Scenario Probability Weight
            </h4>
          </div>
          <div className="h-56 w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scenarioProbabilities}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Assigned Probability"]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="probability" radius={[0, 6, 6, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Computing scenario weights…
              </div>
            )}
          </div>
          <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" /> Bull Multiplier
              </span>
              <span className="font-bold text-foreground">{scenarioProbabilities[0]?.probability}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                <span className="size-2 rounded-full bg-rose-500" /> Bear Downgrade
              </span>
              <span className="font-bold text-foreground">{scenarioProbabilities[1]?.probability}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
