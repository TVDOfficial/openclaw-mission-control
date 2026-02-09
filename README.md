# OpenClaw Mission Control 🛰️

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)

A sleek, dark-themed web dashboard for managing your [OpenClaw](https://github.com/openclaw/openclaw) AI agent gateway. Built with Next.js 15, React 19, and Tailwind CSS v4.

![Mission Control](https://img.shields.io/badge/OpenClaw-Mission%20Control-6366f1?style=for-the-badge)

## ✨ Features

### 📊 Dashboard
- Real-time gateway status with online/offline indicators
- Active and total session counts with token usage
- Current model display and quick model switching
- One-click OpenClaw updates and gateway restart
- Recent sessions with activity timestamps

### 💻 Sessions
- List all active sessions with status indicators
- View session details: model, channel, token usage
- Click any session to view message history
- Send messages to any session directly
- Kill/reset sessions on demand

### 🤖 Agents & Sub-Bots
- View all configured agents and their status
- **Active Sub-Agents panel** — CodeMaster, ResearchBot, CreativeWriter, TaskPlanner
- Spawn new sub-agents with custom tasks, labels, and models
- Chat directly with sub-agents from the dashboard
- Bot Builder Chat — AI-assisted bot creation

### ⏰ Cron Jobs
- List all scheduled jobs with status and timing
- Create jobs with cron expressions, intervals, or one-shot triggers
- Enable/disable jobs on demand
- Run jobs manually
- View last run status and next scheduled run

### 📦 Skills
- List all installed skills (workspace + global)
- Install new skills via ClawHub
- Check for available skill updates

### 🧩 Models
- View all configured models and providers
- See authenticated provider status
- Quick primary model switching
- View model aliases and shortcuts
- Add API keys for providers

### 🌐 BotHub (Model Routing)
- Intelligent model routing by task type
- Assign models to: Chat, Tools, Image, Code, Fast tasks
- **Task Router** — Auto-detects task type and routes to appropriate model
- Local storage persistence for routing preferences
- Spawns sub-agents with routed models

### ⚙️ Configuration
- Full JSON config editor with syntax validation
- Live config reload without restart
- Success/error feedback
- View gateway status and connection details

### 🧠 Memory
- View and edit MEMORY.md contents
- Persistent storage of important context

## 📱 Mobile Support

Mission Control is fully optimized for mobile devices:
- **Responsive design** — Adapts to any screen size
- **Touch-friendly** — 44px minimum touch targets
- **Hamburger menu** — Easy navigation on small screens
- **No zoom on input** — iOS-friendly form fields
- **Slide-out sidebar** — Full-screen navigation overlay

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ (v25 recommended)
- **OpenClaw** gateway running locally
- **npm** or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/TVDOfficial/openclaw-mission-control.git
cd openclaw-mission-control

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your gateway URL and token:
#   OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
#   OPENCLAW_GATEWAY_TOKEN=your-token-here
```

### Running

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
node server.mjs
```

The dashboard will be available at **http://localhost:3333**

## 🔧 WSL2 Network Access

If running inside WSL2 and want access from other devices on your network:

### 1. Find your WSL2 IP
```bash
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

### 2. Port forward on Windows (PowerShell as Admin)
```powershell
# Port forward from Windows host to WSL2
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3333 connectaddress=<WSL2_IP> connectport=3333

# Open firewall
netsh advfirewall firewall add rule name="OpenClaw Mission Control" dir=in action=allow protocol=tcp localport=3333
```

### 3. Verify
```powershell
netsh interface portproxy show all
```

### 4. Access
From any device on your network: `http://<Windows_IP>:3333`

### Remove port forwarding (if needed)
```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3333
netsh advfirewall firewall delete rule name="OpenClaw Mission Control"
```

## 🔐 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENCLAW_GATEWAY_URL` | OpenClaw gateway URL | `http://127.0.0.1:18789` | No |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway authentication token | — | Yes |

> ⚠️ **Security Note:** Never commit `.env.local` with real credentials to version control.

## 📡 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/openclaw` | GET | Gateway health check |
| `/api/openclaw` | POST | Proxy to OpenClaw gateway tools/invoke |
| `/api/file` | GET | Read files via Node.js fs |
| `/api/file` | POST | Write files via Node.js fs |
| `/api/exec` | POST | Execute shell commands |

## 🛠️ Tech Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, React Server Components
- **[React 19](https://react.dev/)** — Latest React with concurrent features
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS
- **[Lucide React](https://lucide.dev/)** — Beautiful, consistent icons
- **Custom server** (`server.mjs`) — Production HTTP server with env loading

## 🎨 Customization

### Theme
The dark theme uses CSS variables defined in `globals.css`:
```css
--bg-primary: #0a0a0f
--bg-secondary: #12121a
--accent: #6366f1
--text-primary: #e4e4ef
```

### Adding New Features
The dashboard is modular — each panel is a separate component in `src/app/page.tsx`:
- `DashboardPanel` — Overview and stats
- `SessionsPanel` — Session management
- `AgentsPanel` — Sub-agent spawning and chat
- `BotHubPanel` — Model routing and task router
- etc.

## 🤝 Sub-Agents

Mission Control includes 4 pre-configured sub-agents:

| Agent | Purpose | Model |
|-------|---------|-------|
| **CodeMaster** 💻 | Coding, debugging, code review | Claude Opus 4 |
| **ResearchBot** 🔍 | Research, summaries, fact-checking | Gemini 2.5 Pro |
| **CreativeWriter** ✍️ | Stories, copy, creative content | Claude Sonnet 4 |
| **TaskPlanner** 📋 | Project planning, task breakdown | Gemini 3 Flash |

Use the Task Router in BotHub to automatically delegate tasks to the right agent, or chat with them directly from the Agents panel.

## 📝 License

MIT © [Mathew Pittard](https://github.com/TVDOfficial)

---

<p align="center">
  Built with 🦞 for the OpenClaw ecosystem
</p>
