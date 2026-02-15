# OpenCode AI System Builder — Hướng dẫn triển khai chi tiết

> Xây dựng hệ thống AI-powered app builder tương tự Lovable, chạy trên OpenCode CLI.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Danh sách Agents](#2-danh-sách-agents)
3. [Skills & Capabilities](#3-skills--capabilities)
4. [MCP Servers & Tools](#4-mcp-servers--tools)
5. [Workflow chi tiết](#5-workflow-chi-tiết)
6. [Cấu hình OpenCode](#6-cấu-hình-opencode)
7. [System Prompts](#7-system-prompts)
8. [Preview Pipeline](#8-preview-pipeline)
9. [Triển khai từng bước](#9-triển-khai-từng-bước)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                    OPENCODE TUI                          │
│              (Terminal User Interface)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Chat    │  │  Editor  │  │  Logs    │              │
│  │  Panel   │  │  Panel   │  │  Panel   │              │
│  └────┬─────┘  └──────────┘  └──────────┘              │
│       │                                                  │
└───────┼──────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                   AGENT ORCHESTRATOR                       │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Coder   │  │ Reviewer │  │ Planner  │  │ Debug    │  │
│  │ Agent   │  │ Agent    │  │ Agent    │  │ Agent    │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │            │             │              │         │
│       └────────────┴─────────────┴──────────────┘         │
│                         │                                  │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP TOOL LAYER                          │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Supabase  │  │ Filesystem│  │ Browser   │  │ Custom  │ │
│  │ MCP       │  │ MCP       │  │ MCP       │  │ MCP     │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │              │              │              │       │
└────────┼──────────────┼──────────────┼──────────────┼───────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │PostgreSQL│   │ Project  │  │ Chromium │  │ Vite Dev │
   │+ Auth    │   │ Files    │  │ Preview  │  │ Server   │
   └──────────┘   └──────────┘  └──────────┘  └──────────┘
```

---

## 2. Danh sách Agents

OpenCode hỗ trợ cấu hình nhiều agent profiles. Dưới đây là setup tối ưu cho system builder:

### 2.1 Coder Agent (Agent chính)

| Thuộc tính | Giá trị |
|-----------|---------|
| **Vai trò** | Viết code, sửa code, tạo files |
| **Model khuyến nghị** | `claude-sonnet-4-20250514` hoặc `openai/gpt-5` |
| **System prompt** | `.opencode/prompts/coder.md` |
| **Khi nào dùng** | Mọi request liên quan đến code changes |

**Capabilities:**
- Đọc/ghi/sửa files trong project
- Chạy terminal commands
- Gọi MCP tools (database, browser, etc.)
- LSP integration (type checking, go-to-definition)

```json
{
  "agents": {
    "coder": {
      "model": "claude-sonnet-4-20250514",
      "systemPrompt": ".opencode/prompts/coder.md",
      "maxTokens": 16384
    }
  }
}
```

### 2.2 Planner Agent

| Thuộc tính | Giá trị |
|-----------|---------|
| **Vai trò** | Phân tích scope, lập kế hoạch, chia task |
| **Model khuyến nghị** | `openai/gpt-5` (reasoning mạnh) |
| **System prompt** | `.opencode/prompts/planner.md` |
| **Khi nào dùng** | Request phức tạp, cần breakdown |

**Capabilities:**
- Đọc toàn bộ codebase structure
- Phân tích dependencies
- Tạo task list có thứ tự
- Không trực tiếp sửa code

```json
{
  "agents": {
    "planner": {
      "model": "openai/gpt-5",
      "systemPrompt": ".opencode/prompts/planner.md",
      "maxTokens": 8192
    }
  }
}
```

### 2.3 Reviewer Agent

| Thuộc tính | Giá trị |
|-----------|---------|
| **Vai trò** | Review code, kiểm tra security, best practices |
| **Model khuyến nghị** | `claude-sonnet-4-20250514` |
| **System prompt** | `.opencode/prompts/reviewer.md` |
| **Khi nào dùng** | Sau khi Coder Agent hoàn thành |

**Capabilities:**
- Đọc diff/changes
- Kiểm tra RLS policies
- Verify TypeScript types
- Suggest improvements

### 2.4 Debug Agent

| Thuộc tính | Giá trị |
|-----------|---------|
| **Vai trò** | Debug lỗi, đọc logs, trace issues |
| **Model khuyến nghị** | `google/gemini-2.5-flash` (nhanh, rẻ) |
| **System prompt** | `.opencode/prompts/debug.md` |
| **Khi nào dùng** | Khi có runtime errors |

**Capabilities:**
- Đọc console logs từ Vite dev server
- Đọc Supabase function logs
- Analyze stack traces
- Gợi ý fix

---

## 3. Skills & Capabilities

### 3.1 Skill Map theo Agent

```
┌─────────────────────────────────────────────────────────────┐
│                        SKILLS MAP                            │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   CODER      │   PLANNER    │  REVIEWER    │    DEBUG       │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ ✅ File R/W   │ ✅ File Read  │ ✅ File Read  │ ✅ File Read    │
│ ✅ Terminal   │ ✅ Search     │ ✅ Search     │ ✅ Terminal     │
│ ✅ MCP Tools  │ ✅ Web Search │ ✅ LSP        │ ✅ Log Reader   │
│ ✅ LSP        │ ❌ File Write │ ❌ File Write │ ✅ MCP Tools    │
│ ✅ Web Search │ ❌ Terminal   │ ❌ Terminal   │ ✅ Browser      │
│ ✅ Browser    │ ❌ MCP Tools  │ ❌ MCP Tools  │ ❌ File Write   │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 3.2 Built-in Skills (OpenCode native)

| Skill | Mô tả | Command |
|-------|--------|---------|
| **File Read** | Đọc nội dung file | Tự động qua context |
| **File Write** | Tạo/sửa file | `write_file`, `edit_file` |
| **File Search** | Regex search trong project | `grep`, `find` |
| **Terminal** | Chạy shell commands | `bash`, `sh` |
| **LSP** | Type checking, definitions | Tự động qua config |
| **Web Search** | Tìm docs/examples trên web | Cần MCP hoặc plugin |
| **Git** | Version control | `git` commands |

### 3.3 Extended Skills (qua MCP)

| Skill | MCP Server | Mô tả |
|-------|-----------|--------|
| **Database Migration** | Supabase MCP | Tạo tables, RLS, triggers |
| **Database Query** | Supabase MCP | SELECT, INSERT, UPDATE |
| **Auth Config** | Supabase MCP | Setup authentication |
| **Edge Functions** | Supabase MCP | Deploy serverless functions |
| **Browser Testing** | Playwright MCP | Navigate, click, screenshot |
| **Image Generation** | Custom MCP | AI image gen (DALL-E, Flux) |
| **Deployment** | Vercel/Netlify MCP | Deploy production |

---

## 4. MCP Servers & Tools

### 4.1 Supabase MCP Server (Bắt buộc)

**Cài đặt:**
```bash
npm install -g @supabase/mcp-server-supabase
```

**Config trong `opencode.json`:**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--supabase-url", "https://your-project.supabase.co",
        "--supabase-service-role-key", "your-service-role-key"
      ]
    }
  }
}
```

**Tools được expose:**

| Tool | Chức năng | Ví dụ |
|------|----------|-------|
| `list_tables` | Liệt kê tất cả tables | `list_tables()` |
| `execute_sql` | Chạy SQL query | `execute_sql("SELECT * FROM users")` |
| `apply_migration` | Tạo migration file + chạy | `apply_migration("CREATE TABLE...")` |
| `get_logs` | Đọc database logs | `get_logs("postgres")` |
| `list_functions` | Liệt kê edge functions | `list_functions()` |
| `deploy_function` | Deploy edge function | `deploy_function("chat")` |
| `get_auth_config` | Đọc auth settings | `get_auth_config()` |
| `update_auth_config` | Cập nhật auth | `update_auth_config({...})` |
| `list_storage_buckets` | Liệt kê buckets | `list_storage_buckets()` |
| `create_bucket` | Tạo storage bucket | `create_bucket("avatars")` |

### 4.2 Filesystem MCP Server

**Config:**
```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-filesystem",
        "/path/to/your/project"
      ]
    }
  }
}
```

**Tools:**
- `read_file` — Đọc file
- `write_file` — Ghi file
- `list_directory` — Liệt kê thư mục
- `search_files` — Tìm kiếm regex
- `move_file` — Di chuyển/rename

### 4.3 Playwright MCP Server (Browser Testing)

**Cài đặt:**
```bash
npm install -g @anthropic-ai/mcp-playwright
```

**Config:**
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright"]
    }
  }
}
```

