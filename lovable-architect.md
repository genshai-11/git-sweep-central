# Lovable Architect — Tài liệu kiến trúc nội bộ

## 1. Tech Stack

| Layer | Technology | Vai trò |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| **Build tool** | Vite | Dev server, HMR, bundling |
| **Styling** | Tailwind CSS + CSS Variables (HSL) | Design system, theming, dark mode |
| **UI Components** | shadcn/ui (Radix primitives) | Accessible, composable components |
| **Routing** | React Router v6 | Client-side navigation |
| **State / Data** | TanStack React Query v5 | Server state, caching, mutations |
| **Forms** | React Hook Form + Zod | Validation, type-safe forms |
| **Charts** | Recharts | Data visualization |
| **Animations** | Tailwind Animate + Framer Motion | UI transitions |
| **Backend** | Lovable Cloud (Supabase) | Database, Auth, Edge Functions, Storage |
| **Edge Functions** | Deno (TypeScript) | Serverless API endpoints |
| **Database** | PostgreSQL | Data persistence, RLS policies |
| **Auth** | Supabase Auth | Email/password, OAuth, JWT |
| **AI Gateway** | Lovable AI | LLM integration (Gemini, GPT-5) |

---

## 2. Cấu trúc Scaffolding

```
project-root/
├── .lovable/
│   └── plan.md                    # Project plan — agent đọc để hiểu roadmap
├── public/                        # Static assets (favicon, robots.txt)
├── src/
│   ├── main.tsx                   # Entry point — React root render
│   ├── App.tsx                    # Router config — tất cả routes
│   ├── App.css                    # Global styles
│   ├── index.css                  # Design tokens (CSS variables HSL)
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (button, dialog, card...)
│   │   ├── AppLayout.tsx          # Layout wrapper (sidebar + content)
│   │   ├── AppSidebar.tsx         # Navigation sidebar
│   │   └── [Feature].tsx          # Feature-specific components
│   ├── pages/                     # Route pages (1 file = 1 route)
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Utilities (cn(), helpers)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # ⚠️ AUTO-GENERATED — không edit
│   │       └── types.ts           # ⚠️ AUTO-GENERATED — database types
│   └── assets/                    # Images, fonts (ES6 import)
├── supabase/
│   ├── config.toml                # ⚠️ AUTO-GENERATED — function config
│   ├── migrations/                # ⚠️ READ-ONLY — SQL migrations
│   └── functions/                 # Edge Functions (Deno runtime)
│       ├── cli-sync/index.ts      # CLI → Database sync endpoint
│       ├── search-repos/index.ts  # GitHub search proxy
│       └── fetch-trending/index.ts # Trending repos endpoint
├── .env                           # ⚠️ AUTO-GENERATED — env vars
├── tailwind.config.ts             # Tailwind theme extensions
├── vite.config.ts                 # Vite config + path aliases
└── components.json                # shadcn/ui config
```

### File quan trọng — KHÔNG ĐƯỢC EDIT thủ công:
- `.env` — Supabase URL + keys, tự động cập nhật
- `src/integrations/supabase/client.ts` — Supabase client instance
- `src/integrations/supabase/types.ts` — Database schema types (từ migrations)
- `supabase/config.toml` — Edge function deployment config
- `supabase/migrations/` — SQL migration history

---

## 3. Agent Architecture — Cách Lovable AI hoạt động

### 3.1 Agent chính (Lovable Editor Agent)

```
User Message
    │
    ▼
┌─────────────────────┐
│   Context Assembly   │  ← Gom: codebase, plan.md, conversation history,
│                     │     database schema, RLS policies, secrets, env vars
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Reasoning Engine   │  ← Phân tích scope: chat-only vs code-change
│   (LLM backbone)    │     Quyết định tools cần gọi
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Tool Orchestrator  │  ← Gọi tools song song khi có thể
│                     │     Sequential chỉ khi có dependency
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Output + Preview   │  ← Code changes → Hot reload → User thấy ngay
└─────────────────────┘
```

### 3.2 Tool Categories

