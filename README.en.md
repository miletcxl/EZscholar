<div align="center">

<img src="./docs/images/EZ_with_sch.png" alt="EZscholar Banner" width="780" />

A localized academic productivity assistant for university and research workflows. EZscholar unifies task planning, remote compute, focus management, report generation, literature analysis, and guided learning in one console.

![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Test-Playwright-45ba4b?logo=playwright&logoColor=white)

</div>

<p align="center"><strong>Language / 语言：</strong><a href="./README.zh-CN.md">简体中文</a> | English</p>

---

## Why This Project

Typical tools fragment research workflows:

- Deadline reminders are time-based only, without task complexity awareness.
- Switching between local and remote GPU environments is expensive.
- Deep work is interrupted easily, and context is lost after breaks.
- Data processing, charting, and report export pipelines are long and error-prone.
- Long-paper retrieval often loses figure/table context across sources.
- Direct answers can weaken reasoning practice in learning scenarios.

EZscholar aims to unify these high-frequency pain points into one workflow.

---

## Current Features

The repository currently ships a frontend console (React + TypeScript + Vite) with:

- Routes and pages:
  - `/`: AI Chat (default home)
  - `/overview`: Overview dashboard (recent visits, activity timeline, module cards)
  - `/activity`: Global activity feed
  - `/settings`: Theme, provider, and workspace settings
  - `/modules/*`: Module detail pages (Deadline / Remote / Flow / Output / Research / Socratic)
- Agentic AI chat:
  - OpenAI-compatible Chat Completions integration
  - Function-calling tools: `schedule_reminder` / `list_reminders` / `cancel_reminder`
  - In-chat tool action cards, plus local notifications and toast delivery
- Command palette: `Ctrl/Cmd + K` for navigation and simulated actions
- Theme system: dark/light mode with improved light-mode readability
- Data layer: mock-first for UI and workflow iteration

---

## UI Preview

### Overview Page (`/overview`)

![Dashboard](./docs/images/dashboard.png)

### Module Detail (Research Brain)

![ResearchBrain](./docs/images/research-brain.png)

---

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. (Optional) Configure Local Environment Variables

Create/update `frontend/.env.local`:

```bash
VITE_LOCAL_API_BASE_URL=http://127.0.0.1:8045/v1
VITE_LOCAL_API_KEY=
VITE_LOCAL_MODEL=gemini-3-flash

VITE_QWEN_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_QWEN_API_KEY=
VITE_QWEN_MODEL=qwen-plus
```

Note: `.env.local` is git-ignored. Do not commit real API keys into source code or README files.

### 3. Start Development Server

```bash
npm run dev
```

Default local URL (check terminal output first):

- `http://127.0.0.1:5173`

### 4. Build and Preview Production

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Preview URL:

- `http://127.0.0.1:4173`

---

## Test Commands

```bash
npm run lint
npm run test
npm run test:e2e
```

---

## Project Structure

```text
UniHelperCode/
├── README.md
├── README.zh-CN.md
├── README.en.md
├── docs/images/                 # README screenshot assets
└── frontend/
    ├── src/
    │   ├── app/                 # Router, navigation, QueryClient
    │   ├── layouts/             # AppShell / Sidebar / TopHeader
    │   ├── pages/               # Chat / Overview / Activity / Settings / ModuleDetail
    │   ├── features/            # dashboard / settings / modules / command-palette
    │   ├── services/            # api mock + llm + agent tools + notifier
    │   ├── stores/              # UI / LLM / Chat / Notifier / Workspace
    │   └── styles/              # tokens + component styles
    ├── e2e/                     # Playwright tests
    └── vitest.config.ts
```

---

## Typical Usage Flow

1. Start the app and open AI Chat (`/`) by default.
2. Configure your active LLM provider in `/settings`.
3. Try prompts like "Remind me in 30 minutes to ..." to validate tool calling.
4. Open `/overview` and module detail pages to inspect dashboards and execution records.
5. Use `Ctrl/Cmd + K` for fast navigation and action simulation.

---

## Roadmap

- Integrate real backend APIs (while keeping mock fallback)
- Add module-level real-time status subscriptions (WebSocket/SSE)
- Persist reminders and chat history
- Expand bilingual UX across the product
- End-to-end integration for report generation and literature workflows

---

## License

Licensed under [MIT License](./LICENSE).
