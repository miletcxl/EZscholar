<div align="center">

<img src="./docs/images/EZ_with_sch.png" alt="EZscholar Banner" width="780" />

A localized academic productivity assistant for university and research workflows. EZscholar unifies task planning, remote compute, focus management, report generation, literature analysis, and guided learning in one console.

![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Test-Playwright-45ba4b?logo=playwright&logoColor=white)

</div>

<table align="center">
  <tr>
    <td align="center">
      <strong>Language / 语言</strong><br/>
      English (Default) · <a href="./README.zh-CN.md">简体中文</a>
    </td>
  </tr>
</table>

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

The repository now ships:

- `frontend` console (React + TypeScript + Vite)
- `backend` local Docs Maker bridge service (Express + Mammoth + Pandoc bridge)

Implemented capabilities:

- Routes and pages:
  - `/`: AI Chat (default home)
  - `/overview`: Overview dashboard (recent visits, activity timeline, module cards)
  - `/activity`: Global activity feed
  - `/settings`: Theme, provider, and workspace settings
  - `/modules/*`: Module detail pages (Deadline / Remote / Flow / Output / Research / Socratic)
- Agentic AI chat:
  - OpenAI-compatible Chat Completions integration
  - Function-calling tools:
    - `schedule_reminder` / `list_reminders` / `cancel_reminder`
    - `parse_word_draft` / `render_academic_report` / `generate_presentation_slides` (stub)
  - In-chat tool action cards, plus local notifications and toast delivery
- Module 2 Docs Maker:
  - Upload `.docx` draft to workspace
  - Parse Word draft to Markdown with extracted image placeholders
  - Render polished Markdown to `pdf`/`docx` (`typst` first, `pandoc` fallback for PDF)
  - Default output target: `workspace/docs-maker/output/report-<timestamp>.pdf`
  - Download stream endpoint and workspace file persistence
- Command palette: `Ctrl/Cmd + K` for navigation and simulated actions
- Theme system: dark/light mode with improved light-mode readability
- Data layer: mock-first for UI and workflow iteration

---

## UI Preview

### AI Chat Page (`/`, Dark/Light)

| Dark | Light |
| --- | --- |
| ![ChatDark](./docs/images/chat-dark-latest.png) | ![ChatLight](./docs/images/chat-light-latest.png) |

### Deadline Engine (Real Implementation, Dark/Light)

| Dark | Light |
| --- | --- |
| ![DeadlineEngineDark](./docs/images/deadline-engine-dark.png) | ![DeadlineEngineLight](./docs/images/deadline-engine-light.png) |

### Module 2 Docs Maker E2E (Chat-Driven)

[Click to view chat snapshot](./docs/images/chat_2.png) · [Click to view rendered PDF snapshot](./docs/images/report-page1.png)

<p align="center">
  <img src="./docs/images/chat_2.png" alt="Module2Chat" height="420" />
  <img src="./docs/images/report-page1.png" alt="Module2PdfPage1" height="420" />
</p>

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install

cd frontend
npm install
```

### 2. Start Local Docs Maker Backend

```bash
cd backend
npm run dev
```

Default backend URL:

- `http://127.0.0.1:8787`

### 3. (Optional) Configure Local Environment Variables

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

### 4. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Default local URL (check terminal output first):

- `http://127.0.0.1:5173`

`/api/docs-maker/*` is proxied by Vite to the backend service in development.

### 5. Build and Preview Production

```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Preview URL:

- `http://127.0.0.1:4173`

---

## Test Commands

```bash
cd backend
npm test
npm run build

cd ../frontend
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
├── docs/images/                 # README screenshot assets
├── backend/
│   ├── src/routes/              # docs-maker routes
│   ├── src/services/            # path guard / parser / renderer / slides stub
│   └── src/types.ts             # zod schemas + response types
└── frontend/
    ├── src/
    │   ├── app/                 # Router, navigation, QueryClient
    │   ├── layouts/             # AppShell / Sidebar / TopHeader
    │   ├── pages/               # Chat / Overview / Activity / Settings / ModuleDetail
    │   ├── features/            # dashboard / settings / modules / command-palette
    │   ├── services/            # api mock + llm + agent tools + docs-maker client + notifier
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
4. Open `/modules/output-generator` to upload a `.docx`, parse markdown, and render `pdf/docx` (recommended output dir: `docs-maker/output`).
5. Use `Ctrl/Cmd + K` for fast navigation and action simulation.

---

## Roadmap

- Integrate real backend APIs (while keeping mock fallback)
- Add module-level real-time status subscriptions (WebSocket/SSE)
- Persist reminders and chat history
- Add real PPTX generation (replace slides stub)
- Expand bilingual UX across the product

---

## License

Licensed under [MIT License](./LICENSE).
