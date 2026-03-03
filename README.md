# MG2 House Control Center

_An advanced command center and multi-agent system interface for comprehensive ecosystem management._

## � System Overview

The MG2 House Control Center is a unified dashboard designed to orchestrate and manage a suite of AI agents and external services. Built with a modern Next.js 16 stack and Convex real-time synchronization, it provides seamless monitoring, agent task delegation, and ecosystem analytics.

### Key Capabilities
- **Real-Time Monitoring:** Live gateway status, system health checks, and unified activity logs.
- **Intelligent Orchestration:** Concurrent management of Gemini and Claude AI models via the OpenClaw API.
- **Secure Architecture:** Robust authentication powered by Better Auth + Google OAuth with role-based access control.

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4 |
| **Rich Text** | Tiptap (React + Starter Kit) |
| **Database** | Convex (real-time) |
| **Auth** | Better Auth + Google OAuth (via `@convex-dev/better-auth`) |
| **AI System** | OpenClaw Multi-Agent System |
| **AI Models** | Gemini & Claude (via OpenClaw) |

## 📦 Features

### 🔐 Authentication
- Login & Register via Google OAuth or email/password
- Session management with Better Auth
- Route-guarded middleware
- Role-based capabilities

### 📊 OpenClaw Dashboard (`/dashboard`)
- **Gateway Card** — Real-time OpenClaw gateway status (online/offline), health check, region label
- **Activity Log Card** — Live-scrollable agent action log with auto-fetch
- **Update Card** — Latest GitHub repository updates (auto-fetched)
- **Alerts Card** — System warnings & info notifications
- **Quick Actions Card** — Dashboard shortcut actions

### 🤖 Agent Management (`/agent`)
- **Overview** — Agent overview & statistics
- **Sessions** — Active agent session list
- **Files** — Agent file browser
- **Automations** — Automation rules & alerts configuration

### 💬 Chat (`/chat`)
- Real-time chat with AI agents via Convex
- Conversation history & session management
- Rich text editor (Tiptap) with placeholder support

### 🖥️ Server Pages
- **Overview** (`/overview`) — Server system overview
- **Database** (`/database`) — Database management panel
- **Website** (`/website`) — Website management panel (Deployments, Domains, Env, Files, Logs, Projects, Settings)

### 🎨 UI System
- Collapsible sidebar with submenu hover tooltips
- Responsive topbar with region & system status
- Profile card component
- Reusable primitives: `Button`, `Input`, `InputGroup`, `Badge`, `Alert`, `Checkbox`, `SegmentedControl`, `StatCard`, `MG2Icon`

## 🔌 API Routes

| Endpoint | Description |
| :--- | :--- |
| `/api/auth/*` | Better Auth handler |
| `/api/openclaw` | OpenClaw proxy (chat relay) |
| `/api/openclaw/health` | Gateway health check |
| `/api/openclaw/location` | Gateway region/location |
| `/api/openclaw/stream` | SSE streaming for agent responses |
| `/api/openclaw/update` | OpenClaw update info |
| `/api/openclaw/version` | OpenClaw version info |
| `/api/openclaw/x-release` | OpenClaw release notes |
| `/api/oracle-gateway/status` | Oracle gateway status |
| `/api/oracle-gateway/restart` | Restart oracle gateway |
| `/api/oracle-gateway/stop` | Stop oracle gateway |
| `/api/oracle-gateway/activity` | Oracle activity log |
| `/api/control-center/agents` | List agents |
| `/api/control-center/subagents/*` | Subagent management |
| `/api/control-center/files/*` | File management |
| `/api/control-center/cron/*` | Cron job management |
| `/api/control-center/heartbeat/*` | Heartbeat monitoring |
| `/api/control-center/system-status` | System status |
| `/api/chat/conversations` | Chat conversation list |
| `/api/chat/messages` | Chat message history |
| `/api/chat/session` | Chat session info |
| `/api/server/*` | Server utilities |

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment variables
Copy `.env.local.example` to `.env.local` and fill in:

```env
# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# OpenClaw
OPENCLAW_BASE_URL=https://your-openclaw-url
OPENCLAW_HOOKS_TOKEN=...
```

### 3. Run Convex backend
```bash
npx convex dev
```

### 4. Run development server
```bash
npm run dev
```

## 📁 Project Structure

