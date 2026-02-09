# OpenClaw Mission Control 🛰️

A sleek, dark-themed web dashboard for managing your [OpenClaw](https://github.com/nicholasgriffintn/openclaw) AI agent gateway. Built with Next.js 15, React 19, and Tailwind CSS v4.

![Mission Control](https://img.shields.io/badge/OpenClaw-Mission%20Control-6366f1?style=for-the-badge)

## Screenshots

> *Screenshots coming soon*

## Features

### 📊 Dashboard
- Real-time gateway status (online/offline)
- Active and total session counts
- Current model display
- One-click OpenClaw updates
- Recent sessions with token usage

### 💻 Sessions
- List all sessions with status indicators, model info, and token counts
- Click any session to view message history
- Send messages to any session directly

### 🤖 Agents & Sub-Bots
- View all configured agents
- Spawn new sub-agents with custom task, label, and model

### ⏰ Cron Jobs
- List all cron jobs with status, schedule, last/next run times
- Create new jobs (cron expressions, intervals, or one-shot)
- Enable/disable, run on demand, or delete jobs

### 📦 Skills
- List all installed skills (workspace + global)
- Install new skills via ClewHub
- Check for skill updates

### 🧩 Models
- View model configuration and providers
- See configured models with aliases
- Quick config reload

### 🌐 BotHub
- Intelligent model routing configuration
- Assign different models to different task types (Chat, Tools, Vision, Code, Fast)
- Save routing preferences to gateway config

### ⚙️ Configuration
- Full JSON config editor with monospace textarea
- Native keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V)
- Save with validation, reset from server
- Success/error toast feedback

### 🧠 Memory
- View MEMORY.md contents
- Toggle editable mode to modify and save

## Prerequisites

- **Node.js** v20+ (v25 recommended)
- **OpenClaw** gateway running locally
- **npm** or compatible package manager

## Installation

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

# Build for production
npm run build

# Start the server
node server.mjs
```

The dashboard will be available at **http://localhost:3333**

## Development

```bash
npm run dev
```

Runs on port 3333 in dev mode with hot reload.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCLAW_GATEWAY_URL` | OpenClaw gateway URL | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway authentication token | — |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/openclaw` | GET/POST | Proxy to OpenClaw gateway tools/invoke |
| `/api/file` | GET/POST | Read/write files via Node.js fs |
| `/api/exec` | POST | Execute shell commands |

## Tech Stack

- **Next.js 15** — App Router, React Server Components
- **React 19** — Latest React with concurrent features
- **Tailwind CSS v4** — Utility-first CSS
- **Lucide React** — Beautiful, consistent icons
- **Custom server** (`server.mjs`) — Production HTTP server with env loading

## License

MIT
