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
          const openrouter = createOpenRouter({ apiKey: key });
          return { model: openrouter("google/gemini-2.5-flash-lite"), name: "openrouter (user)" };
        }
        if (key.startsWith("sk-")) {
          const openai = createOpenAI({ apiKey: key });
          return { model: openai("gpt-4o-mini"), name: "gpt-4o-mini (user)" };
        }
      }
    }
  }

  const openrouterKeys = (process.env["OPENROUTER_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && (k.startsWith("sk-or-") || k.startsWith("sk-")) && !isRevokedKey(k));
  if (openrouterKeys.length > 0) {
    const selectedKey = openrouterKeys[Math.floor(Math.random() * openrouterKeys.length)];
    const openrouter = createOpenRouter({ apiKey: selectedKey });
    return { model: openrouter("google/gemini-2.5-flash-lite"), name: "openrouter/gemini-2.5-flash-lite" };
  }

  const geminiKeys = (process.env["GEMINI_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20);
  if (geminiKeys.length > 0) {
    const selectedKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)];
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
    const selectedKey = openaiKeys[Math.floor(Math.random() * openaiKeys.length)];
    const openai = createOpenAI({ apiKey: selectedKey });
    return { model: openai("gpt-4o-mini"), name: "gpt-4o-mini" };
  }

  const anthropicKeys = (process.env["ANTHROPIC_API_KEY"] || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && k.startsWith("sk-ant-"));
  if (anthropicKeys.length > 0) {
    const selectedKey = anthropicKeys[Math.floor(Math.random() * anthropicKeys.length)];
    const anthropic = createAnthropic({ apiKey: selectedKey });
    return { model: anthropic("claude-3-5-haiku-20241022"), name: "claude-3-5-haiku" };
  }

  return null;
}

const SYSTEM_PROMPT = `You are Researchify AI, an elite autonomous research intelligence engine.

EXECUTION INSTRUCTIONS:
1. When real-world evidence, recent statistics, or external data is needed, perform AT MOST ONE targeted web search using the web_search tool.
2. Immediately after receiving search results (or right away if no search is required), synthesize and write your complete, comprehensive research dossier in clean markdown. Never call tools repeatedly without synthesizing.
3. Structure your research dossier clearly:
   - # [Title of Research Dossier]
   - > 🎯 **Executive Verdict:** [Direct, unambiguous answer, key strategic stance, and primary deciding factor]
   - ### 1. Core Synthesis & Findings
   - ### 2. Chronological Evolution & Timeline (2022–2026)
   - ### 3. In-Depth Analysis (Opportunities vs. Critical Risks)
   - ### 4. Deep-Dive Findings by Sub-Question
   - ### 5. Actionable Next Steps & Decision Framework
   - ### 6. Related Strategic Questions
4. Never ask the user for permission. Always deliver the complete, thorough dossier directly in clean markdown.`;

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
        "Search the live web for verified empirical data, market benchmarks, and industry sources.",
      inputSchema: z.object({
        query: z.string().describe("Short keyword search query, 3-8 words"),
        purpose: z.string().optional().default("General research").describe("Sub-question this search serves"),
        limit: z.coerce.number().optional().default(5).describe("How many results to return"),
      }),
      execute: async ({ query, purpose, limit }) => {
        try {
          const found = await searchWeb(query, Math.min(Math.max(Number(limit) || 5, 2), 6));
          return { purpose: purpose || "Research", ...found };
        } catch (error) {
          return { purpose: purpose || "Research", query, results: [], error: (error as Error).message };
        }
      },
    }),
    read_page: tool({
      description: "Fetch the full readable text of a specific URL obtained from web_search.",
      inputSchema: z.object({
        url: z.string().describe("Absolute http(s) URL of the page to read"),
      }),
      execute: async ({ url }) => {
        try {
          return await readPage(url);
        } catch (error) {
          return { url, title: url, content: "", error: (error as Error).message };
        }
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
    stopWhen: isStepCount(6),
    maxTokens: 3500,
    maxRetries: 2,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });
}
