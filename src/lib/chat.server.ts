import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { readPage, searchWeb } from "./firecrawl.server";

const GEMINI_API_KEY =
  process.env["GEMINI_API_KEY"] || "REDACTED_API_KEY";
const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });

// Pool of reliable Gemini models with separate free-tier quotas
// Note: gemini-3.5-flash was removed because its daily quota limit was exhausted
const MODEL_POOL = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];
const modelCooldowns = new Map<string, number>();
let requestCounter = 0;

function markModelCooling(model: string) {
  modelCooldowns.set(model, Date.now() + 60_000); // 60s cooldown
}

function selectModel(): string {
  const now = Date.now();
  const healthy = MODEL_POOL.filter((m) => {
    const until = modelCooldowns.get(m) || 0;
    return now >= until;
  });

  const pool = healthy.length > 0 ? healthy : MODEL_POOL;
  const chosen: string = pool[requestCounter % pool.length] || "gemini-3.6-flash";
  requestCounter = (requestCounter + 1) % 1000;
  return chosen;
}

const SYSTEM_PROMPT = `You are Cortex, an enterprise-grade autonomous research intelligence engine. Your mission is to provide uncompromising, verified, multi-perspective strategic intelligence reports.

IMPORTANT EXECUTION RULES:
1. Output your brief research plan in plain text FIRST before invoking any tools.
2. Perform 1 to 3 targeted web searches total.
3. Immediately after receiving search results, synthesize the findings into the COMPLETE, UNABRIDGED markdown research dossier. Never end on a tool call.
4. MANDATORY COMPLETION: You MUST write out all 7 sections completely without stopping or truncating halfway. If the user prompts to continue, pick up immediately from where the analysis left off and complete the remaining dossier.

MANDATORY REPORT STRUCTURE:

# [Title of Research Dossier]

> 🎯 **Executive Verdict:** [A direct, unambiguous 1–2 sentence answer to the user's core inquiry. State clearly YES, NO, or the exact conditional threshold without hedging.]
> 
> ⚖️ **Strategic Stance:** [Bullish | Bearish | High Risk | Premature | Favorable] | **Confidence Index:** [e.g. 85/100 — High / Moderate / Speculative]
> 
> 🔑 **Primary Deciding Factor:** [The single make-or-break variable that dictates this outcome.]

### 1. Core Synthesis & Findings
A high-signal briefing synthesizing the empirical evidence in 1–2 dense analytical paragraphs.

### 2. Chronological Evolution & Timeline (2022–2026)
A structured chronological breakdown (markdown table) detailing key inflection points, breakthroughs, policy shifts, or market failures year-by-year leading up to 2026.

### 3. Adversarial "Red Team" Analysis
* **The Bull / Established Case:** The strongest corroborated arguments, verified metrics, and official claims supporting the thesis.
* **The Bear / Counter-Thesis & Failure Modes:** Skeptical counter-evidence, hidden friction points, commercial or methodological bottlenecks, and data that contradicts mainstream optimism.
* **Analyst Risk Verdict:** Unvarnished evaluation of whether the bull or bear thesis holds greater empirical weight.

### 4. Deep-Dive Findings by Sub-Question
Detailed analytical breakdown addressing each research sub-question. Every factual metric and empirical claim MUST end with a bracketed citation marker like [1], [2] linked to the Sources section.

### 5. Where Sources Disagree & Contradictions
Explicitly identify points where industry reports, academic research, and official filings conflict, and explain why.

### 6. Confidence Assessment & Unverified Gaps
Identify what is battle-tested, what remains thin/speculative, and what critical questions remain unanswered.

### 7. Primary Source Indices & Verified Citations
Numbered list of references retrieved:
- [n] **Source Name** — [Full Page Title](URL) — Key contribution supported.

### 8. Final Strategic Verdict & Actionable Decision Framework
* **The Bottom Line:** A punchy, definitive conclusion that tells the reader exactly what to conclude or do—no ambiguity, no halfbaked hedging.
* **Key Deciding Trigger to Watch:** The specific empirical metric, date, or event that will confirm or invalidate this verdict.
* **Actionable Next Steps:**
  1. [Immediate tactical priority]
  2. [Risk hedging / mitigation step]
  3. [Long-term positioning recommendation]

Rules:
- Never hallucinate URLs or dates. Only cite pages retrieved via tools.
- Never give a non-committal or generic "it depends" response. Take an informed, evidence-backed stance.
- Maintain an elite, objective, analytical intelligence tone.`;

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

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ensure every message conforms to modern UIMessage format with a parts array
  const safeMessages = rawMessages.map((m) => {
    if (Array.isArray(m.parts) && m.parts.length > 0) {
      return m;
    }
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
      parts: [{ type: "text", text: textContent }],
    };
  });

  const tools = {
    web_search: tool({
      description:
        "Search the live web and return page titles, URLs and text excerpts. Use short keyword queries.",
      inputSchema: z.object({
        query: z.string().describe("Short keyword search query, 3-8 words"),
        purpose: z.string().optional().default("General research").describe("Which sub-question this search serves"),
        limit: z.coerce.number().optional().default(5).describe("How many results to return, 3 to 8"),
        recency: z
          .union([z.enum(["day", "week", "month", "year"]), z.string(), z.null(), z.undefined()])
          .optional()
          .default(null)
          .describe("Restrict to recently published pages, or null for no restriction"),
      }),
      execute: async ({ query, purpose, limit, recency }) => {
        const capped = Math.min(Math.max(Math.round(Number(limit) || 5), 3), 8);
        const validRecency =
          recency === "day" || recency === "week" || recency === "month" || recency === "year"
            ? recency
            : undefined;
        try {
          const found = await searchWeb(query, capped, validRecency);
          return { purpose: purpose || "Research", ...found };
        } catch (error) {
          return { purpose: purpose || "Research", query, results: [], error: (error as Error).message };
        }
      },
    }),
    read_page: tool({
      description: "Fetch the full readable text of one web page or PDF by URL.",
      inputSchema: z.object({
        url: z.string().describe("Absolute http(s) URL of the page to read"),
        purpose: z.string().optional().default("Read full page content").describe("Why this page needs to be read in full"),
      }),
      execute: async ({ url, purpose }) => {
        try {
          const page = await readPage(url);
          return { purpose: purpose || "Page content", ...page };
        } catch (error) {
          return { purpose: purpose || "Page content", url, content: "", error: (error as Error).message };
        }
      },
    }),
  };

  const activeModel = selectModel();
  try {
    const modelMessages = await convertToModelMessages(safeMessages);
    const result = streamText({
      model: google(activeModel),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(6),
      maxOutputTokens: 8192,
      maxRetries: 3,
      abortSignal: request.signal,
    });
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: (err) => {
        console.error("AI stream error on model", activeModel, ":", err);
        const msg = String((err as any)?.message || err);
        if (msg.includes("quota") || msg.includes("Quota") || msg.includes("429")) {
          markModelCooling(activeModel);
          return "Model temporarily busy. Automatically switching models for your next query.";
        }
        return "An error occurred during research. Please try your query again.";
      },
    });
  } catch (error) {
    console.error("Initial stream setup error:", error);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