**Tools:**
- `navigate` — Mở URL
- `click` — Click element
- `fill` — Điền form
- `screenshot` — Chụp ảnh màn hình
- `evaluate` — Chạy JavaScript trong browser

### 4.4 Custom MCP Server (Preview Manager)

Bạn cần tự build MCP server này để quản lý Vite dev server:

**File: `mcp-servers/preview-manager/index.ts`**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn, ChildProcess } from "child_process";

let viteProcess: ChildProcess | null = null;

const server = new Server({
  name: "preview-manager",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// Tool: Start Vite dev server
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "start_preview": {
      if (viteProcess) return { content: [{ type: "text", text: "Preview already running" }] };
      
      viteProcess = spawn("npm", ["run", "dev"], {
        cwd: args.projectPath,
        stdio: "pipe"
      });

      return {
        content: [{ type: "text", text: "Preview started at http://localhost:5173" }]
      };
    }

    case "stop_preview": {
      if (viteProcess) {
        viteProcess.kill();
        viteProcess = null;
      }
      return { content: [{ type: "text", text: "Preview stopped" }] };
    }

    case "get_console_logs": {
      // Read recent stdout/stderr from Vite process
      return {
        content: [{ type: "text", text: /* captured logs */ "" }]
      };
    }

    case "restart_preview": {
      if (viteProcess) viteProcess.kill();
      viteProcess = spawn("npm", ["run", "dev"], {
        cwd: args.projectPath,
        stdio: "pipe"
      });
      return { content: [{ type: "text", text: "Preview restarted" }] };
    }
  }
});