| Category | Tools | Mục đích |
|----------|-------|----------|
| **File I/O** | `lov-view`, `lov-write`, `lov-line-replace`, `lov-delete`, `lov-rename`, `lov-copy` | Đọc/ghi/sửa code |
| **Search** | `lov-search-files`, `lov-list-dir` | Tìm patterns trong codebase |
| **Debug** | `lov-read-console-logs`, `lov-read-network-requests`, `lov-read-session-replay` | Debug runtime errors |
| **Browser** | `browser--navigate`, `browser--act`, `browser--observe`, `browser--screenshot` | E2E testing, visual verification |
| **Database** | `supabase--migration`, `supabase--read-query`, `supabase--insert` | Schema changes, data ops |
| **Edge Functions** | `supabase--deploy_edge_functions`, `supabase--curl_edge_functions`, `supabase--edge-function-logs` | Deploy + test serverless |
| **Auth** | `supabase--configure-auth`, `supabase--configure-social-auth` | Auth settings |
| **Security** | `supabase--linter`, `security--run_security_scan`, `security--manage_security_finding` | RLS audit, vulnerability scan |
| **Secrets** | `secrets--add_secret`, `secrets--fetch_secrets` | API keys management |
| **AI Gateway** | `ai_gateway--enable_ai_gateway` | Enable Lovable AI for app |
| **Web** | `websearch--web_search`, `websearch--web_code_search` | Search internet for docs/examples |
| **Assets** | `imagegen--generate_image`, `imagegen--edit_image`, `videogen--generate_video` | AI-generated media |
| **Dependencies** | `lov-add-dependency`, `lov-remove-dependency` | npm package management |
| **Cross-project** | `cross_project--read-project-file`, `cross_project--search-project-files` | Reference other projects |
| **Connectors** | `standard_connectors--connect`, `standard_connectors--list_connections` | External service integrations |
| **MCP** | Notion, Linear, Jira, Miro, n8n... | External context via MCP protocol |
| **Task Tracking** | `task_tracking--create_task`, `task_tracking--set_task_status` | Loop-local todo management |

---

## 4. Agent Flow — Quy trình xử lý request

```
┌──────────────────────────────────────────────────────────┐
│                    USER SENDS MESSAGE                     │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ 1. ASSESS SCOPE │
              │ Chat? Code?    │
              │ Broad? Narrow? │
              └───────┬────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    [Chat only]  [Clarify]   [Implement]
    Trả lời     Hỏi lại     Bắt đầu code
    ngắn gọn    ask_questions
                      │
                      ▼
              ┌────────────────┐
              │ 2. GATHER      │  ← Đọc files (parallel)
              │    CONTEXT     │  ← Check DB schema
              │                │  ← Check secrets/env
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ 3. PLAN        │  ← Create tasks (nếu multi-step)
              │    (if needed) │  ← Check nếu cần migration trước
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ 4. DATABASE    │  ← Migration tool (nếu cần)
              │    FIRST       │  ← User phải approve trước khi tiếp
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ 5. IMPLEMENT   │  ← Parallel file writes
              │    CODE        │  ← Prefer line-replace over full rewrite
              │                │  ← Edge functions deploy tự động
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ 6. VERIFY      │  ← Console logs, network requests
              │                │  ← curl edge functions
              │                │  ← Browser testing (nếu complex)
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ 7. RESPOND     │  ← Summary ngắn gọn
              │                │  ← Feature suggestions
              └────────────────┘
```

---

## 5. Backend Flow — Dữ liệu đi như thế nào

### 5.1 CLI → Database (Scan flow)

```
Python CLI                    Edge Function              PostgreSQL
    │                              │                         │
    │  POST /functions/v1/cli-sync │                         │
    │  + Bearer <jwt_token>        │                         │
    │  + { repositories: [...] }   │                         │
    │─────────────────────────────►│                         │
    │                              │  Verify JWT → user_id   │
    │                              │─────────────────────────►│
    │                              │  UPSERT repositories     │
    │                              │  INSERT action_logs      │
    │                              │◄─────────────────────────│
    │  200 { synced: N }           │                         │
    │◄─────────────────────────────│                         │
```

