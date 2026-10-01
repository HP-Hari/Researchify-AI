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
│         ┌───────────────────┬──────────────────────────┼───────────────────────────┐   │
│         ▼                   ▼                          ▼                           ▼   │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────────────────────┐   ┌───────────────┐
│  │SystemState-  │   │Conflict-      │   │     EvidenceDrawer.tsx       │   │ExecutiveMemo- │
│  │ChecklistCard │   │ResolutionCard │   │  - 4-Tier Source Hierarchy   │   │View.tsx       │
│  │- Ledger Verif│   │- Metadata/Year│   │  - Authority Score / Year    │   │- BLUF Summary │
│  │- Constraints │   │- Adjudication │   │  - One-Click Citation Copy   │   │- Action Gates │
│  └──────────────┘   └───────────────┘   └──────────────────────────────┘   └───────────────┘
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ POST /api/chat (SSE Stream)
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│                           SERVER RUNTIME (Nitro / Node SSR)                            │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                 Autonomous Strategic Engine (src/lib/chat.server.ts)             │  │
│  │  - Pinned System State & User Inquiry Ledger (Pinned at Context Top)             │  │
│  │  - McKinsey/Bridgewater Dossier Blueprint (Strict Section Word Budgets)          │  │
│  │  - SearchMemoryTracker (>85% Overlap Diminishing Returns Hard Stop)              │  │
│  │  - Resilient Model Gateway (3-Model Free Failover Array)                         │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │ Autonomous Tool Invocations
│       ┌───────────────────────┬─────────┴───────────────┬────────────────────────┐
│       ▼                       ▼                         ▼                        ▼
│  ┌──────────────┐    ┌─────────────────┐       ┌─────────────────┐      ┌────────────────┐
│  │  web_search  │    │resolve_conflict │       │verify_claims_   │      │   read_page    │
│  │Memory Tracker│    │Metadata: Year,  │       │post_audit       │      │  Deep Scraper  │
│  │Stop @ 3 Loops│    │Tier & Recency   │       │Boolean T/F Audit│      │Cleaned Text DOM│
│  └──────────────┘    └─────────────────┘       └─────────────────┘      └────────────────┘
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Enterprise Functionalities & Research Modules

### 1. Dedicated Conflict Resolution Module (`resolve_conflict`)
When research uncovers conflicting data points, market sizes, or growth forecasts across disparate sources, the autonomous engine does not guess or average blindly. It invokes the Conflict Resolution Module to evaluate source metadata:
- **Recency & Publication Year Delta:** Evaluates whether Source B is 3+ years newer, reflecting post-transition reality.
- **Authority Score & Tier Ranking:** Weighs Tier 1 Peer-Reviewed/Regulatory sources (95/100) against Tier 4 Marketing Blogs/PR (50/100).
- **Methodological Rigor:** Distinguishes audited SEC filings and empirical surveys from unverified top-of-funnel vendor projections.
- **Analyst Adjudication Output:** Generates human-grade conflict adjudication callouts detailing the credibility evaluation and definitive metric.

### 2. Strict Hierarchical Compression & Section Word Budgets
To prevent verbose, rambling AI outputs, Researchify AI enforces strict sub-section word budgets:
- **Executive Verdict & Decision Matrix:** ~75 words
- **Section 1. Executive Summary & BLUF:** 150–200 words
- **Section 2. Strategic Synthesis & High-Order Implications:** 300–400 words
- **Section 3. Chronological Evolution (2022–2026):** 150–200 words
- **Section 4. Technical Feasibility & Unit Economics:** 250–350 words
- **Section 5. Regulatory, Compliance & Antitrust:** 150–200 words
- **Section 6. Bull Case vs. Bear Case Stress Test:** 200–250 words
- **Section 7. Strategic Decision Framework & Risk Hedging:** 200–250 words
- **Section 8. Audited Evidence Index & Grounding Log:** 150–200 words
- **Section 9. Priority Strategic Follow-Up Vectors:** 75–100 words
- **Total Dossier Budget:** 1,600–1,900 words maximum.
- **Hierarchical Information Pruning:** Facts are ranked by relevance to the query. Tier 1 causal drivers are retained; Tier 2 metrics are compressed into comparison tables; Tier 3 marketing noise and introductory platitudes are aggressively purged.

### 3. Strict Editorial Post-Verification Loop (`verify_claims_post_audit`)
Before delivering the dossier, a strict editorial verification pass audits every key empirical assertion:
- Extracts critical numerical metrics and claims alongside cited URLs.
- Executes a Boolean True/False check on whether the cited primary source explicitly substantiates the claim.
- If a claim fails verification, the engine drops the claim or flags it with explicit epistemic caution.
- Computes an aggregate **Grounding Fidelity Score** (e.g. 95%) displayed in the evidence index and UI cards.

### 4. Writing Phase Transformation: Synthesis & Implications
Instead of passively summarizing search results, the writing phase mandates high-order strategic synthesis:
- **Core Driving Factors:** Identifies the macroeconomic, capital, or architectural forces driving the data.
- **Asymmetric Trade-Offs:** Uncovers what is structurally sacrificed for every gain (e.g. latency vs accuracy, open ecosystem vs regulatory compliance).
- **Cross-Source Benchmark Matrix:** High-density Markdown comparison table highlighting consensus and divergence.
- **Unresolved Epistemic Blindspots:** Isolates what is genuinely unobservable from public filings.

### 5. Persistent System State & Verification Checklist
- **Context Pinned Ledger:** The user's original strategic query and core constraints are permanently pinned at the very top of the context window (`[PINNED SYSTEM STATE & USER INQUIRY LEDGER]`).
- **Mandatory Pre-Generation Checklist:** Before generating the final dossier, the agent outputs a verified `<system_checklist>` explicitly confirming that the primary inquiry, multi-source cross-verification, conflict adjudication, strategic trade-offs, and compression budgets have been satisfied.
- **Dedicated UI Rendering:** Rendered in the client as an interactive, verified checklist card with green status indicators.

### 6. Diminishing Returns Threshold & Hard Stop Protocol
- **Search Memory Buffer:** A session-scoped `SearchMemoryTracker` tokenizes incoming search snippets and computes Jaccard semantic similarity against accumulated memory.
- **Hard Stop at >85% Overlap:** If 3 consecutive searches yield >85% semantic redundancy, the search loop is forcibly halted.
- **Intellectual Integrity Mandate:** Rather than endlessly querying or hallucinating estimates, the agent writes: *"Information on this specific metric is not publicly available in verified primary sources or audited filings."*

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
│   │   │   ├── ExecutiveMemoView.tsx  # 1-Page C-Suite Memo view (BLUF, Verdict, Decision Gates)
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
