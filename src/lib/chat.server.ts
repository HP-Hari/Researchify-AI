import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { readPage, searchWeb } from "./firecrawl.server";

function getGoogleProvider() {
  const rawKey = process.env["GEMINI_API_KEY"] || "";
  const keys = rawKey.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    console.warn("[Researchify AI] GEMINI_API_KEY is not set. LLM inference will fail.");
    return createGoogleGenerativeAI({ apiKey: "" });
  }
  // Load-balance across multiple keys if provided
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  return createGoogleGenerativeAI({ apiKey: selectedKey });
}


// Pool of verified, active Gemini models with separate healthy quotas
const MODEL_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];
const modelCooldowns = new Map<string, number>();
let requestCounter = 0;

function markModelCooling(model: string) {
  modelCooldowns.set(model, Date.now() + 180_000); // 3m cooldown
}

function selectModel(): string {
  const now = Date.now();
  const healthy = MODEL_POOL.filter((m) => {
    const until = modelCooldowns.get(m) || 0;
    return now >= until;
  });

  const pool = healthy.length > 0 ? healthy : MODEL_POOL;
  const chosen: string = pool[requestCounter % pool.length] || "gemini-3.5-flash-lite";
  requestCounter = (requestCounter + 1) % 1000;
  return chosen;
}

const SYSTEM_PROMPT = `You are Researchify AI, an enterprise-grade autonomous research intelligence engine. Your mission is to provide uncompromising, verified, multi-perspective strategic intelligence reports.

IMPORTANT EXECUTION RULES:
1. Output your brief research plan in plain text FIRST before invoking any tools.
2. Perform 1 to 3 targeted web searches total.
3. Immediately after receiving search results, synthesize the findings into the COMPLETE, UNABRIDGED markdown research dossier. Never end on a tool call.
4. MANDATORY COMPLETION: You MUST write out all 9 sections completely without stopping or truncating halfway. If the user prompts to continue, pick up immediately from where the analysis left off and complete the remaining dossier.

MANDATORY REPORT STRUCTURE:

# [Title of Research Dossier]

> 🎯 **Executive Verdict:** [A direct, unambiguous 1–2 sentence answer to the user's core inquiry. State clearly YES, NO, or the exact conditional threshold without hedging.]
> 
> ⚖️ **Strategic Stance:** [Bullish | Bearish | High Risk | Premature | Favorable] | **Confidence Index:** [Strictly Evidence-Based Score e.g. 73% — with 1-phrase empirical justification]
> 
> 🔑 **Primary Deciding Factor:** [The single make-or-break variable that dictates this outcome.]

### 1. Core Synthesis & Findings
A high-signal briefing synthesizing the empirical evidence in 1–2 dense analytical paragraphs.

### 2. Chronological Evolution & Timeline (2022–2026)
A structured chronological breakdown (markdown table) detailing key inflection points, breakthroughs, policy shifts, or market failures year-by-year leading up to 2026.

### 3. Verdict Analysis (Bull Case vs. Bear Case)
* **Supporting Arguments (The Bull Case):** The strongest corroborated data, verified performance benchmarks, and official evidence supporting the opportunity.
* **Counter-Evidence & Critical Risks (The Bear Case):** Unvarnished counter-evidence, hidden friction points, cost/scaling bottlenecks, and empirical data challenging the thesis.
* **Decisive Risk Verdict:** Definitive analytical evaluation weighing which case holds greater empirical validity.

### 4. Deep-Dive Findings by Sub-Question
Detailed analytical breakdown addressing each research sub-question with concrete evidence from the retrieved sources.

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

### 9. Related Strategic Questions
Provide exactly 3 high-impact, specific follow-up research questions directly stemming from this inquiry and findings that an analyst should explore next:
- [Specific follow-up question 1 focusing on operational/cost realities]
- [Specific follow-up question 2 examining alternative technologies or competitive responses]
- [Specific follow-up question 3 probing regulatory, security, or long-term moat implications]

CONFIDENCE SCORING & INTEGRITY RULES:
- NEVER use a default, canned, or repeated number (such as 88%, 88/100, 85%, or 80%).
- The Confidence Index MUST be an authentic, dynamically calculated percentage strictly derived from the empirical rigor, sample size, and consistency of the retrieved evidence:
  * 30%–55%: Highly speculative, thin reporting, or conflicting benchmark claims.
  * 58%–76%: Moderate certainty, emerging industry consensus with ongoing commercial/technical debate.
  * 79%–96%: High certainty, verified empirical consensus backed by multi-source documentation or regulatory filings.
- ALWAYS append a brief 1-phrase empirical rationale explaining the exact score (e.g. "Confidence Index: 71% — Strong architectural validation across 4 primary studies, but enterprise unit economics remain unstandardized").
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
    const googleProvider = getGoogleProvider();
    const result = streamText({
      model: googleProvider(activeModel),
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
        markModelCooling(activeModel);
        return "Synthesizing research dossier. Continue research below to expand details.";
      },
    });
  } catch (error) {
    console.error("Initial stream setup error on", activeModel, error);
    markModelCooling(activeModel);
    return new Response(JSON.stringify({ error: "Research engine momentarily busy. Please resubmit." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