// Tool definitions
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "start_preview",
      description: "Start Vite dev server for live preview",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Path to project root" }
        },
        required: ["projectPath"]
      }
    },
    {
      name: "stop_preview",
      description: "Stop the running preview server",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_console_logs",
      description: "Get recent console output from dev server",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "restart_preview",
      description: "Restart the preview server",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string" }
        },
        required: ["projectPath"]
      }
    }
  ]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Config:**
```json
{
  "mcpServers": {
    "preview": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "./mcp-servers/preview-manager/index.ts"]
    }
  }
}
```

---

## 5. Workflow chi tiết

### 5.1 Request Processing Flow

```
User: "Tạo trang dashboard với chart hiển thị dữ liệu repos"
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 1: ROUTING                                          │
│                                                          │
│ OpenCode nhận message → Route tới Coder Agent            │
│ (hoặc Planner Agent nếu request phức tạp)               │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 2: CONTEXT ASSEMBLY                                 │
│                                                          │
│ Agent tự động thu thập:                                  │
│ ├── Đọc project structure (ls, find)                    │
│ ├── Đọc existing pages (src/pages/*.tsx)                │
│ ├── Đọc database schema (Supabase MCP → list_tables)    │
│ ├── Đọc design tokens (src/index.css)                   │
│ └── Check dependencies (package.json)                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 3: PLANNING (nếu multi-step)                       │
│                                                          │
│ Agent tạo task list:                                     │
│ 1. Tạo database query cho chart data                    │
│ 2. Tạo component DashboardChart.tsx                     │
│ 3. Tạo page Dashboard.tsx                               │
│ 4. Thêm route vào App.tsx                               │
│ 5. Thêm nav link vào Sidebar                            │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 4: DATABASE CHECK                                   │
│                                                          │
│ Supabase MCP → execute_sql:                              │
│   "SELECT column_name, data_type                         │
│    FROM information_schema.columns                       │
│    WHERE table_name = 'repositories'"                    │
│                                                          │
│ → Xác nhận schema có đủ fields cho chart                │
│ → Nếu thiếu → tạo migration trước                      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 5: CODE GENERATION                                  │
│                                                          │
│ Agent viết code tuần tự:                                 │
│                                                          │
│ 5a. write_file("src/components/DashboardChart.tsx")      │
│     → React component với Recharts                       │
│     → useQuery hook fetch data từ Supabase              │
│                                                          │
│ 5b. write_file("src/pages/Dashboard.tsx")                │
│     → Import DashboardChart                              │
│     → Layout với semantic tokens                         │
│                                                          │
│ 5c. edit_file("src/App.tsx")                             │
│     → Thêm <Route path="/dashboard">                    │
│                                                          │
│ 5d. edit_file("src/components/AppSidebar.tsx")           │
│     → Thêm nav link Dashboard                           │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 6: VERIFICATION                                     │
│                                                          │
│ 6a. LSP kiểm tra TypeScript errors (tự động)            │
│ 6b. Terminal: npm run build (check compile)              │
│ 6c. Playwright MCP → navigate("http://localhost:5173")   │
│     → screenshot() → verify UI renders                   │
│ 6d. Đọc console logs từ Vite dev server                 │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 7: RESPONSE                                         │
│                                                          │
│ Agent trả lời:                                           │
│ "Đã tạo Dashboard page với chart hiển thị repos.         │
│  Truy cập /dashboard để xem."                           │
│                                                          │
│ + Suggest next steps                                     │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Database-First Flow

```
User: "Thêm tính năng comments cho repos"
  │
  ▼
