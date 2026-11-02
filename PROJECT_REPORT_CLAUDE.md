# ChatBot-2: Comprehensive Project Status & Architecture Report

> **Last Updated:** October 2026  
> **Status:** Fully Operational (Backend + Frontend + Diagram Engine Active)  
> **Repository:** `chat-bot-2`

---

## 1. Executive Summary & Core Objective
**ChatBot-2** is an enterprise-grade, privacy-first local AI assistant featuring Retrieval-Augmented Generation (RAG), conversational memory, custom bot orchestration, interactive data visualization, embeddable website widgets, and a textbook-accurate parametric diagramming engine.

It is strictly optimized for resource-constrained environments (Intel i7, 16 GB RAM, low VRAM) while delivering high-speed streaming token generation and rich interactive visual responses.

---

## 2. Complete Technology Stack

| Layer | Technologies / Libraries | Key Purpose |
| :--- | :--- | :--- |
| **Backend API** | FastAPI, Uvicorn, Python 3.11+, Pydantic v2 | High-throughput asynchronous HTTP & SSE streaming endpoints |
| **LLM Inference** | `llama-cpp-python` / Qwen2.5 3B Instruct (`q4_k_m`) | Local CPU-optimized inference (~7–10 tokens/sec, ~2.7 GB peak RAM) |
| **Vector Store / RAG** | ChromaDB, PyMuPDF (`pymupdf`), RecursiveCharacterTextSplitter | Privacy-preserving document chunking & semantic search per conversation |
| **Databases** | SQLite (`users.db`, `chatbot.db`, `chat_history.db`) | User auth, password reset tokens, custom bot metadata, chat history |
| **Frontend SPA** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React | High-performance, modern dark/light UI with zero lag |
| **Data & Diagrams** | Native SVG Engine (`DfdDiagram.tsx`), Mermaid.js, Recharts | Interactive DFD Level-1 diagrams, multi-tier architectures, data charts |
| **Embed Widget** | Vanilla JS (`client/public/widget.js`) | Standalone zero-dependency embed script for external websites |
| **Testing** | Vitest (73 tests / 14 suites), Pytest, Playwright | End-to-end regression testing, auth checks, and diagram render validation |

---

## 3. Major Features Built So Far

### 🎯 1. Local AI Chat & Conversational Memory
- **Low-Latency Streaming:** Server-Sent Events (SSE) streaming direct to UI with token-by-token rendering.
- **Context Management:** SQLite-backed conversational memory with strict bounds (`MAX_CONTEXT_MESSAGES`) preventing context overflow.
- **Strict Grounding:** PromptBuilder enforces factual responses based strictly on loaded documents or chat history.

### 📚 2. Privacy-Guaranteed Document RAG (PDF Q&A)
- **Local Document Ingestion:** Extracts text from single/multi-page PDFs using PyMuPDF.
- **ChromaDB Semantic Search:** Generates embeddings using `nomic-embed-text-v1.5` without third-party cloud leaks.
- **Thread Isolation:** Vector queries strictly scoped to the active `conversation_id`, guaranteeing zero cross-document data contamination.

### 🔐 3. Authentication & Password Recovery System
- **Role-Based Access Control:** Secure user sessions, admin authorization, and login validation.
- **Self-Service & Admin Password Reset:**
  - Secure hash token generation stored in SQLite.
  - Interactive Admin link generator and clipboard copy fallback.
  - Frontend Password Recovery UI (`/recover-password`) with strict policy validation and unit test coverage.

### 🤖 4. Custom Bots & Topic Drill-Down Engine
- **Custom Bot Creation:** Users and Admins can build specialized bots with custom system instructions and avatars.
- **Topic Headings & Question Bubbles:** Visual builder inside the Edit Bot modal allowing category headings and clickable starter question bubbles with interactive drilldown.
- **Embeddable External Widget:** `client/public/widget.js` allows custom bots to be injected into external client websites via an iframe/floating modal with custom themes and allowed CORS origins.

### 📊 5. Native Parametric SVG Engine & Diagrams (Latest Milestone)
- **Problem Solved:** Mermaid Dagre auto-layout previously twisted arrows, misaligned entities, crashed in web runtimes (`getBBox is not a function`), and collapsed into squashed card strips.
- **Solution — Native SVG Component ([`DfdDiagram.tsx`](file:///c:/Users/Dell/OneDrive%20-%20trpwpartners.com/Desktop/chat-bot-2/client/src/components/chat/DfdDiagram.tsx)):**
  - **Textbook 1-to-1 DFD Level-1 Layout:**
    - External Entities: `Customer` (top-left), `Clothes Store` (top-right), `Sales manager` (mid-right), `Supplier` (bottom-left).
    - Processes: `1.0 Order clothes`, `2.0 Generate reports`, `3.0 Order inventory` (centered circles).
    - Data Stores: `D1 Inventory` & `D2 Order` open parallel data stores.
    - All 11 Directed Flows: Perfectly aligned orthogonal arrows including the supplier replenishment loop (`Order inventory -> Inventory`).
  - **Interactive Features:** Drag-to-pan, Zoom In/Out, 100% Crisp vs Fit View modes, Dark/Light theme switching, SVG vector export, Retina PNG download, and collapsed-by-default breakdown table.
- **Workflow & Flowcharts ([`WorkflowDiagram.tsx`](file:///c:/Users/Dell/OneDrive%20-%20trpwpartners.com/Desktop/chat-bot-2/client/src/components/chat/WorkflowDiagram.tsx)):**
  - Seamlessly routes DFD queries to the native SVG engine while supporting multi-tier architecture diagrams.

### 📈 6. Interactive Charts & Rich Previews
- **Recharts Integration ([`DataChart.tsx`](file:///c:/Users/Dell/OneDrive%20-%20trpwpartners.com/Desktop/chat-bot-2/client/src/components/chat/DataChart.tsx)):** Automatic rendering of markdown tables and ` ```chart ` code blocks into Bar, Line, and Area charts with theme styling.
- **Process Flowcharts ([`ProcessFlowchart.tsx`](file:///c:/Users/Dell/OneDrive%20-%20trpwpartners.com/Desktop/chat-bot-2/client/src/components/chat/ProcessFlowchart.tsx)):** Step-by-step visual pipelines.
- **HTML/SVG Live Preview ([`HtmlDiagramPreview.tsx`](file:///c:/Users/Dell/OneDrive%20-%20trpwpartners.com/Desktop/chat-bot-2/client/src/components/chat/HtmlDiagramPreview.tsx)):** Live rendering for custom components.

---

## 4. Current Test & Build Health
- **Client Test Suite (Vitest):** **73 / 73 Tests Passing** across 14 test suites.
- **Production Bundle:** `tsc -b && vite build` builds in **<7 seconds** with 0 errors.
- **Active Ports:**
  - Frontend: `http://localhost:5173/` (Vite)
  - Backend: `http://127.0.0.1:8000/` (FastAPI)

---

## 5. Potential Next Areas for Customization / Modification
When planning your next changes, consider:
1. **Diagram Expansions:** Adding predefined canonical templates for other domains (e.g., Banking DFD, Hospital Management DFD, Library System, E-Commerce Level-2 DFD).
2. **Bot Intelligence & Model Tuning:** Custom prompt tweaks or temperature adjustments per custom bot.
3. **Widget Customization:** Allowing customized launcher icons, positioning (left/right bottom), or sound effects.
4. **Export Options:** PDF export of chat conversations or diagram reports.
5. **Database Enhancements:** Migration to PostgreSQL for multi-node deployments or staying with SQLite for single-server setups.