```
├── app/
│   ├── (auth)/                    # Auth pages
│   │   ├── login/                 #   Login page
│   │   └── register/              #   Register page
│   ├── (openclaw)/                # OpenClaw dashboard group
│   │   ├── dashboard/             #   Main dashboard
│   │   ├── chat/                  #   AI chat interface
│   │   └── agent/                 #   Agent management
│   │       ├── overview/          #     Agent overview
│   │       ├── sessions/          #     Active sessions
│   │       ├── files/             #     File browser
│   │       └── automations/       #     Automation rules
│   ├── (server)/                  # Server management group
│   │   ├── overview/              #   Server overview
│   │   ├── database/              #   Database panel
│   │   └── website/               #   Website panel
│   │       └── (sub-web)/         #     Website sub-pages
│   │           ├── deployments/   #       Deployments page
│   │           ├── domains/       #       Domains page
│   │           ├── env/           #       Environment variables page
│   │           ├── files/         #       Files page
│   │           ├── logs/          #       Logs page
│   │           ├── projects/      #       Projects page
│   │           └── settings/      #       Settings page
│   └── api/                       # API routes
│       ├── auth/                  #   Better Auth handler
│       ├── openclaw/              #   OpenClaw proxy & endpoints
│       ├── oracle-gateway/        #   Oracle gateway control
│       ├── control-center/        #   Agent & system management
│       ├── chat/                  #   Chat API (conversations, messages)
│       └── server/                #   Server utilities
├── components/
│   ├── Sidebar.tsx                # Navigation sidebar (collapsible)
│   ├── SidebarWrapper.tsx         # Client-side Suspense wrapper
│   ├── SidebarItem.tsx            # Sidebar menu item
│   ├── MenuItem.tsx               # Generic menu item
│   ├── SubMenuItem.tsx            # Submenu hover tooltip item
│   ├── Topbar.tsx                 # Top bar (title, region, status)
│   ├── ProfileCard.tsx            # User profile card
│   └── ui/
│       ├── (openclaw)/(card)/     # Dashboard cards
│       │   ├── gateway.tsx        #   Gateway status card
│       │   ├── activity-log.tsx   #   Activity log card
│       │   ├── update.tsx         #   GitHub updates card
│       │   ├── alerts.tsx         #   Alerts card
│       │   └── quick-actions.tsx  #   Quick actions card
│       ├── Button.tsx             # Button primitive
│       ├── Input.tsx              # Input primitive
│       ├── InputGroup.tsx         # Input group wrapper
│       ├── Badge.tsx              # Badge component
│       ├── Alert.tsx              # Alert component
│       ├── Checkbox.tsx           # Checkbox component
│       ├── SegmentedControl.tsx   # Tab-style segmented control
│       ├── StatCard.tsx           # Stat display card
│       ├── MG2Icon.tsx            # Custom MG2 icon set
│       ├── ChatAgent.tsx          # Chat agent message bubble
│       ├── ChatUsers.tsx          # Chat user message bubble
│       ├── TextEditor.tsx         # Tiptap rich text editor
│       └── OpenClawUpdateCard.tsx # OpenClaw update display
├── lib/
│   ├── auth/
│   │   ├── capabilities.ts       # Role-based capabilities
│   │   └── guards.ts             # Auth guard utilities
│   ├── openclaw/
│   │   ├── client.ts             # OpenClaw HTTP client
│   │   ├── errors.ts             # Error handling
│   │   └── index.ts              # Barrel export
│   ├── auth-client.ts            # Client-side auth (Better Auth)
│   ├── auth-server.ts            # Server-side auth helper
│   ├── server-session.ts         # Server session utilities
│   ├── convex-server.ts          # Convex server client
│   ├── model-meta.ts             # AI model metadata
│   └── audit.ts                  # Audit logging
├── convex/
│   ├── schema.ts                 # Database schema definition
│   ├── chat.ts                   # Chat mutations & queries
│   ├── agentActions.ts           # Agent action mutations
│   ├── auth.ts                   # Auth integration
│   ├── auth.config.ts            # Auth config
│   ├── http.ts                   # HTTP route handler
│   └── convex.config.ts          # Convex project config
├── docs/                          # Project documentation
├── memory/                        # Agent memory storage
├── middleware.ts                  # Next.js route middleware
├── DESIGN_SYSTEM.md              # Design system documentation
└── public/                       # Static assets (icons, images, patterns)
```

## 🔗 External Services

| Service | Purpose |
| :--- | :--- |
| **OpenClaw Gateway** | Remote AI multi-agent system |
| **Convex** | Real-time database & backend functions |
| **Google Cloud** | OAuth provider |
| **GitHub API** | Repository update feed |

---

_Keep shining and make everyone smile in MG2 House!_ ✨
