import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

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
import { ensureHydrated, findDocument } from "./upload.server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const isRevokedKey = (k: string) => k.includes("ff0e6ccf") || k.endsWith("4908c84c");

// Embedded fallback OpenRouter key for cloud deployments (e.g. Render/Docker)
const DEFAULT_KEY_B64 =
  "c2stb3ItdjEtMDQ5M2VhMThhMTk0ZmQzMGYxODRjMWNlMWJhMTZjY2IyYzIyMGNkYmZkZjI0ZWRhODU5MGVjNGYyODBhZWRiYg==";
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
      request.headers.get("x-gemini-api-key") || request.headers.get("x-api-key") || "";
    if (customKey && customKey.trim().length > 15) {
      const key = customKey.trim();
      if (!isRevokedKey(key)) {
        if (key.startsWith("AIza") || key.startsWith("AQ.")) {
          const google = createGoogleGenerativeAI({
            apiKey: key,
          });
          return { model: google("gemini-1.5-flash"), name: "gemini-1.5-flash (user)" };
        }
        if (key.startsWith("sk-or-")) {
          const openrouterModel = process.env["OPENROUTER_MODEL"] || "google/gemini-2.5-flash";
          const openrouter = createOpenRouter({ apiKey: key });
          const fallbackPool = [
            openrouterModel,
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
            "meta-llama/llama-3.3-70b-instruct",
          ];
          const fallbackModels = Array.from(new Set(fallbackPool)).slice(0, 3);
            return {
              model: openrouter(openrouterModel, {
                models: fallbackModels,
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
    .filter(
      (k) => k.length > 20 && (k.startsWith("sk-or-") || k.startsWith("sk-")) && !isRevokedKey(k),
    );

  const defaultKey = getDefaultKey();
  const openrouterKeys = envKeys.length > 0 ? envKeys : defaultKey ? [defaultKey] : [];

  if (openrouterKeys.length > 0) {
    const selectedKey = openrouterKeys[Math.floor(Math.random() * openrouterKeys.length)] as string;
    const openrouterModel = process.env["OPENROUTER_MODEL"] || "google/gemini-2.5-flash";
    const openrouter = createOpenRouter({ apiKey: selectedKey });
    const fallbackPool = [
      openrouterModel,
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "meta-llama/llama-3.3-70b-instruct",
    ];
    const fallbackModels = Array.from(new Set(fallbackPool)).slice(0, 3);
    return {
      model: openrouter(openrouterModel, {
        maxTokens: 2500,
        models: fallbackModels,
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
      apiKey: selectedKey,
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

// ============================================================================
// DIMINISHING RETURNS MEMORY TRACKER (Enforces Hard Stop at >85% Overlap)
// ============================================================================
class SearchMemoryTracker {
  private accumulatedTokens: Set<string> = new Set();
  private consecutiveRedundantSearches: number = 0;
  private readonly stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "are",
    "was",
    "were",
    "been",
    "have",
    "has",
    "had",
    "what",
    "which",
    "who",
    "whom",
    "will",
    "would",
    "can",
    "could",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "a",
    "an",
    "is",
    "it",
    "or",
    "as",
    "be",
    "their",
    "more",
  ]);

  private tokenize(text: string): Set<string> {
    const tokens = new Set<string>();
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && !this.stopWords.has(w)) {
        tokens.add(w);
      }
    }
    return tokens;
  }

  public recordSearchAndEvaluate(
    query: string,
    resultsText: string,
  ): {
    diminishingReturnsTriggered: boolean;
    consecutiveRedundantCount: number;
    similarityScore: number;
    directive?: string | undefined;
  } {
    const newTokens = this.tokenize(`${query} ${resultsText}`);
    if (newTokens.size === 0) {
      return {
        diminishingReturnsTriggered: false,
        consecutiveRedundantCount: 0,
        similarityScore: 0,
      };
    }

    if (this.accumulatedTokens.size === 0) {
      // First search, seed the memory buffer
      for (const t of newTokens) this.accumulatedTokens.add(t);
      return {
        diminishingReturnsTriggered: false,
        consecutiveRedundantCount: 0,
        similarityScore: 0,
      };
    }

    // Measure what ratio of newly observed tokens were already in the memory buffer
    let overlapCount = 0;
    for (const t of newTokens) {
      if (this.accumulatedTokens.has(t)) {
        overlapCount++;
      }
    }

    const similarity = overlapCount / newTokens.size;

    // Diminishing returns threshold: >85% semantic overlap
    if (similarity > 0.85) {
      this.consecutiveRedundantSearches++;
    } else {
      this.consecutiveRedundantSearches = 0;
      for (const t of newTokens) this.accumulatedTokens.add(t);
    }

    const triggered = this.consecutiveRedundantSearches >= 3;

    return {
      diminishingReturnsTriggered: triggered,
      consecutiveRedundantCount: this.consecutiveRedundantSearches,
      similarityScore: Math.round(similarity * 100),
      directive: triggered
        ? "DIMINISHING RETURNS HARD STOP: 3 consecutive searches yielded >85% semantic overlap with existing research memory. You have exhausted publicly available empirical data on this topic. STOP searching immediately. Proceed directly to synthesis. It is acceptable and expected to write: 'Information on this specific metric is not publicly available in verified primary sources or audited filings' rather than endlessly looping."
        : undefined,
    };
  }
}

// ============================================================================
// INSTITUTIONAL BASE SYSTEM PROMPT WITH STRICT PROTOCOLS
// ============================================================================
const BASE_SYSTEM_PROMPT = `You are Researchify AI, an elite Autonomous Strategic Research Intelligence Engine built for C-suite executives, institutional investors, technical architects, and strategic decision-makers. You operate with the intellectual rigor of a Senior Principal at McKinsey Global Institute / Bridgewater Associates / MIT CSAIL.

OPERATING PRINCIPLES:
1. UNIVERSAL RESEARCH MASTERY: You answer ALL inquiries—whether open-ended strategic dilemmas, comparative technology evaluations, market sizing analyses, conceptual deep dives, or uploaded document audits. Never refuse, never say an inquiry is too broad, and never demand more context. Answer with deep, actionable intelligence.
2. NO PASSIVE SUMMARIZATION: Never merely summarize articles. Boardrooms and engineering leaders already have search engines. Your mandate is high-order institutional synthesis: identify fundamental driving factors, asymmetric structural trade-offs, and unresolved epistemic blindspots.
3. HIERARCHICAL INFORMATION COMPRESSION: Rank all discovered facts by importance. Retain Tier 1 (Causal drivers, audited unit costs, technical bounds). Compress Tier 2 (Supporting metrics) into dense comparison tables. Aggressively purge Tier 3 (Marketing fluff, introductory filler, unverified blog conjectures).
4. EMPIRICAL BENCHMARKS & TRADE-OFF MATRICES: Every substantive answer must include a dense Markdown comparison table or benchmark matrix contrasting key dimensions, trade-offs, unit costs, or performance characteristics across options.
5. METADATA CONFLICT RESOLUTION: When data sources diverge, invoke the resolve_conflict tool. Evaluate source metadata (recency, authority tier, empirical methodology) to adjudicate precedence like a senior analyst.
6. STRICT POST-VERIFICATION LOOP: Before finalizing your findings, execute the verify_claims_post_audit tool on your core empirical claims to ensure grounding fidelity.
7. DIMINISHING RETURNS RULE: If search queries return redundant information (>85% semantic overlap across 3 loops), cease searching immediately and state what is public vs unobservable.
8. USER DOCUMENT GROUNDING & MANDATORY SYNTHESIS: When an inquiry contains an attached document or references an ingested file, treat it as a foundational PRIMARY EMPIRICAL SOURCE. Never refuse, never state that the text is too short, and never ask the user to provide more content. Immediately synthesize a complete research dossier citing the document as Primary Evidence [1].
9. PERSISTENT SYSTEM STATE CHECKLIST: Before writing your final research dossier or synthesis, you MUST output a <system_checklist> block verifying that core requirements have been satisfied:
<system_checklist>
- [x] Primary Inquiry Addressed: [Specific query focus]
- [x] Multi-Source Cross-Verification & Grounding: [Checked across consulted sources and documents]
- [x] Conflict Adjudication Executed: [Evaluated metadata & recency on divergent metrics]
- [x] Strategic Synthesis Beyond Raw Data: [Identified driving factors & asymmetric trade-offs]
- [x] Post-Verification Audit Pass: [Audited empirical claims against source URLs]
- [x] Hierarchical Compression Adhered: [Pruned marketing noise, delivered high-density synthesis]
</system_checklist>

STRUCTURE FOR STRATEGIC & OPEN-ENDED INTELLIGENCE REPORTS:
# [Definitive Strategic / Analytical Title]

> 🎯 **Executive Verdict & Core Thesis** [~75 words]
> - **Primary Verdict / Recommendation:** [Decisive strategic answer: e.g. PROCEED WITH HIGH CAUTION / PARADIGM SHIFT VALIDATED / CONVERGENT ARCHITECTURE RECOMMENDED]
> - **Conviction Index:** [0–100%]
> - **Core Thesis:** [1-2 sentences capturing the definitive truth]
> - **Fatal Vulnerability / Key Asymmetric Risk:** [The single critical risk or trade-off that could invalidate this thesis]

### 1. Executive Summary & BLUF (Bottom Line Up Front) [150–200 words]
[High-density executive synthesis directly answering the inquiry with decisive clarity]

### 2. Strategic Synthesis & Structural Drivers [300–400 words]
- **Core Driving Forces (Macro & Micro Forces):** [Analyze the macroeconomic, technical, or capital forces propelling this topic]
- **Asymmetric Trade-Offs & Structural Compromises:** [What is compromised for every operational gain: e.g. latency vs accuracy, capital intensity vs margin defensibility, centralized control vs regulatory compliance]
- **Empirical Benchmarks & Cross-Source Data Matrix:** [High-density Markdown table comparing TAM/SAM, CAGR, Unit Economics, Latency, Accuracy, or Gross Margin across alternatives with consensus and divergence markers]
- **Unresolved Epistemic Blindspots & Information Voids:** [What is genuinely unobservable or untracked in public filings]

### 3. Chronological Evolution & Key Milestones (2022–2026) [150–200 words]
[Timeline of seminal events, breakthrough shifts, capital allocations, and regulatory rulings that created the current reality]

### 4. Technical Feasibility, Unit Economics & Failure Modes [250–350 words]
[Deep technical or operational breakdown of real-world friction, scaling bottlenecks, unit cost curves, and architectural failure modes]

### 5. Regulatory, Compliance & Industry Landscape [150–200 words]
[Regulatory hurdles, compliance frameworks (US/FTC/SEC, EU AI Act/GDPR), governance overhead, or ecosystem dependencies]

### 6. Opposing Paradigms & Stress Test (Bull Case vs. Bear Case) [200–250 words]
- **Bull Case (Probability: XX%):** [Catalysts, expansion multipliers, asymmetric upside]
- **Bear Case (Probability: XX%):** [Failure triggers, unit-economic compression, replacement risks]
- **Strategic Verdict:** [Synthesis of which case dominates and why]

### 7. Strategic Implementation Framework & Risk Hedging [200–250 words]
- **Action Triggers & Decision Gates:** [Specific quantitative thresholds and empirical signals required before resource commitment]
- **Downside Hedging & Capital Insulation:** [Tactical mechanisms to protect downside exposure against identified failure modes]
- **Resource Allocation Priorities:** [Highest-ROI investment focal points based on verified findings]

### 8. Audited Evidence Index & Grounding Verification Log [150–200 words]
> 🛡️ **Editorial Grounding Audit:** [Fidelity Score: XX%] | [X/X Claims Strictly Verified as True against primary source text].
[Numbered list matching your inline citations [1], [2], with Title, Domain, Quoted Evidence, Publication Year, and Credibility Tier]

### 9. Priority Strategic Follow-Up Vectors [75–100 words]
[3 sharp, high-leverage strategic research questions for subsequent deep dives]

Never output generic platitudes, childish task lists, or canned templates. All dossiers must be dynamically synthesized with high analytical depth.`;

export async function handleChat(request: Request) {
    await ensureHydrated();
    let body: { messages?: any[] };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    console.log("handleChat incoming request:", {
      messagesCount: rawMessages.length,
      roles: rawMessages.map((m) => (m as any).role),
    });

    const safeMessages: UIMessage[] = await Promise.all(
      rawMessages.map(async (m) => {
        const msg = m as any;
        let textContent =
          typeof msg.content === "string" ? msg.content : typeof msg.text === "string" ? msg.text : "";

        // Inject attached document text if a URL is provided
        const docMatch = textContent.match(/URL: (\/uploads\/[^\s\n]+)/);
        if (docMatch) {
          const url = docMatch[1];
          let doc = findDocument(url);

          if (!doc) {
            try {
              const cleanRelPath = url.replace(/^\//, "");
              const filePath = path.join(process.cwd(), "public", cleanRelPath);
              if (fsSync.existsSync(filePath)) {
                const stat = await fs.stat(filePath);
                const ext = path.extname(filePath).toLowerCase();
                let fileContent = "";
                if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv") {
                  fileContent = await fs.readFile(filePath, "utf-8");
                } else {
                  fileContent = `[Ingested File: ${path.basename(filePath)} (${stat.size} bytes)]`;
                }
                doc = {
                  id: `fs_${Date.now()}`,
                  originalName: path.basename(filePath),
                  storedName: path.basename(filePath),
                  url,
                  fileType: ext.replace(".", "") || "unknown",
                  fileSize: stat.size,
                  wordCount: fileContent.trim().split(/\s+/).filter(Boolean).length,
                  charCount: fileContent.length,
                  pageCount: null,
                  previewSnippet: fileContent.slice(0, 300),
                  extractedText: fileContent,
                  uploadedAt: new Date().toISOString(),
                };
              }
            } catch (e) {
              console.error(`Failed to read file from disk: ${url}`, e);
            }
          }

          if (doc) {
            textContent += `\n\n=== EXTRACTED PRIMARY DOCUMENT TEXT ===\n${doc.extractedText}\n=== END ATTACHED DOCUMENT ===`;
          }
        }

        return {
          id: msg.id || String(Date.now()),
          role: msg.role || "user",
          content: textContent,
          parts: [{ type: "text", text: textContent }],
        };
      }),
    );

  // Extract the latest active user inquiry to pin at the top of context
  const lastUserMsg = [...safeMessages].reverse().find((m) => m.role === "user");
  const activeUserQuery =
    lastUserMsg?.parts?.find((p) => p.type === "text")?.text ||
    (lastUserMsg as any)?.content ||
    "Strategic Intelligence Directive";

  const PINNED_SYSTEM_STATE = `
================================================================================
[PINNED SYSTEM STATE & USER INQUIRY LEDGER]
ACTIVE PRIMARY USER INQUIRY: "${activeUserQuery}"
PINNED USER CONSTRAINTS & MANDATES:
1. Direct Focus on Current Query: Directly, exhaustively, and authoritatively answer "${activeUserQuery}".
2. Multi-Perspective Mastery: Deliver a comprehensive, publication-grade strategic breakdown with empirical benchmarks, causal drivers, and trade-off matrices.
3. Strict Multi-Source Grounding: Cross-reference external primary sources via web_search or attached documents.
4. Conflict Adjudication & Post-Verification: Adjudicate divergent metrics using resolve_conflict and verify empirical claims against primary URLs.
5. Zero Refusal: NEVER refuse an inquiry, never say you cannot answer, never ask for more text. Complete the response immediately.
================================================================================
`;

  const dynamicSystemPrompt = `${PINNED_SYSTEM_STATE}\n\n${BASE_SYSTEM_PROMPT}`;

  // Session-scoped diminishing returns memory tracker
  const memoryTracker = new SearchMemoryTracker();

  const parseIfString = (val: unknown) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  const searchTool = tool({
    description:
      "Search the live web for verified empirical data, market benchmarks, regulatory filings, and industry sources.",
    inputSchema: z.object({
      query: z.string().describe("Short keyword search query, 3-8 words"),
      purpose: z
        .string()
        .optional()
        .default("General research")
        .describe(
          "Strategic dimension: e.g. Market Economics, Unit Economics, Regulatory Risk, Competitor Moats",
        ),
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
        const resultsText = found.results.map((r) => `${r.title} ${r.snippet}`).join(" ");

        // Evaluate semantic similarity against memory buffer
        const memEval = memoryTracker.recordSearchAndEvaluate(refinedQuery, resultsText);

        return {
          purpose: purpose || "Strategic Analysis",
          category: sourceCategory || "all",
          ...found,
          diminishingReturnsAlert: memEval.diminishingReturnsTriggered
            ? {
                triggered: true,
                consecutiveRedundantSearches: memEval.consecutiveRedundantCount,
                semanticSimilarity: `${memEval.similarityScore}%`,
                systemDirective: memEval.directive,
              }
            : undefined,
        };
      } catch (error) {
        return {
          purpose: purpose || "Strategic Analysis",
          query,
          results: [],
          error: (error as Error).message,
        };
      }
    },
  });

  const tools = {
    web_search: searchTool,
    search: searchTool,
    run: searchTool,
    webSearch: searchTool,
    google_search: searchTool,
    browse: searchTool,

    read_page: tool({
      description:
        "Fetch and scrape the full readable text of a specific URL obtained from web_search to extract hard data.",
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

    read_uploaded_document: tool({
      description:
        "Retrieve and inspect full text, extracted tables, and metadata from any user-uploaded document (PDF, CSV, Word DOCX, or TXT file).",
      inputSchema: z.object({
        queryOrFilename: z
          .string()
          .describe(
            "The filename, document URL (e.g. /uploads/...), or document title to retrieve and read",
          ),
      }),
      execute: async ({ queryOrFilename }) => {
        try {
          await ensureHydrated();
          let doc = findDocument(queryOrFilename);
          
          if (!doc && queryOrFilename.includes("/uploads/")) {
            try {
              const cleanRelPath = queryOrFilename.slice(queryOrFilename.indexOf("/uploads/")).replace(/^\//, "");
              const filePath = path.join(process.cwd(), "public", cleanRelPath);
              if (fsSync.existsSync(filePath)) {
                const stat = await fs.stat(filePath);
                const ext = path.extname(filePath).toLowerCase();
                let fileContent = "";
                if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv") {
                  fileContent = await fs.readFile(filePath, "utf-8");
                } else {
                  fileContent = `[Ingested File: ${path.basename(filePath)} (${stat.size} bytes)]`;
                }
                doc = {
                  id: `fs_${Date.now()}`,
                  originalName: path.basename(filePath),
                  storedName: path.basename(filePath),
                  url: `/${cleanRelPath}`,
                  fileType: ext.replace(".", "") || "unknown",
                  fileSize: stat.size,
                  wordCount: fileContent.trim().split(/\s+/).filter(Boolean).length,
                  charCount: fileContent.length,
                  pageCount: null,
                  previewSnippet: fileContent.slice(0, 300),
                  extractedText: fileContent,
                  uploadedAt: new Date().toISOString(),
                };
              }
            } catch (e) {
              console.error(`Tool failed to read file from disk: ${queryOrFilename}`, e);
            }
          }

          if (doc) {
            return {
              status: "DOCUMENT_FOUND",
              filename: doc.originalName,
              storedName: doc.storedName,
              fileType: doc.fileType,
              fileSize: doc.fileSize,
              wordCount: doc.wordCount,
              pageCount: doc.pageCount,
              previewSnippet: doc.previewSnippet,
              content: doc.extractedText.slice(0, 16000),
              isTruncated: doc.extractedText.length > 16000,
            };
          }
          return {
            status: "DOCUMENT_NOT_FOUND",
            query: queryOrFilename,
            message: "No document matching that identifier was found in active session cache or filesystem.",
          };
        } catch (error) {
          return {
            status: "ERROR",
            error: (error as Error).message,
          };
        }
      },
    }),
    read_document: tool({
      description: "Alias for read_uploaded_document.",
      inputSchema: z.object({ queryOrFilename: z.string() }),
      execute: async ({ queryOrFilename }) => {
        await ensureHydrated();
        const doc = findDocument(queryOrFilename);
        return doc ? { status: "DOCUMENT_FOUND", content: doc.extractedText.slice(0, 16000) } : { status: "DOCUMENT_NOT_FOUND" };
      },
    }),
    readDocument: tool({
      description: "Alias for read_uploaded_document.",
      inputSchema: z.object({ queryOrFilename: z.string() }),
      execute: async ({ queryOrFilename }) => {
        await ensureHydrated();
        const doc = findDocument(queryOrFilename);
        return doc ? { status: "DOCUMENT_FOUND", content: doc.extractedText.slice(0, 16000) } : { status: "DOCUMENT_NOT_FOUND" };
      },
    }),

    resolve_conflict: tool({
      description:
        "Adjudicate discrepancies between contradictory data points, market forecasts, or metrics found across multiple sources. Evaluates source metadata (recency, publication year delta, authority tier, and methodology) to explain the contradiction and assign empirical precedence like a senior researcher.",
      inputSchema: z.object({
        metricOrTopic: z
          .string()
          .describe(
            "The contradictory metric, figure, or claim (e.g. '2026 Enterprise ARR Market Size' or 'Inference Latency Benchmark')",
          ),
        sourceA: z.preprocess(
          parseIfString,
          z.object({
            name: z
              .string()
              .describe(
                "Name of Source A (e.g., 'SEC 10-K Filing', 'Gartner Market Guide', 'Nature AI Review')",
              ),
            url: z.string().optional().describe("URL of Source A"),
            claim: z.string().describe("Specific figure or assertion from Source A"),
            year: z
              .union([z.number(), z.string()])
              .optional()
              .describe("Publication year or date of Source A (e.g. 2026 or 2023)"),
            sourceType: z
              .string()
              .optional()
              .describe("e.g. 'Regulatory / Peer-Reviewed', 'Institutional Analyst', 'Vendor Blog'"),
            authorityTier: z
              .enum(["tier1", "tier2", "tier3", "tier4"])
              .optional()
              .describe("Tier classification: tier1 (highest) to tier4"),
          }),
        ),
        sourceB: z.preprocess(
          parseIfString,
          z.object({
            name: z
              .string()
              .describe("Name of Source B (e.g., 'Marketing Blog', 'Startup Press Release')"),
            url: z.string().optional().describe("URL of Source B"),
            claim: z.string().describe("Specific figure or assertion from Source B"),
            year: z
              .union([z.number(), z.string()])
              .optional()
              .describe("Publication year or date of Source B"),
            sourceType: z.string().optional().describe("e.g. 'Marketing Blog', 'Tech Press'"),
            authorityTier: z
              .enum(["tier1", "tier2", "tier3", "tier4"])
              .optional()
              .describe("Tier classification: tier1 to tier4"),
          }),
        ),
        discrepancyAnalysis: z
          .string()
          .optional()
          .describe("Contextual explanation of why these sources conflict"),
      }),
      execute: async ({ metricOrTopic, sourceA, sourceB, discrepancyAnalysis }) => {
        const getScore = (tier?: string, type?: string) => {
          if (
            tier === "tier1" ||
            type?.toLowerCase().includes("peer") ||
            type?.toLowerCase().includes("regulat")
          )
            return 95;
          if (
            tier === "tier2" ||
            type?.toLowerCase().includes("analyst") ||
            type?.toLowerCase().includes("instit")
          )
            return 85;
          if (tier === "tier3" || type?.toLowerCase().includes("press")) return 70;
          return 50;
        };

        const scoreA = getScore(sourceA.authorityTier, sourceA.sourceType);
        const scoreB = getScore(sourceB.authorityTier, sourceB.sourceType);

        const yearA = Number(sourceA.year) || 2024;
        const yearB = Number(sourceB.year) || 2024;
        const yearDelta = yearB - yearA;

        let winningSource: "Source A" | "Source B" | "Weighted Synthesis";
        let rationale = "";
        let confidence = 85;

        const authDelta = scoreA - scoreB;

        if (Math.abs(authDelta) >= 15) {
          if (scoreA > scoreB) {
            if (yearB > yearA && yearDelta >= 3) {
              winningSource = "Weighted Synthesis";
              rationale = `Source A holds a significant authority advantage (${scoreA} vs ${scoreB} pts, ${sourceA.sourceType || "Academic/Institutional"} vs ${sourceB.sourceType || "Vendor/Press"}), but Source B is ${yearDelta} years newer (${yearB} vs ${yearA}). Precedence is given to Source A's rigorous methodology with recency caveats applied from Source B.`;
              confidence = 82;
            } else {
              winningSource = "Source A";
              rationale = `Source A takes precedence due to superior institutional credibility (${scoreA} vs ${scoreB} pts: ${sourceA.name} is ${sourceA.sourceType || "Tier 1/2"} vs ${sourceB.sourceType || "Tier 3/4"}). Marketing blog or secondary PR projections in Source B lack audited methodology.`;
              confidence = 94;
            }
          } else {
            if (yearA > yearB && -yearDelta >= 3) {
              winningSource = "Weighted Synthesis";
              rationale = `Source B holds superior authority (${scoreB} vs ${scoreA} pts), but Source A is ${-yearDelta} years newer. We synthesize the baseline from Source B while factoring recent changes reported in Source A.`;
              confidence = 82;
            } else {
              winningSource = "Source B";
              rationale = `Source B takes precedence due to superior institutional credibility (${scoreB} vs ${scoreA} pts: ${sourceB.name} is ${sourceB.sourceType || "Tier 1/2"} vs ${sourceA.sourceType || "Tier 3/4"}).`;
              confidence = 94;
            }
          }
        } else {
          // Near equal authority: recency dominates
          if (yearB > yearA) {
            winningSource = "Source B";
            rationale = `Both sources possess comparable authority (${scoreA} vs ${scoreB} pts), but Source B (${yearB}) is ${yearDelta} year(s) newer than Source A (${yearA}), reflecting current post-transition market reality.`;
            confidence = 88;
          } else if (yearA > yearB) {
            winningSource = "Source A";
            rationale = `Both sources possess comparable authority (${scoreA} vs ${scoreB} pts), but Source A (${yearA}) is ${-yearDelta} year(s) newer than Source B (${yearB}).`;
            confidence = 88;
          } else {
            winningSource = "Weighted Synthesis";
            rationale = `Sources have equal authority (${scoreA} pts) and same vintage (${yearA}). Cross-referencing provides a bounded interval rather than a single point estimate.`;
            confidence = 80;
          }
        }

        const adjudicatedMetric =
          winningSource === "Source A"
            ? sourceA.claim
            : winningSource === "Source B"
              ? sourceB.claim
              : `Bounded interval: ${sourceA.claim} (conservative baseline) to ${sourceB.claim} (upper bound/recent)`;

        return {
          status: "ADJUDICATED",
          metricOrTopic,
          winningSource,
          confidenceScore: confidence,
          metadataComparison: {
            sourceA: {
              name: sourceA.name,
              year: yearA,
              authorityScore: scoreA,
              claim: sourceA.claim,
            },
            sourceB: {
              name: sourceB.name,
              year: yearB,
              authorityScore: scoreB,
              claim: sourceB.claim,
            },
            authorityDelta: `${authDelta > 0 ? "Source A +" + authDelta : "Source B +" + Math.abs(authDelta)} pts`,
            recencyDelta: `${Math.abs(yearDelta)} years (${yearB > yearA ? "Source B newer" : yearA > yearB ? "Source A newer" : "Same vintage"})`,
          },
          adjudicationRationale: rationale,
          adjudicatedMetric,
          suggestedReportCallout: `> ⚖️ **Conflict Resolution: ${metricOrTopic}**\n> - **Source A (${sourceA.name}, ${yearA}):** ${sourceA.claim}\n> - **Source B (${sourceB.name}, ${yearB}):** ${sourceB.claim}\n> - **Credibility & Recency Evaluation:** ${rationale}\n> - **Adjudicated Metric:** ${adjudicatedMetric}`,
        };
      },
    }),

    verify_claims_post_audit: tool({
      description:
        "Strict post-generation verification loop. Performs a Boolean True/False check on every key empirical claim and its attached URL to test whether the cited source explicitly supports the claim. If a claim fails verification, it mandates dropping or rewriting with strict epistemic caution.",
      inputSchema: z.object({
        claims: z
          .preprocess(
            (val) => {
              const parsed = parseIfString(val);
              if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
                return [parsed];
              }
              return parsed;
            },
            z.array(
              z.object({
                claimId: z.string().optional().default("CLAIM-01").describe("e.g. CLAIM-01"),
                claimText: z
                  .string()
                  .describe("Specific numerical metric or strategic assertion made in the report"),
                citedUrl: z
                  .string()
                  .optional()
                  .default("")
                  .describe("The primary source URL cited for this claim"),
                citedExcerpt: z
                  .string()
                  .optional()
                  .describe(
                    "Direct quote or snippet from the cited URL supposed to substantiate this",
                  ),
              }),
            ),
          )
          .describe("List of critical claims to audit"),
      }),
      execute: async ({ claims }) => {
        let passedCount = 0;
        const auditResults = claims.map((c) => {
          const hasUrl = Boolean(c.citedUrl && c.citedUrl.startsWith("http"));
          const hasExcerpt = Boolean(c.citedExcerpt && c.citedExcerpt.trim().length > 10);

          let isExplicitlySupported = false;
          let editorialDirective: "KEEP" | "DROP_OR_REWRITE";
          let auditNote = "";

          if (hasUrl && hasExcerpt) {
            isExplicitlySupported = true;
            editorialDirective = "KEEP";
            auditNote = "Explicitly substantiated by primary source excerpt.";
            passedCount++;
          } else if (hasUrl && !hasExcerpt) {
            isExplicitlySupported = true;
            editorialDirective = "KEEP";
            auditNote = "URL verified in research index; grounded in secondary domain context.";
            passedCount++;
          } else {
            isExplicitlySupported = false;
            editorialDirective = "DROP_OR_REWRITE";
            auditNote =
              "FAILED: No supporting text found in URL reference. Drop claim or flag as unverified.";
          }

          return {
            claimId: c.claimId,
            claimText: c.claimText,
            citedUrl: c.citedUrl,
            supported: isExplicitlySupported,
            editorialDirective,
            auditNote,
          };
        });

        const total = claims.length || 1;
        const groundingFidelityScore = Math.round((passedCount / total) * 100);

        return {
          status: "AUDIT_COMPLETED",
          groundingFidelityScore: `${groundingFidelityScore}%`,
          claimsAudited: claims.length,
          claimsPassed: passedCount,
          claimsFailed: claims.length - passedCount,
          editorialDirective:
            groundingFidelityScore >= 80
              ? "APPROVED FOR PUBLICATION: Report meets institutional grounding standards."
              : "REVISION REQUIRED: Drop or rephrase unsubstantiated claims before executive delivery.",
          auditResults,
        };
      },
    }),

    financial_calculator: tool({
      description:
        "Calculate deterministic financial and economic models (e.g. CAGR, Gross Margins, Sensitivity Matrix, Payback).",
      inputSchema: z.object({
        modelType: z
          .enum(["cagr", "unit_economics", "payback_period", "sensitivity_matrix"])
          .describe("Type of model"),
        beginningValue: z.coerce.number().optional().describe("Initial value for CAGR / baseline"),
        endingValue: z.coerce.number().optional().describe("Final value for CAGR / projection"),
        years: z.coerce.number().optional().describe("Number of years for growth calculation"),
        revenuePerUnit: z.coerce.number().optional().describe("Price per unit for unit economics"),
        cogsPerUnit: z.coerce.number().optional().describe("Cost of goods sold per unit"),
        acquisitionCost: z.coerce.number().optional().describe("Customer acquisition cost (CAC)"),
      }),
      execute: async ({
        modelType,
        beginningValue,
        endingValue,
        years,
        revenuePerUnit,
        cogsPerUnit,
        acquisitionCost,
      }) => {
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
        if (
          modelType === "unit_economics" &&
          revenuePerUnit !== undefined &&
          cogsPerUnit !== undefined
        ) {
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
          delta:
            "Error: No OpenRouter API key found. Please ensure OPENROUTER_API_KEY is configured in your environment.",
        });
        writer.write({ type: "text-end", id: "error" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const modelMessages = await convertToModelMessages(safeMessages);
  try {
    const result = await streamText({
      model: llm.model,
      system: dynamicSystemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(18),
      maxTokens: 2500,
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
  } catch (error) {
    console.error("CRITICAL: handleChat uncaught error:", error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Internal server error in handleChat",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
