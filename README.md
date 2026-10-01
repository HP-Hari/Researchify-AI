# Researchify AI

> **Autonomous Enterprise Strategic Intelligence Engine**  
> Bridgewater & McKinsey-grade recursive research decomposition, live 4-tier empirical grounding, deterministic economic modeling, interactive scenario visualizers, and boardroom-ready executive dossiers.

---

## Overview

**Researchify AI** transforms unstructured strategic inquiries into institutional-grade decision intelligence. Rather than operating as a conventional single-turn conversational chatbot (like ChatGPT, Gemini, or Perplexity), Researchify deploys an autonomous planning loop that recursively decomposes complex theses into orthogonal vectors (Market Economics, Unit Feasibility, Regulatory / Antitrust Moats, and Bear-Case Stress Tests).

It executes multi-angle empirical searches, classifies sources into institutional credibility tiers, calculates deterministic financial metrics (CAGR, gross margins, CAC payback), and streams a structured executive dossier featuring an interactive Conviction Gauge, Recharts scenario models, an Evidence Grounding Drawer, and a 1-page C-Suite Executive Memo.

---

## Technical Stack

| Layer | Technology | Version | Purpose & Technical Rationale |
|:---|:---|:---|:---|
| **Meta-Framework** | [TanStack Start](https://tanstack.com/start) | `^1.168.32` | Full-stack React framework with SSR, file-based routing, and zero-waterfall server functions |
| **Runtime & Bundler** | [Vite](https://vite.dev) / Rolldown | `8.1.5` | Instant HMR development server and production asset code-splitting |
| **Server Engine** | [Nitro](https://nitro.build) | `3.0-beta` | Universal Node/Edge server runtime handling SSR rendering and SSE endpoints |
| **UI Library** | [React](https://react.dev) | `19.2.0` | React 19 concurrent rendering, server-aware lifecycle management, and transitions |
| **Type System** | [TypeScript](https://www.typescriptlang.org) | `^5.8.3` | Strict end-to-end type safety across client, server functions, and tool schemas |
| **Styling Engine** | [Tailwind CSS](https://tailwindcss.com) | `^4.2.1` | Next-gen CSS engine utilizing perceptual `oklch` color spaces and CSS variables |
| **Component Primitives** | [Radix UI](https://radix-ui.com) | Latest | Accessible, unstyled headless primitives (Dialog, Popover, Dropdown, Tabs) |
| **Visual Analytics** | [Recharts](https://recharts.org) | `^2.15.4` | Composable SVG data visualizations (Scenario Area Charts, Sensitivity Bar Charts) |
| **Motion & Micro-interactions** | [Motion](https://motion.dev) | `^13.4.4` | Hardware-accelerated transitions, tree expansions, and drawer slide animations |
| **AI Orchestration** | [Vercel AI SDK](https://sdk.vercel.ai) | `^7.0.122` | Multi-step agentic loop (`streamText`), tool execution pipeline, and UI message streaming |
| **LLM Inference** | [OpenRouter](https://openrouter.ai) & Direct Providers | SDK v3.1 | Universal model gateway with native 3-model failover array (`openrouter/free`, `dots-3-note`, `nemotron-3.5`) |
| **Live Web Scraping** | [Cheerio](https://cheerio.js.org) | `^1.2.0` | High-throughput server-side DOM parsing and cleaned text extraction |
| **Zero-Config Search** | DuckDuckGo HTML Engine | Custom | Zero-API-key web scraping engine with targeted domain and category syntax |
| **Markdown Rendering** | [Streamdown](https://github.com/nicepkg/streamdown) | `^2.6.0` | Real-time SSE streaming markdown parser with Shiki syntax highlighting and math rendering |
| **Icons & Notifications** | [Lucide React](https://lucide.dev) & [Sonner](https://sonner.emilkowal.dev) | `^0.575` / `^2.0` | Clean iconography and non-blocking accessible toast feedback |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT RUNTIME (Browser)                                │
│                                                                                        │
│  ┌──────────────────────┐   ┌───────────────────────────────────────────────────────┐  │
│  │   Search & Lenses    │──▶│                 ChatWindow Orchestrator               │  │
│  │ (PromptInput / Lenses│   │             (useChat + Server-Sent Events)            │  │
│  └──────────────────────┘   └──────────────────────────┬────────────────────────────┘  │
│                                                        │                               │
│         ┌──────────────────────────────────────────────┼───────────────────────────┐   │
│         ▼                                              ▼                           ▼   │
│  ┌───────────────────────┐   ┌──────────────────────────────┐   ┌───────────────────┐  │
│  │ DossierVisualizer.tsx │   │     EvidenceDrawer.tsx       │   │ExecutiveMemoView  │  │
│  │  - Conviction Meter   │   │  - 4-Tier Source Hierarchy   │   │ - BLUF Summary    │  │
│  │  - Recharts Area/Bars │   │  - Verified Quoted Excerpts  │   │ - Decision Matrix │  │
│  │  - Fatal Vulnerability│   │  - One-Click Citation Copy   │   │ - 30-60-90 Gates  │  │
│  └───────────────────────┘   └──────────────────────────────┘   └───────────────────┘  │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ POST /api/chat (SSE Stream)
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│                           SERVER RUNTIME (Nitro / Node SSR)                            │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                 Autonomous Strategic Planner (src/lib/chat.server.ts)            │  │
│  │  - McKinsey/Bridgewater Dossier Prompt Blueprint (9 Strict Sections)             │  │
│  │  - Multi-Step Dynamic Tool Execution (isStepCount: 16)                           │  │
│  │  - Resilient Model Gateway (3-Model Free Failover Array)                         │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │ Invokes Tools
│                 ┌───────────────────────┼────────────────────────┐
│                 ▼                       ▼                        ▼
│      ┌─────────────────────┐  ┌───────────────────┐  ┌───────────────────────┐
│      │     web_search      │  │     read_page     │  │  financial_calculator │
│      │ Category filtering: │  │ Scrapes deep URL  │  │ Deterministic Math:   │
│      │ SEC, Analyst, ArXiv │  │ page content      │  │ CAGR, Margins, CAC    │
│      └──────────┬──────────┘  └─────────┬─────────┘  └───────────┬───────────┘
│                 │                       │                        │
│                 ▼                       ▼                        ▼
│      ┌───────────────────────────────────────────────────────────────────────┐
│      │        Institutional Credibility Tiering Engine (firecrawl.server.ts) │
│      │  • Tier 1: Regulatory / Academic (SEC, FTC, .gov, .edu, ArXiv, PubMed)│
│      │  • Tier 2: Institutional Analysts (Bloomberg, Reuters, McKinsey, Bain)│
│      │  • Tier 3: Industry & Specialized Press (TechCrunch, Wired, Verge)    │
│      │  • Tier 4: Verified Open Web Sources                                  │
│      └───────────────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Functionalities & Features

### 1. Autonomous Vector Decomposition
Instead of writing an immediate off-the-cuff response, the engine breaks strategic queries into distinct inquiry vectors (e.g. Unit Economics, Market Sizing, Regulatory Headwinds, Bear-Case Catalysts) and triggers targeted web searches with category filtering (`regulatory_sec`, `financial_analyst`, `academic_research`).

### 2. 4-Tier Credibility Verification Engine
Every URL discovered during research is classified into a structured credibility hierarchy:
- **Tier 1 (Regulatory & Peer-Reviewed):** Official government filings, legal registries, and academic repositories (`sec.gov`, `ftc.gov`, `arxiv.org`, `.gov`, `.edu`).
- **Tier 2 (Institutional Market Analyst):** Premier financial intelligence (`bloomberg.com`, `reuters.com`, `mckinsey.com`, `statista.com`, `spglobal.com`).
- **Tier 3 (Specialized Industry Press):** Technical and venture reporting (`techcrunch.com`, `wired.com`, `theverge.com`).
- **Tier 4 (Verified Web Sources):** Curated public domain intelligence.

### 3. Interactive Dossier Visualizer & Conviction Index
- **Conviction Index Gauge:** Dynamically extracts the synthesized conviction score (0–100%) and displays a radial conviction badge.
- **Recharts Scenario Modeling:** Automatically parses Markdown financial tables and projection paragraphs into interactive SVG charts (Scenario Projections Area Chart and Probability-Weight Horizontal Bar Chart).
- **Fatal Vulnerability Card:** Highlights red-team operational and structural downfalls in a dedicated callout banner.

### 4. Interactive Grounding & Evidence Drawer
Slide-out inspection panel providing comprehensive transparency:
- Filter citations by credibility tier (Tier 1 to Tier 4).
- Real-time search filter across titles, domains, and extracted snippets.
- Copy formal academic/business citations directly to the clipboard.
- Direct external links to primary sources.

### 5. 1-Page C-Suite Executive Memo Toggle
Executives can switch views via the report toolbar:
- **Full Dossier:** Comprehensive 9-section deep dive.
- **Executive Memo (1-Page):** Formats the dossier into a crisp executive brief featuring Bottom Line Up Front (BLUF), Strategic Verdict, Fatal Vulnerability trigger, and 30-60-90 Day Execution Gates.
- **Visual Analytics:** Isolates Recharts data projections and scenario weightings.

### 6. Multi-Format Boardroom Exports
- **CSV Data Download:** One-click extraction of Markdown comparison tables into clean CSV spreadsheets.
- **Markdown Export:** Formatted Markdown file download with YAML metadata.
- **Print / Boardroom PDF:** Clean CSS print stylesheet configured with page breaks, isolated iframes, and print-ready typography.

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **npm**, **pnpm**, or **bun**

### 1. Clone & Install
```bash
git clone https://github.com/HP-Hari/Researchify-AI.git
cd Researchify-AI
npm install
```

### 2. Configure Environment (Optional)
The application includes an embedded zero-config fallback key with native multi-model routing that works out-of-the-box. To configure your own keys or preferred models:

```bash
cp .env.example .env
```

```env
# Optional: Provide your own OpenRouter key (works with free or paid tiers)
OPENROUTER_API_KEY="sk-or-v1-..."

# Optional: Specify preferred model (defaults to openrouter/free with 3-model failover)
OPENROUTER_MODEL="openrouter/free"

# Optional: Direct Gemini API key
GEMINI_API_KEY="AIza..."

# Optional: Direct OpenAI API key
OPENAI_API_KEY="sk-..."
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 4. Production Build & Typecheck
```bash
npx tsc --noEmit
npm run build
npm run start
```

---

## Project Structure

```
Researchify-AI/
├── src/
│   ├── components/
│   │   ├── ai-elements/               # Streaming conversation primitives (Message, PromptInput)
│   │   ├── research/
│   │   │   ├── ChatWindow.tsx         # Main research orchestrator & SSE streaming client
│   │   │   ├── DossierVisualizer.tsx  # Dynamic Recharts area/bar charts & Conviction Gauge
│   │   │   ├── EvidenceDrawer.tsx     # Slide-out 4-tier primary source evidence drawer
│   │   │   ├── ExecutiveMemoView.tsx  # 1-Page C-Suite Memo view (BLUF, Verdict, 30-60-90 Gates)
│   │   │   ├── ReportToolbar.tsx      # View switcher, CSV export, Markdown download, Print/PDF
│   │   │   ├── SearchResultCard.tsx   # Live tool-call indicators & financial calc results
│   │   │   └── ApiKeyModal.tsx        # Client-side custom API key management
│   │   └── ui/                        # Radix UI primitives (Button, Dialog, Popover, Tabs)
│   ├── hooks/
│   │   └── use-theme.ts               # Theme provider (light/dark/system)
│   ├── lib/
│   │   ├── chat.server.ts             # Autonomous multi-angle planner, tools, model router
│   │   ├── firecrawl.server.ts        # DuckDuckGo HTML scraping & 4-tier credibility classifier
│   │   ├── threads.ts                 # Local storage thread persistence & session manager
│   │   └── utils.ts                   # Utility functions & class merging
│   ├── routes/
│   │   ├── __root.tsx                 # Root layout, HTML meta, theme hydration script
│   │   ├── index.tsx                  # Strategic research entry & query composer
│   │   ├── chat.$threadId.tsx         # Active research thread route
│   │   └── api/chat.ts                # POST /api/chat Server-Sent Events endpoint
│   ├── server.ts                      # SSR production entry point
│   └── styles.css                     # Design tokens (oklch), Recharts styling, print CSS
├── Dockerfile                         # Multi-stage production container build
├── package.json                       # Dependencies & build scripts
├── tsconfig.json                      # Strict TypeScript compiler options
└── vite.config.ts                     # Vite + TanStack Start configuration
```

---

## Deployment

### Docker Deployment
```bash
docker build -t researchify-ai .
docker run -p 8080:8080 researchify-ai
```

### Cloud Platforms (Render, Railway, Fly.io, Cloud Run)
- **Render / Railway:** Connect your GitHub repository. The application will build via `npm run build` and launch using `npm run start` or Docker automatically.
- **Port:** The server automatically binds to `process.env.PORT` or defaults to `8080`.

---

## License

This project is licensed under the [MIT License](LICENSE).
