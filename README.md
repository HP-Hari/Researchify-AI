# Researchify AI

> **Autonomous Research Intelligence Engine**
> Multi-perspective strategic research with live web evidence gathering, adversarial verdict analysis, and structured dossier generation.

---

## Overview

Researchify AI is a full-stack research intelligence application that decomposes complex questions into parallel investigation branches, scrapes live web sources, and synthesizes structured research dossiers with adversarial analysis (Bull Case vs. Bear Case). It produces executive verdicts, chronological timelines, source-conflict analysis, and actionable decision frameworks — all backed by verifiable web citations.

---

## Technical Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Framework** | [TanStack Start](https://tanstack.com/start) v1.168 | Full-stack React meta-framework with SSR, file-based routing, and server functions |
| **Runtime** | [Vite](https://vite.dev) v8.1 | Dev server, HMR, and production bundler |
| **Server** | [Nitro](https://nitro.build) v3.x | Universal server engine (handles SSR + API routes) |
| **Language** | TypeScript 5.8 | End-to-end type safety |
| **UI Library** | React 19 | Component rendering |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) v4.2 | Utility-first CSS with oklch color system |
| **Component Primitives** | [Radix UI](https://radix-ui.com) | Accessible, unstyled headless UI components |
| **Animations** | [Motion](https://motion.dev) (Framer Motion v13) | Layout animations, enter/exit transitions |
| **Icons** | [Lucide React](https://lucide.dev) | Tree-shakable SVG icon set |
| **AI SDK** | [Vercel AI SDK](https://sdk.vercel.ai) v7 | Unified streaming interface for LLM tool-calling and SSE transport |
| **LLM Provider** | Google Generative AI (Gemini Flash series) | Inference backend via `@ai-sdk/google` |
| **Web Scraping** | [Cheerio](https://cheerio.js.org) v1.2 | Server-side HTML parsing for search result extraction |
| **Search Engine** | DuckDuckGo HTML | Zero-API-key web search via HTML scraping |
| **State Management** | [TanStack Query](https://tanstack.com/query) v5 | Server state caching and synchronization |
| **Markdown Rendering** | [Streamdown](https://github.com/nicepkg/streamdown) v2.6 | Streaming-aware markdown renderer with code highlighting (Shiki), math, mermaid |
| **Notifications** | [Sonner](https://sonner.emilkowal.dev) v2 | Toast notification system |
| **Containerization** | Docker (multi-stage Alpine) | Production deployment |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌──────────┐  ┌────────────────────┐  ┌─────────────────────┐  │
│  │PromptInput│→│   ChatWindow.tsx    │→│BranchingInvestigation│  │
│  │          │  │  (useChat + SSE)    │  │   Graph.tsx (SVG)    │  │
│  └──────────┘  └────────────────────┘  └─────────────────────┘  │
│                         │ SSE Stream                             │
├─────────────────────────┼───────────────────────────────────────┤
│                   Server (Nitro/SSR)                             │
│                         │                                       │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │              /api/chat  (POST → SSE)                     │    │
│  │                                                          │    │
│  │  ┌──────────────┐    ┌────────────────────────────────┐  │    │
│  │  │ Model Router  │───│ LLM Pool (round-robin +        │  │    │
│  │  │ (selectModel) │   │ cooldown circuit breaker)       │  │    │
│  │  └──────────────┘    └────────────────────────────────┘  │    │
│  │         │                                                │    │
│  │  ┌──────▼─────────────────────────────────────────────┐  │    │
│  │  │ Tool Execution Layer (AI SDK tool() calls)          │  │    │
│  │  │  ├─ web_search → firecrawl.server.ts → DuckDuckGo  │  │    │
│  │  │  └─ read_page  → firecrawl.server.ts → fetch+parse │  │    │
│  │  └────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User submits a research question via `PromptInput`
2. `ChatWindow` sends a POST to `/api/chat` using AI SDK's `DefaultChatTransport`
3. Server selects a healthy model from the pool (`selectModel()` with cooldown-based circuit breaker)
4. `streamText()` begins streaming, the LLM emits a research plan then invokes `web_search` / `read_page` tools
5. `web_search` tool scrapes DuckDuckGo HTML results using Cheerio, extracts titles, URLs, and snippets
6. `read_page` tool fetches and parses individual page content for deep evidence
7. LLM synthesizes findings into a structured 9-section research dossier
8. Client renders the streaming response as formatted markdown with the branching investigation graph

### Model Pool & Circuit Breaker

The server maintains an in-memory pool of model identifiers. On each request, `selectModel()` picks the next healthy model via round-robin. If a model returns a rate-limit or error, `markModelCooling()` puts it on a 3-minute cooldown. The pool self-heals as cooldowns expire.

---

## Core Features

### Branching Investigation Graph
Interactive SVG-based visualization that renders the research decomposition tree in real time. Each branch represents a search angle with its discovered sources displayed as clickable leaf nodes. Supports two view modes: **Neural Tree** (animated SVG bezier graph) and **Evidence Matrix** (structured card layout).

### Verdict Analysis (Bull Case vs. Bear Case)
Every research dossier includes an adversarial analysis section that presents the strongest supporting evidence alongside counter-evidence and critical risks, concluding with a decisive risk verdict.

### Research Dossier Structure
Each generated report follows a 9-section structure:
1. Executive Verdict (direct answer with confidence index)
2. Core Synthesis & Findings
3. Chronological Evolution Timeline (2022–2026)
4. Verdict Analysis (Bull/Bear case)
5. Deep-Dive Findings by Sub-Question
6. Where Sources Disagree & Contradictions
7. Confidence Assessment & Unverified Gaps
8. Primary Source Indices & Verified Citations
9. Related Strategic Questions (3 contextual follow-ups)

### Export Tools
- **Copy** — Full markdown to clipboard
- **Export .MD** — Downloads the dossier as a `.md` file with YAML frontmatter metadata
- **PDF** — Renders a print-optimized HTML document in an isolated iframe for multi-page Save-as-PDF export

### Dark / Light Mode
Built-in theme switcher with `Light`, `Dark`, and `System` modes. Uses oklch color space for perceptually uniform theming. Anti-FOUC handled via inline script in `<head>`.

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **npm**, **pnpm**, or **bun**
- A Gemini API key (set as environment variable)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/researchify-ai.git
cd researchify-ai
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Add your API key to `.env`:
```env
GEMINI_API_KEY="your_api_key_here"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Project Structure

```
researchify-ai/
├── src/
│   ├── components/
│   │   ├── ai-elements/           # Streaming conversation primitives (Message, Prompt, Tool)
│   │   ├── research/
│   │   │   ├── BranchingInvestigationGraph.tsx  # SVG investigation tree + evidence matrix
│   │   │   ├── ChatWindow.tsx                    # Main chat orchestrator (useChat, SSE)
│   │   │   ├── ReportToolbar.tsx                 # Copy / Export / PDF toolbar
│   │   │   └── SearchResultCard.tsx              # Search result display components
│   │   └── ui/                    # Base UI primitives (Radix-based)
│   ├── hooks/
│   │   └── use-theme.ts           # Theme provider (light/dark/system)
│   ├── lib/
│   │   ├── chat.server.ts         # LLM orchestration, model pool, system prompt, tool definitions
│   │   ├── firecrawl.server.ts    # Web scraping engine (DuckDuckGo HTML + Cheerio)
│   │   ├── threads.ts             # Client-side localStorage thread persistence
│   │   └── utils.ts               # Utility helpers (cn/classnames)
│   ├── routes/
│   │   ├── __root.tsx             # Root layout, SEO meta, font loading, theme init
│   │   ├── index.tsx              # Landing / thread selector route
│   │   ├── chat.$threadId.tsx     # Active research session route
│   │   └── api/chat.ts            # POST /api/chat → SSE streaming endpoint
│   ├── server.ts                  # SSR entry point (error boundary wrapper)
│   └── styles.css                 # Design tokens (oklch), typography, print/PDF styles
├── .env.example                   # Environment variable template
├── Dockerfile                     # Multi-stage production build (Node 20 Alpine)
├── docker-compose.yml             # Container orchestration config
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite + TanStack Start configuration
└── tsconfig.json                  # TypeScript compiler configuration
```

---

## Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start Vite dev server with HMR (default port 8080) |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npx tsc --noEmit` | Type-check without emitting files |

---

## Deployment

### Docker
```bash
# Build and run
docker compose up --build -d

# Or build manually
docker build -t researchify-ai .
docker run -p 8080:8080 -e GEMINI_API_KEY="your_key" researchify-ai
```

### Platform Deployment
The Docker image is compatible with:
- **Railway** — Connect GitHub repo, auto-deploys from Dockerfile
- **Render** — Web Service with Docker runtime
- **Fly.io** — `fly launch` auto-detects Dockerfile
- **Google Cloud Run** — Container-based serverless

Set `GEMINI_API_KEY` as an environment variable in your hosting provider's dashboard.

---

## Environment Variables

| Variable | Required | Description |
|:---|:---|:---|
| `GEMINI_API_KEY` | Yes | API key for the LLM inference backend |
| `PORT` | No | Server port (default: `8080`) |
| `APP_URL` | No | Public URL of the application |

---

## License

This project is licensed under the [MIT License](LICENSE).
