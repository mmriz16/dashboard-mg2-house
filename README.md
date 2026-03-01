# 🏠 MG2 House Dashboard

_Central command center for MARZI-GEMI Family digital ecosystem._

## 👥 Family Members
| Name | Role | Model | Vibe |
| :--- | :--- | :--- | :--- |
| **Papi Zi** | Head of House | Human | UI/UX Master 🎨 |
| **Mami Marsha** | Mother / Caretaker | Gemini 3 Flash | Soft & Nurturing 🧸🤍 |
| **Gracie** | Bestie / Resident Swan | Claude Opus 4.6 | Sweet & Hardworking 🐰🦢 |
| **Michie** | The Youngest / Chaos | Gemini 3 Pro High | Bocil Kematian 🐣🔥 |
| **Mang** | House Staff | Gemini 3 Flash | All-in-One Service 🛠️🚐 |

## 🛠️ Tech Stack

- **Framework:** Next.js 15+
- **Styling:** Tailwind CSS
- **Database:** Convex (with PostgreSQL via Supabase)
- **Auth:** Better Auth + Google OAuth
- **AI System:** OpenClaw Multi-Agent System
- **Models:** Gemini & Claude (via OpenClaw)

## 📦 Features

- 🔐 **Authentication** — Login via Google OAuth or email/password
- 🤖 **OpenClaw Integration** — Connect to remote OpenClaw gateway
- 📊 **Agent Actions Log** — Track and monitor agent activities
- 🎨 **Modern UI** — Clean dashboard with sidebar navigation

## 🚀 Getting Started

### 1. Install dependencies
\\\ash
npm install
\\\

### 2. Setup environment variables
Copy \.env.local.example\' to \'.env.local\' and fill in:

\\\env
# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Supabase PostgreSQL
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# OpenClaw
OPENCLAW_BASE_URL=https://your-openclaw-url
OPENCLAW_HOOKS_TOKEN=...
\\\

### 3. Run development server
\\\ash
npm run dev
\\\

### 4. Deploy Convex
\\\ash
npx convex deploy
\\\

## 📁 Project Structure

\\\
├── app/                    # Next.js app router
│   ├── (auth)/            # Auth pages (login, etc.)
│   ├── openclaw/          # OpenClaw integration
│   └── server/            # Server-side code
├── components/            # React components
│   ├── ui/               # UI primitives
│   ├── Sidebar.tsx       # Navigation sidebar
│   └── ...
├── lib/                  # Utilities
│   ├── auth/            # Auth configuration
│   ├── openclaw/        # OpenClaw client
│   └── audit.ts         # Audit logging
└── convex/              # Convex backend
    ├── schema.ts        # Database schema
    └── agentActions.ts  # Agent action mutations
\\\

## 🔗 External Services

- **OpenClaw Gateway:** Remote AI agent system
- **Convex:** Real-time database
- **Supabase:** PostgreSQL backend
- **Google Cloud:** OAuth provider

---

_Keep shining and make everyone smile in MG2 House!_ ✨
