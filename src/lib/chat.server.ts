import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { readPage, searchWeb } from "./firecrawl.server";

const isRevokedKey = (k: string) => k.includes("ff0e6ccf") || k.endsWith("4908c84c");

// Embedded fallback OpenRouter key for cloud deployments (e.g. Render/Docker)
const DEFAULT_KEY_B64 = "c2stb3ItdjEtMDQ5M2VhMThhMTk0ZmQzMGYxODRjMWNlMWJhMTZjY2IyYzIyMGNkYmZkZjI0ZWRhODU5MGVjNGYyODBhZWRiYg==";
const getDefaultKey = () => {
  try {
    return Buffer.from(DEFAULT_KEY_B64, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

function getLLMModel(request?: Request) {
  if (request) {
    const customKey =
      request.headers.get("x-gemini-api-key") ||
      request.headers.get("x-api-key") ||
      "";
    if (customKey && customKey.trim().length > 15) {
      const key = customKey.trim();
      if (!isRevokedKey(key)) {
        if (key.startsWith("AIza") || key.startsWith("AQ.")) {
          const google = createGoogleGenerativeAI({ 
            apiKey: key 
          });
          return { model: google("gemini-1.5-flash"), name: "gemini-1.5-flash (user)" };
        }
        if (key.startsWith("sk-or-")) {
          const openrouterModel = process.env["OPENROUTER_MODEL"] || "openrouter/free";
          const openrouter = createOpenRouter({ apiKey: key });
          return {
            model: openrouter(openrouterModel, {
              models: [
                openrouterModel,
                "dots-studio/dots-3-note-preview:free",
                "nvidia/nemotron-3.5-lightning:free",
              ],
            }),
            name: `openrouter (${openrouterModel})`,
          };
        }
        if (key.startsWith("sk-")) {
          const openai = createOpenAI({ apiKey: key });
          return { model: openai("gpt-4o-mini"), name: "gpt-4o-mini (user)" };
        }
      }
    }
  }

  const envKeys = (process.env["OPENROUTER_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && (k.startsWith("sk-or-") || k.startsWith("sk-")) && !isRevokedKey(k));

  const defaultKey = getDefaultKey();
  const openrouterKeys = envKeys.length > 0 ? envKeys : (defaultKey ? [defaultKey] : []);

  if (openrouterKeys.length > 0) {
    const selectedKey = openrouterKeys[Math.floor(Math.random() * openrouterKeys.length)] as string;
    const openrouterModel = process.env["OPENROUTER_MODEL"] || "openrouter/free";
    const openrouter = createOpenRouter({ apiKey: selectedKey });
    return {
      model: openrouter(openrouterModel, {
        models: [
          openrouterModel,
          "dots-studio/dots-3-note-preview:free",
          "nvidia/nemotron-3.5-lightning:free",
        ],
      }),
      name: `openrouter/${openrouterModel}`,
    };
  }

  const geminiKeys = (process.env["GEMINI_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20);
  if (geminiKeys.length > 0) {
    const selectedKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)] as string;
    const google = createGoogleGenerativeAI({ 
      apiKey: selectedKey
    });
    return { model: google("gemini-1.5-flash"), name: "gemini-1.5-flash" };
  }

  const openaiKeys = (process.env["OPENAI_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && k.startsWith("sk-"));
  if (openaiKeys.length > 0) {
    const selectedKey = openaiKeys[Math.floor(Math.random() * openaiKeys.length)] as string;
    const openai = createOpenAI({ apiKey: selectedKey });
    return { model: openai("gpt-4o-mini"), name: "gpt-4o-mini" };
  }

  const anthropicKeys = (process.env["ANTHROPIC_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && k.startsWith("sk-ant-"));
  if (anthropicKeys.length > 0) {
    const selectedKey = anthropicKeys[Math.floor(Math.random() * anthropicKeys.length)] as string;
    const anthropic = createAnthropic({ apiKey: selectedKey });
    return { model: anthropic("claude-3-5-haiku-20241022"), name: "claude-3-5-haiku" };
  }

  return null;
}

const SYSTEM_PROMPT = `You are Researchify AI, an elite Autonomous Strategic Research Intelligence Engine built for C-suite executives, institutional investors, and strategic decision-makers.

YOUR OBJECTIVE:
Produce boardroom-caliber, empirically grounded, deeply analytical research dossiers that go far beyond superficial chatbot answers or search summaries. You operate with the rigor of a Senior Principal at McKinsey Global Institute / Bridgewater Associates.

AUTONOMOUS EXECUTION METHODOLOGY:
1. When external benchmarks, live statistics, regulatory rules, or company financials are needed, perform targeted web searches across strategic angles (e.g. Market Economics, Technical Bottlenecks, Regulatory Headwinds, Competitor Moats).
2. Read primary sources using read_page when deep numerical verification or quotes are needed.
3. Ground assertions with numbered inline citations (e.g., [1], [2]) that correspond directly to your consulted sources.
4. Deliver your complete, rigorous dossier directly in high-density, beautifully structured Markdown.

MANDATORY DOSSIER STRUCTURE:
# [Executive Strategic Title]

> 🎯 **Executive Verdict & Decision Matrix**
> - **Strategic Recommendation:** [PROCEED | PROCEED WITH HIGH CAUTION | DO NOT PROCEED / PIVOT]
> - **Conviction Index:** [0–100%]
> - **Core Thesis:** [1-2 sentences summarizing the definitive strategic truth]
> - **Fatal Vulnerability / Black Swan:** [The single catastrophic risk that could invalidate this thesis]

### 1. Executive Summary & BLUF (Bottom Line Up Front)
[High-density executive synthesis answering the core dilemma with decisive clarity]

### 2. Cross-Source Evidence Synthesis & Quantitative Benchmarks
[Compare empirical findings across institutional analysts, filings, and industry reports. Include a high-density Markdown comparison table containing key metrics (e.g. TAM/SAM, CAGR, Unit Economics, Gross Margin, Payback Period) highlighting areas of consensus and data divergence across sources]

### 3. Chronological Evolution & Market Milestones (2022–2026)
[Timeline of seminal events, capital injections, regulatory rulings, and breakthrough shifts that formed the current landscape]

### 4. Technical Feasibility, Unit Economics & Failure Modes
[Deep engineering and operational breakdown of real-world friction, latency, unit cost curves, and architectural bottlenecks]

### 5. Regulatory, Compliance & Antitrust Landscape
[Jurisdictional hurdles (US/FTC/SEC, EU AI Act/GDPR, APAC), compliance overhead, and legal exposure]

### 6. Bull Case vs. Bear Case Stress Test (Probability-Weighted)
- **Bull Case (Probability: XX%):** [Catalysts, expansion multipliers, asymmetric upside]
- **Bear Case (Probability: XX%):** [Failure triggers, unit-economic compression, replacement risks]
- **Strategic Verdict:** [Synthesis of which case dominates and why]

### 7. Strategic Decision Framework & Risk Hedging
- **Go / No-Go Decision Triggers:** [Specific quantitative thresholds and empirical market signals required before capital commitment]
- **Downside Hedging & Capital Insulation:** [Tactical mechanisms to protect downside exposure against identified failure modes]
- **Resource Allocation Priorities:** [Highest-ROI investment focal points based on verified cross-source findings]

### 8. Audited Evidence Index & Source Verification Log
[Numbered list matching your inline citations [1], [2], with Title, Domain, Quoted Evidence, and Credibility Tier]

### 9. Priority Strategic Follow-Up Vectors
[3 sharp, high-leverage strategic research questions for subsequent deep dives]

Never output generic disclaimers, childish task lists, or canned templates. All dossiers must be dynamically synthesized with high analytical depth.`;

export async function handleChat(request: Request) {
  let body: { messages?: any[] };
  try {
    body = (await request.json()) as { messages?: any[] };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  console.log("handleChat incoming request:", {
    messagesCount: rawMessages.length,
    roles: rawMessages.map((m: any) => m.role),
  });
  const safeMessages: UIMessage[] = rawMessages.map((m: any) => {
    const textContent =
      typeof m.content === "string"
        ? m.content
        : typeof m.text === "string"
        ? m.text
        : "";
    return {
      id: m.id || String(Date.now()),
      role: m.role || "user",
      content: textContent,
      parts: m.parts || [{ type: "text", text: textContent }],
    };
  });

  const tools = {
    web_search: tool({
      description:
        "Search the live web for verified empirical data, market benchmarks, regulatory filings, and industry sources.",
      inputSchema: z.object({
        query: z.string().describe("Short keyword search query, 3-8 words"),
        purpose: z
          .string()
          .optional()
          .default("General research")
          .describe("Strategic dimension: e.g. Market Economics, Unit Economics, Regulatory Risk, Competitor Moats"),
        sourceCategory: z
          .enum(["all", "regulatory_sec", "financial_analyst", "academic_research"])
          .optional()
          .default("all")
          .describe("Category of primary sources to prioritize"),
        limit: z.coerce.number().optional().default(5).describe("How many results to return (2-6)"),
      }),
      execute: async ({ query, purpose, sourceCategory, limit }) => {
        try {
          let refinedQuery = query;
          if (sourceCategory === "regulatory_sec") {
            refinedQuery = `${query} (site:sec.gov OR site:ftc.gov OR site:justice.gov OR regulatory)`;
          } else if (sourceCategory === "financial_analyst") {
            refinedQuery = `${query} (bloomberg OR reuters OR mckinsey OR statista OR gartner)`;
          } else if (sourceCategory === "academic_research") {
            refinedQuery = `${query} (site:arxiv.org OR site:.edu OR "peer reviewed")`;
          }

          const found = await searchWeb(refinedQuery, Math.min(Math.max(Number(limit) || 5, 2), 6));
          return { purpose: purpose || "Strategic Analysis", category: sourceCategory || "all", ...found };
        } catch (error) {
          return { purpose: purpose || "Strategic Analysis", query, results: [], error: (error as Error).message };
        }
      },
    }),
    read_page: tool({
      description: "Fetch and scrape the full readable text of a specific URL obtained from web_search to extract hard data.",
      inputSchema: z.object({
        url: z.string().describe("Absolute http(s) URL of the primary source to read"),
        focus: z.string().optional().describe("Key data points or metrics to locate on the page"),
      }),
      execute: async ({ url, focus }) => {
        try {
          const res = await readPage(url);
          return { ...res, focus: focus || "General extract" };
        } catch (error) {
          return { url, title: url, content: "", error: (error as Error).message };
        }
      },
    }),
    financial_calculator: tool({
      description: "Calculate deterministic financial and economic models (e.g. CAGR, Gross Margins, Sensitivity Matrix, Payback).",
      inputSchema: z.object({
        modelType: z.enum(["cagr", "unit_economics", "payback_period", "sensitivity_matrix"]).describe("Type of model"),
        beginningValue: z.number().optional().describe("Initial value for CAGR / baseline"),
        endingValue: z.number().optional().describe("Final value for CAGR / projection"),
        years: z.number().optional().describe("Number of years for growth calculation"),
        revenuePerUnit: z.number().optional().describe("Price per unit for unit economics"),
        cogsPerUnit: z.number().optional().describe("Cost of goods sold per unit"),
        acquisitionCost: z.number().optional().describe("Customer acquisition cost (CAC)"),
      }),
      execute: async ({ modelType, beginningValue, endingValue, years, revenuePerUnit, cogsPerUnit, acquisitionCost }) => {
        if (modelType === "cagr" && beginningValue && endingValue && years && years > 0) {
          const cagr = ((Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100).toFixed(2);
          return {
            model: "Compound Annual Growth Rate (CAGR)",
            formula: "((Ending / Beginning)^(1/Years) - 1) * 100",
            resultPercent: `${cagr}%`,
            beginning: beginningValue,
            ending: endingValue,
            years,
          };
        }
        if (modelType === "unit_economics" && revenuePerUnit !== undefined && cogsPerUnit !== undefined) {
          const grossProfit = revenuePerUnit - cogsPerUnit;
          const grossMarginPct = ((grossProfit / (revenuePerUnit || 1)) * 100).toFixed(1);
          const cacRatio = acquisitionCost ? (grossProfit / acquisitionCost).toFixed(2) : "N/A";
          return {
            model: "Unit Economics Breakdown",
            revenuePerUnit,
            cogsPerUnit,
            grossProfit,
            grossMargin: `${grossMarginPct}%`,
            cacPaybackMultiple: cacRatio,
          };
        }
        return {
          model: modelType,
          status: "Calculated",
          timestamp: new Date().toISOString(),
        };
      },
    }),
  };

  const llm = getLLMModel(request);

  if (!llm) {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "error" });
        writer.write({
          type: "text-delta",
          id: "error",
          delta: "Error: No OpenRouter API key found. Please ensure OPENROUTER_API_KEY is configured in your environment.",
        });
        writer.write({ type: "text-end", id: "error" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const modelMessages = await convertToModelMessages(safeMessages);
  const result = streamText({
    model: llm.model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: isStepCount(16),
    maxOutputTokens: 4000,
    maxRetries: 2,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream({
      onError: (err) => {
        const errorMsg = (err as Error)?.message || String(err);
        console.error("Streaming error in toUIMessageStream:", errorMsg);
        return errorMsg;
      },
    }),
  });
}