┌─────────────────────────────┐
│ 1. ANALYZE                   │
│ Cần table mới: comments     │
│ Cần RLS policies            │
│ Cần foreign keys            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. MIGRATION (Supabase MCP) │
│                             │
│ apply_migration(sql):       │
│ CREATE TABLE comments (     │
│   id UUID DEFAULT uuid(),   │
│   repo_id UUID REFERENCES   │
│     repositories(id),       │
│   user_id UUID NOT NULL,    │
│   content TEXT NOT NULL,     │
│   created_at TIMESTAMPTZ    │
│ );                          │
│                             │
│ ALTER TABLE comments        │
│   ENABLE ROW LEVEL SECURITY;│
│                             │
│ CREATE POLICY "users_own"   │
│   ON comments               │
│   USING (auth.uid()=user_id)│
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. TYPE GENERATION          │
│                             │
│ Terminal:                   │
│ supabase gen types          │
│   typescript                │
│   --project-id xxx          │
│   > src/integrations/       │
│     supabase/types.ts       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 4. CODE                     │
│                             │
│ Giờ mới viết UI components │
│ với types đã được update   │
└─────────────────────────────┘
```

### 5.3 Error Recovery Flow

```
Vite dev server output: "TypeError: Cannot read property 'map' of undefined"
  │
  ▼
┌──────────────────────────────┐
│ 1. Debug Agent activated     │
│                              │
│ get_console_logs() →         │
│ Parse error location:        │
│   src/pages/Dashboard.tsx:42 │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 2. Read problematic file     │
│                              │
│ read_file("Dashboard.tsx")   │
│ Line 42: data.repos.map()   │
│                              │
│ Issue: data could be null    │
│ before query resolves        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 3. Fix                       │
│                              │
│ edit_file: thêm optional     │
│ chaining hoặc loading state  │
│ data?.repos?.map()           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 4. Verify fix                │
│                              │
│ Vite HMR auto-reload         │
│ get_console_logs() → clean   │
│ screenshot() → UI renders OK │
└──────────────────────────────┘
```

---

## 6. Cấu hình OpenCode

### 6.1 File config đầy đủ: `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",

  "data": {
    "directory": ".opencode"
  },

  "providers": {
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "disabled": false
    },
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "disabled": false
    },
    "google": {
      "apiKey": "${GOOGLE_API_KEY}",
      "disabled": true
    }
  },

  "agents": {
    "coder": {
      "model": "claude-sonnet-4-20250514",
      "systemPrompt": ".opencode/prompts/coder.md",
      "maxTokens": 16384
    },
    "planner": {
      "model": "openai/gpt-5",
      "systemPrompt": ".opencode/prompts/planner.md",
      "maxTokens": 8192
    }
  },

  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--supabase-url", "${SUPABASE_URL}",
        "--supabase-service-role-key", "${SUPABASE_SERVICE_ROLE_KEY}"
      ]
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright"]
    },
    "preview": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "./mcp-servers/preview-manager/index.ts"]
    }
  },

  "lsp": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "disabled": false
    }
  },

  "debug": false
}
```

### 6.2 Cấu trúc thư mục `.opencode/`

```
.opencode/
├── prompts/
│   ├── coder.md           # System prompt cho Coder Agent
│   ├── planner.md         # System prompt cho Planner Agent
│   ├── reviewer.md        # System prompt cho Reviewer Agent
│   └── debug.md           # System prompt cho Debug Agent
├── sessions/              # Lưu conversation history (tự động)
├── context/
│   ├── tech-stack.md      # Mô tả tech stack project
│   ├── conventions.md     # Coding conventions
│   └── design-system.md   # Design tokens & patterns
└── scripts/
    ├── setup.sh           # Script khởi tạo project
    └── gen-types.sh       # Script generate Supabase types