### 5.2 Web Dashboard → Database (Read flow)

```
React App                    Supabase Client             PostgreSQL
    │                              │                         │
    │  supabase.from('repos')      │                         │
    │  .select('*')                │                         │
    │  .eq('user_id', uid)         │                         │
    │─────────────────────────────►│                         │
    │                              │  SELECT with RLS filter  │
    │                              │─────────────────────────►│
    │                              │  rows (only user's data) │
    │                              │◄─────────────────────────│
    │  data[]                      │                         │
    │◄─────────────────────────────│                         │
```

### 5.3 GitHub Search (Proxy flow)

```
React App              Edge Function            GitHub API
    │                       │                       │
    │  /search-repos?q=x    │                       │
    │──────────────────────►│                       │
    │                       │  GET /search/repos    │
    │                       │──────────────────────►│
    │                       │  { items: [...] }     │
    │                       │◄──────────────────────│
    │  { repos: [...] }     │                       │
    │◄──────────────────────│                       │
```

---

## 6. Security Model

### Row Level Security (RLS)
- **Mọi table** đều bật RLS
- Policy pattern: `auth.uid() = user_id` — user chỉ thấy data của mình
- Edge Functions verify JWT token trước khi xử lý

### Auth Flow
```
Email + Password → Supabase Auth → JWT Token → Stored in localStorage
                                        │
                                        ├── Web: auto-attach to supabase client
                                        └── CLI: Bearer header in API calls
```

### Secrets Management
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` → public, trong `.env`
- `LOVABLE_API_KEY` → server-only, trong Supabase secrets
- Custom API keys → `secrets--add_secret` tool, encrypted storage

---

## 7. Design System

### Token Architecture
```css
/* index.css — HSL design tokens */
:root {
  --background: H S% L%;
  --foreground: H S% L%;
  --primary: H S% L%;
  --primary-foreground: H S% L%;
  --secondary: H S% L%;
  --muted: H S% L%;
  --accent: H S% L%;
  --destructive: H S% L%;
  --border: H S% L%;
  --ring: H S% L%;
}

.dark {
  /* Override all tokens for dark mode */
}
```

### Usage Rules
- ✅ `bg-primary`, `text-muted-foreground`, `border-border`
- ❌ `bg-blue-500`, `text-white`, `bg-black` (hardcoded colors)
- Components sử dụng `cn()` utility để merge Tailwind classes
- shadcn/ui components có sẵn variants (default, destructive, outline...)

---

## 8. Deployment Model

| Component | Deploy method | Timing |
|-----------|--------------|--------|
| **Frontend** | Click "Publish" → build + deploy | Manual trigger |
| **Edge Functions** | Auto-deploy on code save | Immediate |
| **Database migrations** | Migration tool → user approve | On approval |
| **Secrets** | `add_secret` tool | Immediate |

### Environments
- **Test**: Agent builds & tests here (preview URL)
- **Live**: Production (published URL) — read-only for agent
- **Data**: Separate between Test & Live, never synced

---

## 9. Integrated Services (Current Project)

| Service | Function | Status |
|---------|----------|--------|
| **Lovable Cloud** | Database + Auth + Functions | ✅ Active |
| **cli-sync** | CLI Python → DB sync | ✅ Deployed |
| **search-repos** | GitHub repo search proxy | ✅ Deployed |
| **fetch-trending** | Trending repos by topic | ✅ Deployed |

---

## 10. Tóm tắt vận hành

1. **User gửi message** → Agent nhận context đầy đủ (code, DB schema, env, history)
2. **Agent reasoning** → Quyết định: chat / clarify / implement
3. **Tool orchestration** → Gọi tools song song tối đa, sequential chỉ khi phụ thuộc
4. **Database first** → Migration trước, code sau (vì types auto-gen)
5. **Code changes** → Prefer `line-replace` > `write` > `delete`
6. **Auto-deploy** → Edge functions deploy ngay, frontend cần Publish
7. **Verify** → Logs, network, browser testing
8. **Preview** → User thấy thay đổi real-time qua HMR (Hot Module Replacement)