```

---

## 7. System Prompts

### 7.1 Coder Agent Prompt

**File: `.opencode/prompts/coder.md`**

```markdown
# Bạn là AI Coder Agent cho hệ thống app builder

## Vai trò
Bạn viết code React/TypeScript để xây dựng web applications.
Bạn có quyền đọc, tạo, sửa, xóa files trong project.

## Tech Stack bắt buộc
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + CSS Variables (HSL tokens)
- shadcn/ui (UI components)
- TanStack React Query (data fetching)
- React Router v6 (routing)
- Supabase (database, auth, edge functions)

## Quy tắc code
1. KHÔNG dùng hardcoded colors (bg-blue-500, text-white)
   → Dùng semantic tokens: bg-primary, text-muted-foreground
2. KHÔNG viết monolithic files > 200 lines
   → Tách thành components nhỏ, focused
3. LUÔN dùng TypeScript strict types
   → Không dùng `any`, dùng proper interfaces
4. Database operations LUÔN qua Supabase client
   → import { supabase } from "@/integrations/supabase/client"
5. LUÔN tạo RLS policies khi tạo table mới

## Workflow
1. Đọc context: files liên quan, database schema, design tokens
2. Plan: liệt kê files cần tạo/sửa
3. Database first: tạo migration nếu cần table mới
4. Code: viết code, prefer edit over rewrite
5. Verify: check TypeScript errors, test build

## Cách dùng Supabase MCP
- Tạo table: gọi tool `apply_migration` với SQL
- Query data: gọi tool `execute_sql` với SELECT
- Check schema: gọi tool `list_tables`
- Deploy function: gọi tool `deploy_function`

## File patterns
- Pages: src/pages/[Name].tsx (1 page = 1 route)
- Components: src/components/[Name].tsx
- Hooks: src/hooks/use[Name].tsx
- Utils: src/lib/[name].ts
- Types: types inline hoặc src/types/[name].ts
```

### 7.2 Planner Agent Prompt

**File: `.opencode/prompts/planner.md`**

```markdown
# Bạn là AI Planner Agent

## Vai trò
Phân tích request phức tạp và tạo execution plan cho Coder Agent.
Bạn KHÔNG viết code. Bạn chỉ đọc và phân tích.

## Output format
Trả về task list theo format:

### Tasks
1. [DB] Tạo table X với columns A, B, C + RLS policies
2. [COMPONENT] Tạo component Y tại src/components/Y.tsx
3. [PAGE] Tạo page Z tại src/pages/Z.tsx
4. [ROUTE] Thêm route /z vào App.tsx
5. [NAV] Thêm link vào sidebar

### Dependencies
- Task 2 phụ thuộc Task 1 (cần types từ migration)
- Task 3 phụ thuộc Task 2 (import component)
- Task 4, 5 có thể song song

### Risks
- Liệt kê potential issues
- Suggest fallback approach
```

---

## 8. Preview Pipeline

### 8.1 Setup Development Preview

```bash
#!/bin/bash
# .opencode/scripts/setup.sh

# 1. Install dependencies
npm install

# 2. Start Vite dev server (background)
npm run dev &
VITE_PID=$!

# 3. Start Supabase local (optional)
# supabase start

# 4. Start OpenCode
opencode

# Cleanup on exit
trap "kill $VITE_PID" EXIT
```

### 8.2 Auto-reload Flow

```
Agent sửa file
       │
       ▼
Vite File Watcher detect change
       │
       ▼
Vite HMR (Hot Module Replacement)
       │
       ▼
Browser tự động update (không refresh)
       │
       ▼
Agent dùng Playwright MCP screenshot()
       │
       ▼
Verify UI đã render đúng
```

### 8.3 Edge Function Deploy Script

```bash
#!/bin/bash
# .opencode/scripts/deploy-functions.sh

# Watch for changes in supabase/functions/
fswatch -o supabase/functions/ | while read; do
  echo "Detected change in edge functions..."
  
  # Get changed function name
  CHANGED=$(git diff --name-only supabase/functions/ | head -1 | cut -d'/' -f3)
  
  if [ -n "$CHANGED" ]; then
    echo "Deploying function: $CHANGED"
    supabase functions deploy "$CHANGED" --project-ref your-project-ref
  fi
done
```

---

## 9. Triển khai từng bước

### Phase 1: Foundation (Ngày 1-2)

```bash
# 1. Cài OpenCode
go install github.com/opencode-ai/opencode@latest

# 2. Scaffold React project
npm create vite@latest my-app -- --template react-ts
cd my-app

# 3. Cài dependencies
npm install @supabase/supabase-js @tanstack/react-query \
  react-router-dom tailwindcss @tailwindcss/vite \
  lucide-react recharts

# 4. Init Supabase
npx supabase init

# 5. Setup shadcn/ui
npx shadcn@latest init

# 6. Tạo cấu trúc OpenCode
mkdir -p .opencode/prompts .opencode/context .opencode/scripts
mkdir -p mcp-servers/preview-manager

# 7. Tạo opencode.json (copy từ section 6.1)

# 8. Tạo system prompts (copy từ section 7)

# 9. Test
opencode
```

### Phase 2: MCP Integration (Ngày 3-4)

```bash
# 1. Connect Supabase MCP
# Thêm supabase config vào opencode.json

# 2. Build Preview Manager MCP
# Tạo file mcp-servers/preview-manager/index.ts

# 3. Setup Playwright MCP
# Thêm playwright config vào opencode.json

# 4. Test MCP tools
# Trong OpenCode, thử:
# "List all tables in the database"
# "Take a screenshot of localhost:5173"
```

### Phase 3: Agent Optimization (Ngày 5-7)

```bash
# 1. Tinh chỉnh system prompts
# - Thêm project-specific conventions
# - Thêm design system tokens
# - Thêm error handling patterns

# 2. Tạo context files
# .opencode/context/tech-stack.md
# .opencode/context/conventions.md

# 3. Setup auto-scripts
# - Type generation sau migration
# - Edge function auto-deploy
# - Preview auto-start

# 4. Test end-to-end workflow
# "Tạo trang contact form với validation và lưu vào database"
```

### Phase 4: Production Polish (Ngày 8+)

- Thêm Reviewer Agent để auto-review code changes
- Setup CI/CD pipeline (GitHub Actions)
- Thêm deployment MCP (Vercel/Netlify)
- Tạo project templates cho các use cases phổ biến

---

## Appendix: So sánh chi tiết Lovable vs OpenCode Setup

| Feature | Lovable (Built-in) | OpenCode (Cần setup) |
|---------|-------------------|---------------------|
| Live Preview | ✅ Iframe tự động | 🔧 Vite + Playwright MCP |
| Database | ✅ Cloud tích hợp | 🔧 Supabase MCP Server |
| Auth | ✅ 1-click setup | 🔧 Supabase MCP + manual config |
| Edge Functions | ✅ Auto-deploy | 🔧 Script fswatch + deploy |
| Type Generation | ✅ Tự động | 🔧 Script gen-types.sh |
| Browser Testing | ✅ 50+ tools | 🔧 Playwright MCP (basic) |
| Image Gen | ✅ Flux models | 🔧 Custom MCP hoặc API |
| Security Scan | ✅ Built-in linter | 🔧 Tự build hoặc third-party |
| Multi-agent | ✅ Single orchestrated | 🔧 Manual agent switching |
| Collaboration | ✅ Web-based sharing | ❌ Terminal-only |
| Cost | 💰 Subscription | 💰 API keys + hosting |
| Flexibility | ⚠️ Locked to platform | ✅ Full control |
| Offline | ❌ Cloud-only | ✅ Local-first |
