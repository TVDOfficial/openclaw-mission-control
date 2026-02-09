"use client";

import { useState, useEffect, useCallback } from "react";
import { invokeTool, getHealth, readFileApi, writeFileApi, runExec } from "@/lib/api";
import {
  Activity, Bot, Clock, Cpu, Zap, Terminal, Settings, BrainCircuit,
  Play, Trash2, RefreshCw, Plus, Send, ChevronDown, ChevronRight,
  Circle, AlertCircle, CheckCircle2, Loader2, Satellite, LayoutDashboard,
  Package, Layers, Network, Download, Save, X, MessageSquare, Key
} from "lucide-react";

/* ─── Types ─── */
interface Session {
  key: string; agentId?: string; kind?: string; model?: string; channel?: string;
  displayName?: string; createdAt?: string; updatedAt?: number; lastActivity?: string;
  totalTokens?: number; contextTokens?: number;
  messages?: { role: string; content: string; ts?: string }[];
  [k: string]: unknown;
}
interface CronJob {
  id?: string; jobId?: string; name?: string; enabled?: boolean; agentId?: string;
  schedule?: { kind: string; expr?: string; everyMs?: number; at?: string; tz?: string };
  payload?: { kind: string; text?: string; message?: string };
  sessionTarget?: string;
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number };
  [k: string]: unknown;
}
interface Agent { id: string; name?: string; configured?: boolean; [k: string]: unknown; }

/* ─── Sidebar Tabs ─── */
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sessions", label: "Sessions", icon: Terminal },
  { id: "agents", label: "Agents & Sub-Bots", icon: Bot },
  { id: "cron", label: "Cron Jobs", icon: Clock },
  { id: "skills", label: "Skills", icon: Package },
  { id: "models", label: "Models", icon: Layers },
  { id: "bothub", label: "BotHub", icon: Network },
  { id: "config", label: "Configuration", icon: Settings },
  { id: "memory", label: "Memory", icon: BrainCircuit },
] as const;
type TabId = (typeof TABS)[number]["id"];

/* ─── Known models per provider ─── */
const KNOWN_MODELS: Record<string, { id: string; label: string; cost: string; best: string }[]> = {
  anthropic: [
    { id: "anthropic/claude-opus-4-6", label: "Claude Opus 4", cost: "$$$", best: "Complex reasoning, coding" },
    { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4", cost: "$$", best: "Tool use, balanced" },
    { id: "anthropic/claude-haiku-3-5-20241022", label: "Claude Haiku 3.5", cost: "$", best: "Fast, cheap tasks" },
  ],
  google: [
    { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro", cost: "$$", best: "Long context, analysis" },
    { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", cost: "$", best: "Fast, cheap, summaries" },
    { id: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", cost: "$", best: "Fast tasks" },
  ],
  "ollama-local": [
    { id: "ollama-local/qwen3:8b", label: "Qwen3 8B", cost: "Free", best: "Chat, local, free" },
    { id: "ollama-local/llama3:8b", label: "Llama 3 8B", cost: "Free", best: "Chat, coding" },
    { id: "ollama-local/mistral:7b", label: "Mistral 7B", cost: "Free", best: "General, fast" },
    { id: "ollama-local/codellama:13b", label: "Code Llama 13B", cost: "Free", best: "Coding" },
    { id: "ollama-local/deepseek-coder-v2:16b", label: "DeepSeek Coder V2", cost: "Free", best: "Coding" },
  ],
};

/* ─── Helpers ─── */
function ago(ts: string | number | undefined): string {
  if (!ts) return "—";
  const time = typeof ts === "number" ? ts : new Date(ts).getTime();
  const d = Date.now() - time;
  if (d < 0) return "just now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h ago`;
  return `${Math.floor(d / 86400_000)}d ago`;
}
function formatDate(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}
function StatusDot({ ok }: { ok: boolean }) {
  return <Circle size={10} fill={ok ? "var(--green)" : "var(--red)"} stroke="none" className={ok ? "status-pulse" : ""} />;
}
const inputCls = "bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = `${inputCls} resize-y font-mono`;

/* ─── Main ─── */
export default function MissionControl() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [config, setConfig] = useState<string>("");
  const [memory, setMemory] = useState<string>("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const setL = (key: string, val: boolean) => setLoading((p) => ({ ...p, [key]: val }));

  const fetchHealth = useCallback(async () => {
    setL("health", true);
    try { setHealth(await getHealth()); } catch { setHealth(null); }
    setL("health", false);
  }, []);

  const fetchSessions = useCallback(async () => {
    setL("sessions", true);
    try {
      const data = await invokeTool("sessions_list", { limit: 50, messageLimit: 3 });
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch { setSessions([]); }
    setL("sessions", false);
  }, []);

  const fetchAgents = useCallback(async () => {
    setL("agents", true);
    try {
      const data = await invokeTool("agents_list", {});
      setAgents(Array.isArray(data?.agents) ? data.agents : []);
    } catch { setAgents([]); }
    setL("agents", false);
  }, []);

  const fetchCron = useCallback(async () => {
    setL("cron", true);
    try {
      const data = await invokeTool("cron", { action: "list", includeDisabled: true });
      setCronJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch { setCronJobs([]); }
    setL("cron", false);
  }, []);

  const fetchConfig = useCallback(async () => {
    setL("config", true);
    try {
      const data = await invokeTool("gateway", { action: "config.get" });
      const parsed = data?.parsed || data?.config || data;
      setConfig(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
    } catch { setConfig("Failed to load config"); }
    setL("config", false);
  }, []);

  const fetchMemory = useCallback(async () => {
    setL("memory", true);
    try { setMemory(await readFileApi("/home/tvd/.openclaw/workspace/MEMORY.md")); }
    catch { setMemory("Failed to load memory"); }
    setL("memory", false);
  }, []);

  useEffect(() => {
    fetchHealth(); fetchSessions();
    const i = setInterval(() => { fetchHealth(); fetchSessions(); }, 30_000);
    return () => clearInterval(i);
  }, [fetchHealth, fetchSessions]);

  useEffect(() => {
    if (tab === "agents") fetchAgents();
    if (tab === "cron") fetchCron();
    if (tab === "config") fetchConfig();
    if (tab === "memory") fetchMemory();
  }, [tab, fetchAgents, fetchCron, fetchConfig, fetchMemory]);

  const isOnline = health && (health.ok !== false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all ${sidebarCollapsed ? "w-16" : "w-56"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]">
          <Satellite size={24} className="text-[var(--accent)] shrink-0" />
          {!sidebarCollapsed && <span className="font-bold text-sm tracking-wide">MISSION CONTROL</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all ${
                tab === id ? "text-[var(--accent)] bg-[rgba(99,102,241,0.1)] border-r-2 border-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              }`}>
              <Icon size={18} />
              {!sidebarCollapsed && label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <StatusDot ok={!!isOnline} />
            {!sidebarCollapsed && <span className="text-xs text-[var(--text-secondary)]">{isOnline ? "Gateway Online" : "Offline"}</span>}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {tab === "dashboard" && <DashboardPanel health={health} sessions={sessions} isOnline={!!isOnline} loading={loading.health} onRefresh={() => { fetchHealth(); fetchSessions(); }} />}
        {tab === "sessions" && <SessionsPanel sessions={sessions} loading={loading.sessions} onRefresh={fetchSessions} />}
        {tab === "agents" && <AgentsPanel agents={agents} loading={loading.agents} onRefresh={fetchAgents} />}
        {tab === "cron" && <CronPanel jobs={cronJobs} loading={loading.cron} onRefresh={fetchCron} />}
        {tab === "skills" && <SkillsPanel />}
        {tab === "models" && <ModelsPanel />}
        {tab === "bothub" && <BotHubPanel />}
        {tab === "config" && <ConfigPanel config={config} setConfig={setConfig} loading={loading.config} onRefresh={fetchConfig} />}
        {tab === "memory" && <MemoryPanel memory={memory} loading={loading.memory} onRefresh={fetchMemory} />}
      </main>
    </div>
  );
}

/* ═══════════════════════ DASHBOARD ═══════════════════════ */
function DashboardPanel({ health, sessions, isOnline, loading, onRefresh }: {
  health: Record<string, unknown> | null; sessions: Session[]; isOnline: boolean; loading?: boolean; onRefresh: () => void;
}) {
  const [updateOut, setUpdateOut] = useState("");
  const [updating, setUpdating] = useState(false);
  const activeSessions = sessions.filter((s) => s.updatedAt && Date.now() - s.updatedAt < 3600_000);

  async function checkUpdate() {
    setUpdating(true); setUpdateOut("Checking...");
    try {
      const r = await runExec("openclaw update --json --yes 2>&1 | head -50 || true");
      setUpdateOut(r.stdout || r.stderr || "No output");
    } catch (e: unknown) { setUpdateOut(String(e)); }
    setUpdating(false);
  }
  async function doUpdate() {
    setUpdating(true); setUpdateOut("Updating...");
    try {
      const data = await invokeTool("gateway", { action: "update.run" });
      setUpdateOut(JSON.stringify(data, null, 2));
    } catch (e: unknown) { setUpdateOut(String(e)); }
    setUpdating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Activity className="text-[var(--accent)]" /> Dashboard</h1>
        <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Gateway" value={isOnline ? "ONLINE" : "OFFLINE"} icon={<Zap size={20} />} color={isOnline ? "var(--green)" : "var(--red)"} />
        <MetricCard label="Active Sessions" value={String(activeSessions.length)} icon={<Terminal size={20} />} color="var(--cyan)" />
        <MetricCard label="Total Sessions" value={String(sessions.length)} icon={<Cpu size={20} />} color="var(--accent)" />
        <MetricCard label="Model" value="Opus 4" icon={<BrainCircuit size={20} />} color="var(--orange)" sub="claude-opus-4-6" />
      </div>
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><Download size={14} /> OpenClaw Updates</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={checkUpdate} disabled={updating} className="btn-secondary flex items-center gap-2">
            {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check for Updates
          </button>
          <button onClick={doUpdate} disabled={updating} className="btn-primary flex items-center gap-2">
            <Download size={14} /> Update Now
          </button>
        </div>
        {updateOut && <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">{updateOut}</pre>}
      </div>
      <div className="card p-5">
        <h2 className="section-title mb-4">Recent Sessions</h2>
        <div className="space-y-2">
          {sessions.slice(0, 8).map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg-card-hover)]">
              <div className="flex items-center gap-3">
                <StatusDot ok={!!s.updatedAt && Date.now() - s.updatedAt < 3600_000} />
                <div>
                  <span className="font-mono text-sm">{s.displayName || s.key}</span>
                  {s.channel && <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.15)] text-[var(--accent)]">{s.channel}</span>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-secondary)]">{ago(s.updatedAt)}</span>
                {s.totalTokens && <div className="text-xs text-[var(--text-secondary)]">{(s.totalTokens / 1000).toFixed(1)}k tokens</div>}
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-[var(--text-secondary)] text-sm">No sessions found</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="section-title">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="metric-value" style={{ color }}>{value}</div>
      {sub && <span className="text-xs text-[var(--text-secondary)] mt-1 block">{sub}</span>}
    </div>
  );
}

/* ═══════════════════════ SESSIONS ═══════════════════════ */
function SessionsPanel({ sessions, loading, onRefresh }: { sessions: Session[]; loading?: boolean; onRefresh: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [sendTarget, setSendTarget] = useState("");

  async function loadHistory(key: string) {
    setSelected(key); setHistoryLoading(true);
    try {
      const data = await invokeTool("sessions_history", { sessionKey: key, limit: 20 });
      const msgs = data?.messages || data || [];
      setHistory(Array.isArray(msgs) ? msgs : []);
    } catch { setHistory([]); }
    setHistoryLoading(false);
  }

  async function handleSend() {
    if (!sendMsg.trim() || !sendTarget.trim()) return;
    await invokeTool("sessions_send", { sessionKey: sendTarget, message: sendMsg });
    setSendMsg("");
    if (sendTarget === selected) loadHistory(selected);
  }

  async function killSession(key: string) {
    if (!confirm(`End session "${key}"? This will reset it.`)) return;
    await invokeTool("sessions_send", { sessionKey: key, message: "/reset" });
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Terminal className="text-[var(--accent)]" /> Sessions</h1>
        <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      <div className="card p-4">
        <h3 className="section-title mb-3">Send Message to Session</h3>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-none w-40`} placeholder="Session key..." value={sendTarget} onChange={(e) => setSendTarget(e.target.value)} />
          <input className={`${inputCls} flex-1`} placeholder="Message..." value={sendMsg} onChange={(e) => setSendMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          <button onClick={handleSend} className="btn-primary flex items-center gap-2"><Send size={14} /> Send</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-1 max-h-[600px] overflow-y-auto">
          <h3 className="section-title mb-3">All Sessions</h3>
          {sessions.map((s) => (
            <button key={s.key} onClick={() => loadHistory(s.key)}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-left transition-all ${
                selected === s.key ? "bg-[rgba(99,102,241,0.15)] border border-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)] border border-transparent"
              }`}>
              <div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={!!s.updatedAt && Date.now() - s.updatedAt < 3600_000} />
                  <span className="font-mono text-sm">{s.displayName || s.key}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5 ml-5">
                  {s.model && <span>{s.model}</span>}
                  {s.totalTokens ? <span> · {(s.totalTokens / 1000).toFixed(1)}k tok</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">{ago(s.updatedAt)}</span>
                <button onClick={(e) => { e.stopPropagation(); killSession(s.key); }} className="btn-danger text-xs py-0.5 px-1.5 flex items-center gap-1" title="End session">
                  <X size={10} />
                </button>
              </div>
            </button>
          ))}
        </div>
        <div className="card p-4 max-h-[600px] overflow-y-auto">
          <h3 className="section-title mb-3">{selected ? `History: ${selected.slice(0, 30)}...` : "Select a session"}</h3>
          {historyLoading && <Loader2 className="animate-spin text-[var(--accent)]" />}
          {!historyLoading && history.length === 0 && selected && <p className="text-[var(--text-secondary)] text-sm">No messages</p>}
          <div className="space-y-2">
            {(history as { role?: string; content?: string }[]).map((m, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${m.role === "assistant" ? "bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)]" : "bg-[var(--bg-primary)] border border-[var(--border)]"}`}>
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">{m.role || "unknown"}</span>
                <p className="whitespace-pre-wrap break-words text-xs mt-1">{typeof m.content === "string" ? m.content.slice(0, 500) : JSON.stringify(m.content)?.slice(0, 500)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ AGENTS ═══════════════════════ */
function AgentsPanel({ agents, loading, onRefresh }: { agents: Agent[]; loading?: boolean; onRefresh: () => void }) {
  const [task, setTask] = useState(""); const [label, setLabel] = useState(""); const [model, setModel] = useState("");
  const [spawning, setSpawning] = useState(false); const [spawnResult, setSpawnResult] = useState<string | null>(null);
  // Chat box state
  const [chatMsgs, setChatMsgs] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSession, setChatSession] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  async function spawnAgent() {
    if (!task.trim()) return;
    setSpawning(true); setSpawnResult(null);
    try {
      const args: Record<string, unknown> = { task };
      if (label.trim()) args.label = label;
      if (model.trim()) args.model = model;
      setSpawnResult(JSON.stringify(await invokeTool("sessions_spawn", args), null, 2));
    } catch (e: unknown) { setSpawnResult(e instanceof Error ? e.message : "Spawn failed"); }
    setSpawning(false);
  }

  async function startBotChat() {
    setChatLoading(true);
    setChatMsgs([{ role: "assistant", content: "Hi! I'll help you build a new bot. What should it be called, and what do you want it to do?" }]);
    try {
      const data = await invokeTool("sessions_spawn", {
        task: "You are a bot creation assistant. Help the user design and configure a new OpenClaw agent/bot. Ask what they want it to be called, what it should do, what model to use, personality, etc. Guide them step by step. When they're done, output a summary config they can use.",
        label: "Bot Builder Chat",
      });
      setChatSession(data?.childSessionKey || data?.sessionKey || null);
    } catch { setChatMsgs(prev => [...prev, { role: "system", content: "Failed to start chat session." }]); }
    setChatLoading(false);
  }

  async function sendChatMsg() {
    if (!chatInput.trim() || !chatSession) return;
    const msg = chatInput;
    setChatInput("");
    setChatMsgs(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const data = await invokeTool("sessions_send", { sessionKey: chatSession, message: msg });
      const reply = typeof data === "string" ? data : data?.reply || data?.content || JSON.stringify(data);
      setChatMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "system", content: "Failed to send message." }]);
    }
    setChatLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Bot className="text-[var(--accent)]" /> Agents & Sub-Bots</h1>
        <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      <div className="card p-5 glow-border">
        <h2 className="section-title mb-4 flex items-center gap-2"><Plus size={14} /> Spawn New Sub-Agent</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input className={inputCls} placeholder="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <textarea className={`${textareaCls} w-full min-h-[100px]`} placeholder="Task description..." value={task} onChange={(e) => setTask(e.target.value)} />
          <button onClick={spawnAgent} className="btn-primary flex items-center gap-2" disabled={spawning}>
            {spawning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Spawn Agent
          </button>
          {spawnResult && <pre className="text-xs bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)] overflow-auto max-h-40 font-mono text-[var(--text-secondary)]">{spawnResult}</pre>}
        </div>
      </div>

      {/* Bot Builder Chat */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><MessageSquare size={14} /> Bot Builder Chat</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">Use AI to help you design and build a new bot. The assistant will guide you through naming, capabilities, and configuration.</p>
        {chatMsgs.length === 0 ? (
          <button onClick={startBotChat} disabled={chatLoading} className="btn-primary flex items-center gap-2">
            {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />} Start New Bot Chat
          </button>
        ) : (
          <div>
            <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-3 max-h-[300px] overflow-y-auto mb-3 space-y-2">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`p-2 rounded text-sm ${m.role === "assistant" ? "bg-[rgba(99,102,241,0.1)]" : m.role === "user" ? "bg-[var(--bg-card)] ml-8" : "bg-[rgba(239,68,68,0.1)]"}`}>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">{m.role}</span>
                  <p className="text-xs mt-1 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
              {chatLoading && <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
            </div>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} placeholder="Type your message..." value={chatInput}
                onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMsg()} />
              <button onClick={sendChatMsg} disabled={chatLoading} className="btn-primary flex items-center gap-2"><Send size={14} /></button>
              <button onClick={() => { setChatMsgs([]); setChatSession(null); }} className="btn-secondary flex items-center gap-2"><X size={14} /></button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4">Configured Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((a) => (
            <div key={a.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center"><Bot size={20} className="text-[var(--accent)]" /></div>
              <div>
                <div className="font-semibold text-sm">{a.name || a.id}</div>
                <div className="text-xs text-[var(--text-secondary)]">{a.configured ? "✓ Configured" : "Not configured"}</div>
              </div>
            </div>
          ))}
          {agents.length === 0 && <p className="text-[var(--text-secondary)] text-sm col-span-full">No agents found</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ CRON JOBS ═══════════════════════ */
function CronPanel({ jobs, loading, onRefresh }: { jobs: CronJob[]; loading?: boolean; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newJob, setNewJob] = useState({ name: "", scheduleKind: "cron" as "cron"|"every"|"at", expr: "", everyMs: "", at: "", tz: "Australia/Perth", payloadKind: "agentTurn" as "agentTurn"|"systemEvent", message: "", sessionTarget: "isolated" as "isolated"|"main" });

  async function createJob() {
    const schedule: Record<string, unknown> = { kind: newJob.scheduleKind };
    if (newJob.scheduleKind === "cron") { schedule.expr = newJob.expr; schedule.tz = newJob.tz; }
    if (newJob.scheduleKind === "every") { schedule.everyMs = parseInt(newJob.everyMs); }
    if (newJob.scheduleKind === "at") { schedule.at = newJob.at; }
    const payload: Record<string, unknown> = { kind: newJob.payloadKind };
    if (newJob.payloadKind === "agentTurn") payload.message = newJob.message; else payload.text = newJob.message;
    await invokeTool("cron", { action: "add", job: { name: newJob.name || undefined, schedule, payload, sessionTarget: newJob.sessionTarget, enabled: true } });
    setShowCreate(false); onRefresh();
  }
  async function toggleJob(job: CronJob) { await invokeTool("cron", { action: "update", jobId: job.id, patch: { enabled: !job.enabled } }); onRefresh(); }
  async function runJob(job: CronJob) { await invokeTool("cron", { action: "run", jobId: job.id }); }
  async function deleteJob(job: CronJob) { if (!confirm(`Delete job "${job.name || job.id}"?`)) return; await invokeTool("cron", { action: "remove", jobId: job.id }); onRefresh(); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Clock className="text-[var(--accent)]" /> Cron Jobs</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2"><Plus size={14} /> New Job</button>
          <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}</button>
        </div>
      </div>
      {showCreate && (
        <div className="card p-5 glow-border space-y-3">
          <h2 className="section-title mb-2">Create Cron Job</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Job name" value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })} />
            <select className={selectCls} value={newJob.scheduleKind} onChange={(e) => setNewJob({ ...newJob, scheduleKind: e.target.value as "cron"|"every"|"at" })}>
              <option value="cron">Cron Expression</option><option value="every">Interval (ms)</option><option value="at">One-shot</option>
            </select>
            {newJob.scheduleKind === "cron" && <input className={inputCls} placeholder="e.g. 0 9 * * 1" value={newJob.expr} onChange={(e) => setNewJob({ ...newJob, expr: e.target.value })} />}
            {newJob.scheduleKind === "every" && <input className={inputCls} placeholder="Interval ms" value={newJob.everyMs} onChange={(e) => setNewJob({ ...newJob, everyMs: e.target.value })} />}
            {newJob.scheduleKind === "at" && <input className={inputCls} placeholder="ISO timestamp" value={newJob.at} onChange={(e) => setNewJob({ ...newJob, at: e.target.value })} />}
            <select className={selectCls} value={newJob.sessionTarget} onChange={(e) => setNewJob({ ...newJob, sessionTarget: e.target.value as "isolated"|"main" })}>
              <option value="isolated">Isolated Session</option><option value="main">Main Session</option>
            </select>
          </div>
          <textarea className={`${textareaCls} w-full min-h-[80px]`} placeholder="Task message..." value={newJob.message} onChange={(e) => setNewJob({ ...newJob, message: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={createJob} className="btn-primary">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {job.enabled ? <CheckCircle2 size={18} className="text-[var(--green)]" /> : <AlertCircle size={18} className="text-[var(--text-secondary)]" />}
                <div>
                  <div className="font-semibold text-sm">{job.name || job.id}</div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    {job.schedule?.kind === "cron" && `cron: ${job.schedule.expr}`}
                    {job.schedule?.kind === "every" && `every ${(job.schedule.everyMs || 0) / 1000}s`}
                    {job.schedule?.kind === "at" && `at: ${job.schedule.at}`}
                    {" · "}{job.sessionTarget || "isolated"}{" · "}{job.payload?.kind}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {job.state?.lastRunAtMs && <span>Last: {ago(job.state.lastRunAtMs)} ({job.state.lastStatus})</span>}
                    {job.state?.nextRunAtMs && <span> · Next: {formatDate(job.state.nextRunAtMs)}</span>}
                  </div>
                  {job.payload?.message && <div className="text-xs text-[var(--text-secondary)] mt-1 italic max-w-md truncate">&quot;{job.payload.message}&quot;</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => runJob(job)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Play size={12} /> Run</button>
                <button onClick={() => toggleJob(job)} className="btn-secondary text-xs py-1 px-2">{job.enabled ? "Disable" : "Enable"}</button>
                <button onClick={() => deleteJob(job)} className="btn-danger text-xs py-1 px-2 flex items-center gap-1"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <div className="card p-8 text-center text-[var(--text-secondary)]">No cron jobs configured</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════ SKILLS ═══════════════════════ */
function SkillsPanel() {
  const [skills, setSkills] = useState<{ name: string; path: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [installInput, setInstallInput] = useState("");

  async function fetchSkills() {
    setLoading(true);
    try {
      const r = await runExec("ls -d /home/tvd/.openclaw/workspace/skills/*/SKILL.md /home/linuxbrew/.linuxbrew/lib/node_modules/openclaw/skills/*/SKILL.md 2>/dev/null || echo ''");
      const paths = r.stdout.trim().split("\n").filter(Boolean);
      setSkills(paths.map((p) => {
        const parts = p.replace("/SKILL.md", "").split("/");
        return { name: parts[parts.length - 1], path: p.replace("/SKILL.md", "") };
      }));
    } catch { setSkills([]); }
    setLoading(false);
  }

  useEffect(() => { fetchSkills(); }, []);

  async function checkUpdates() {
    setOutput("Checking for updates...");
    try {
      const r = await runExec("cd /home/tvd/.openclaw/workspace && clawhub list 2>&1");
      setOutput(r.stdout || r.stderr || "Done");
    } catch (e: unknown) { setOutput(String(e)); }
  }

  async function installSkill() {
    if (!installInput.trim()) return;
    setOutput(`Installing ${installInput}...`);
    try {
      const r = await runExec(`cd /home/tvd/.openclaw/workspace && clawhub install ${installInput} 2>&1`);
      setOutput(r.stdout || r.stderr || "Done"); setInstallInput(""); fetchSkills();
    } catch (e: unknown) { setOutput(String(e)); }
  }

  async function updateSkill(name: string) {
    setOutput(`Updating ${name}...`);
    try {
      const r = await runExec(`cd /home/tvd/.openclaw/workspace && clawhub update ${name} 2>&1`);
      setOutput(r.stdout || r.stderr || "Done"); fetchSkills();
    } catch (e: unknown) { setOutput(String(e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Package className="text-[var(--accent)]" /> Skills</h1>
        <div className="flex gap-2">
          <button onClick={checkUpdates} className="btn-secondary flex items-center gap-2"><RefreshCw size={14} /> Check Updates</button>
          <button onClick={fetchSkills} className="btn-secondary flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}</button>
        </div>
      </div>
      <div className="card p-4">
        <h3 className="section-title mb-3">Install New Skill</h3>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} placeholder="Skill slug (e.g. weather, gifgrep)..." value={installInput} onChange={(e) => setInstallInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && installSkill()} />
          <button onClick={installSkill} className="btn-primary flex items-center gap-2"><Plus size={14} /> Install</button>
        </div>
      </div>
      <div className="space-y-3">
        {skills.map((s) => (
          <div key={s.name} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={18} className="text-[var(--accent)]" />
              <div>
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-md">{s.path}</div>
              </div>
            </div>
            <button onClick={() => updateSkill(s.name)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Download size={12} /> Update</button>
          </div>
        ))}
        {skills.length === 0 && !loading && <div className="card p-8 text-center text-[var(--text-secondary)]">No skills found</div>}
      </div>
      {output && <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-lg overflow-auto max-h-60 whitespace-pre-wrap border border-[var(--border)]">{output}</pre>}
    </div>
  );
}

/* ═══════════════════════ MODELS ═══════════════════════ */
function ModelsPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newProvider, setNewProvider] = useState("anthropic");
  const [modelsOutput, setModelsOutput] = useState("");
  const [authProviders, setAuthProviders] = useState<{ name: string; status: string }[]>([]);

  async function fetchConfig() {
    setLoading(true);
    try {
      const data = await invokeTool("gateway", { action: "config.get" });
      setCfg(data?.parsed || data?.config || data);
    } catch { setCfg(null); }
    setLoading(false);
    // Fetch live model info in background (slower, don't block UI)
    try {
      const r = await runExec("openclaw models 2>&1");
      setModelsOutput(r.stdout || r.stderr || "");
      const lines = (r.stdout || "").split("\n");
      const provs: { name: string; status: string }[] = [];
      for (const line of lines) {
        const m = line.match(/^- (\S+)\s+effective=(.+)/);
        if (m) provs.push({ name: m[1], status: m[2] });
      }
      setAuthProviders(provs);
    } catch {}
  }
  useEffect(() => { fetchConfig(); }, []);

  // Build a flat list of all model IDs for dropdowns
  function getAllModelIds(): string[] {
    const ids: string[] = [];
    // From configured models
    for (const modelId of Object.keys(agentModels)) {
      if (!ids.includes(modelId)) ids.push(modelId);
    }
    // From known models for authenticated providers
    for (const profileKey of Object.keys(cfg?.auth?.profiles || {})) {
      const base = profileKey.split(":")[0];
      if (KNOWN_MODELS[base]) {
        for (const km of KNOWN_MODELS[base]) {
          if (!ids.includes(km.id)) ids.push(km.id);
        }
      }
    }
    // From custom providers
    for (const [pk, pv] of Object.entries(modelProviders)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = pv as any;
      if (pd?.models && Array.isArray(pd.models)) {
        for (const m of pd.models) {
          const id = `${pk}/${m.id}`;
          if (!ids.includes(id)) ids.push(id);
        }
      }
      const knownKey = pk.includes("ollama") ? "ollama-local" : pk;
      if (KNOWN_MODELS[knownKey]) {
        for (const km of KNOWN_MODELS[knownKey]) {
          if (!ids.includes(km.id)) ids.push(km.id);
        }
      }
    }
    if (primaryModel && !ids.includes(primaryModel)) ids.unshift(primaryModel);
    return ids;
  }

  const modelProviders = cfg?.models?.providers || {};
  const agentModels = cfg?.agents?.defaults?.models || {};
  const primaryModel = cfg?.agents?.defaults?.model?.primary || "Not set";

  async function setApiKeyEnv() {
    if (!newApiKey.trim()) return;
    setFeedback("Setting API key...");
    try {
      const envVar = newProvider === "anthropic" ? "ANTHROPIC_API_KEY" : newProvider === "google" ? "GOOGLE_API_KEY" : newProvider === "openrouter" ? "OPENROUTER_API_KEY" : "OLLAMA_API_KEY";
      const r = await runExec(`echo "export ${envVar}='${newApiKey}'" >> ~/.bashrc && echo "Set ${envVar}"`);
      setFeedback(`✓ ${r.stdout.trim() || "API key set"} — restart OpenClaw to apply`);
      setNewApiKey("");
    } catch (e: unknown) { setFeedback(`Error: ${e}`); }
    setTimeout(() => setFeedback(""), 5000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Layers className="text-[var(--accent)]" /> Models</h1>
        <button onClick={fetchConfig} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      {feedback && <div className={`text-sm px-3 py-2 rounded-lg ${feedback.startsWith("✓") ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]" : feedback.startsWith("Error") ? "bg-[rgba(239,68,68,0.15)] text-[var(--red)]" : "text-[var(--text-secondary)]"}`}>{feedback}</div>}

      {/* Primary Model with setter */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Default Model</h2>
        <div className="flex items-center gap-3 mb-3">
          <BrainCircuit size={24} className="text-[var(--accent)]" />
          <div className="text-lg font-bold text-[var(--accent)]">{primaryModel}</div>
        </div>
        <div className="flex gap-2">
          <select className={`${selectCls} flex-1`} value={primaryModel} onChange={async (e) => {
            const newModel = e.target.value;
            if (!cfg || !newModel) return;
            setFeedback("Saving default model...");
            try {
              const updated = { ...cfg, agents: { ...cfg.agents, defaults: { ...cfg.agents?.defaults, model: { ...cfg.agents?.defaults?.model, primary: newModel } } } };
              await invokeTool("gateway", { action: "config.apply", raw: JSON.stringify(updated, null, 2) });
              setFeedback("✓ Default model updated — gateway restarting");
              setTimeout(fetchConfig, 3000);
            } catch (e: unknown) { setFeedback(`Error: ${e}`); }
            setTimeout(() => setFeedback(""), 5000);
          }}>
            {getAllModelIds().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Configured Models & Aliases */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Configured Models & Aliases</h2>
        <div className="space-y-2">
          {Object.entries(agentModels).map(([modelId, config]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const alias = (config as any)?.alias;
            return (
              <div key={modelId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <div>
                  <span className="font-mono text-sm">{modelId}</span>
                  {alias && <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.15)] text-[var(--accent)]">alias: {alias}</span>}
                </div>
                <CheckCircle2 size={16} className="text-[var(--green)]" />
              </div>
            );
          })}
          {Object.keys(agentModels).length === 0 && <p className="text-sm text-[var(--text-secondary)]">No model aliases configured</p>}
        </div>
      </div>

      {/* Auth Providers (from openclaw models) */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Authenticated Providers</h2>
        {authProviders.length > 0 ? (
          <div className="space-y-2">
            {authProviders.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[var(--green)]" />
                  <span className="font-semibold text-sm">{p.name}</span>
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-md">{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">Loading providers...</p>
        )}
      </div>

      {/* Available Models (known per provider) */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Available Models by Provider</h2>
        {Object.entries(KNOWN_MODELS).map(([provider, models]) => {
          const hasAuthProfile = Object.keys(cfg?.auth?.profiles || {}).some(k => k === provider || k.startsWith(provider + ":"));
          const hasLiveAuth = authProviders.some(p => p.name === provider || p.name.startsWith(provider));
          const hasConfig = !!modelProviders[provider];
          const isAvailable = hasAuthProfile || hasLiveAuth || hasConfig;
          return (
            <div key={provider} className="mb-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className={isAvailable ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}>{provider}</span>
                {isAvailable ? <CheckCircle2 size={14} className="text-[var(--green)]" /> : <AlertCircle size={14} className="text-[var(--text-secondary)]" />}
                {!isAvailable && <span className="text-xs text-[var(--text-secondary)]">(no API key set)</span>}
              </h3>
              <div className="space-y-1">
                {models.map((m) => (
                  <div key={m.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isAvailable ? "hover:bg-[var(--bg-card-hover)]" : "opacity-50"}`}>
                    <div>
                      <span className="font-mono text-sm">{m.label}</span>
                      <span className="text-xs text-[var(--text-secondary)] ml-2">{m.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.cost === "Free" ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]" : m.cost === "$" ? "bg-[rgba(6,182,212,0.15)] text-[var(--cyan)]" : m.cost === "$$" ? "bg-[rgba(234,179,8,0.15)] text-[var(--yellow)]" : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"}`}>{m.cost}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{m.best}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* API Keys */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2"><Key size={14} /> API Keys</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">Set API keys for model providers. Stored as environment variables in ~/.bashrc.</p>
        <div className="flex gap-2">
          <select className={`${selectCls} w-44`} value={newProvider} onChange={(e) => setNewProvider(e.target.value)}>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama (local)</option>
          </select>
          <input className={`${inputCls} flex-1`} type="password" placeholder="API key..." value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} />
          <button onClick={setApiKeyEnv} className="btn-primary flex items-center gap-2"><Save size={14} /> Set Key</button>
        </div>
      </div>

      {/* Custom Providers from Config */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Custom Model Providers (from config)</h2>
        {Object.keys(modelProviders).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(modelProviders).map(([k, v]) => (
              <div key={k} className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]">
                <div className="font-semibold text-sm mb-1">{k}</div>
                <pre className="text-xs font-mono text-[var(--text-secondary)] overflow-auto">{JSON.stringify(v, null, 2)}</pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-secondary)] text-sm">No custom model providers. Using default endpoints.</p>
        )}
      </div>

      {/* Raw openclaw models output */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Raw Model Info (openclaw models)</h2>
        <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-lg overflow-auto max-h-60 whitespace-pre-wrap">{modelsOutput || "Loading..."}</pre>
      </div>
    </div>
  );
}

/* ═══════════════════════ BOTHUB ═══════════════════════ */
function BotHubPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [routing, setRouting] = useState<Record<string, string>>({});

  const roles = [
    { key: "chat", label: "💬 Chat", desc: "General conversation", rec: "ollama-local/qwen3:8b (Free) or google/gemini-3-flash-preview ($)" },
    { key: "tools", label: "🔧 Tool Use", desc: "Function calling & tool use", rec: "anthropic/claude-sonnet-4-20250514 (Best at tools)" },
    { key: "image", label: "🖼️ Image Analysis", desc: "Vision & image tasks", rec: "google/gemini-2.5-pro-preview or anthropic/claude-sonnet-4-20250514" },
    { key: "code", label: "💻 Code", desc: "Code generation & review", rec: "anthropic/claude-opus-4-6 (Best) or ollama-local/qwen3:8b (Free)" },
    { key: "fast", label: "⚡ Fast Tasks", desc: "Quick lookups, summaries", rec: "google/gemini-3-flash-preview ($) or ollama-local/qwen3:8b (Free)" },
  ];

  async function fetchConfig() {
    setLoading(true);
    try {
      const data = await invokeTool("gateway", { action: "config.get" });
      const c = data?.parsed || data?.config || data;
      setCfg(c);
      setRouting(c?.bothub?.routing || {});
    } catch { setCfg(null); }
    setLoading(false);
  }
  useEffect(() => { fetchConfig(); }, []);

  async function saveRouting() {
    if (!cfg) return;
    setFeedback("Saving...");
    try {
      const updated = { ...cfg, bothub: { ...(cfg.bothub || {}), routing } };
      await invokeTool("gateway", { action: "config.apply", raw: JSON.stringify(updated, null, 2) });
      setFeedback("✓ Routing saved");
    } catch (e: unknown) { setFeedback(`Error: ${e}`); }
    setTimeout(() => setFeedback(""), 3000);
  }

  // Build model options from ALL known models + config
  function getAllOptions(): { id: string; label: string }[] {
    if (!cfg) return [{ id: "", label: "Loading..." }];
    const opts: { id: string; label: string }[] = [{ id: "", label: "— Not set —" }];
    // Always include ALL known models from all providers
    for (const [provider, models] of Object.entries(KNOWN_MODELS)) {
      for (const km of models) {
        if (!opts.find(o => o.id === km.id)) {
          opts.push({ id: km.id, label: `${km.label} [${provider}] (${km.cost})` });
        }
      }
    }
    // From config custom providers
    const providers = cfg?.models?.providers || {};
    for (const [pk, pv] of Object.entries(providers)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = pv as any;
      if (pd?.models && Array.isArray(pd.models)) {
        for (const m of pd.models) {
          const id = `${pk}/${m.id}`;
          if (!opts.find(o => o.id === id)) {
            opts.push({ id, label: `${m.name || m.id} (${pk})` });
          }
        }
      }
    }
    // From configured agent models
    for (const modelId of Object.keys(cfg?.agents?.defaults?.models || {})) {
      if (!opts.find(o => o.id === modelId)) {
        opts.push({ id: modelId, label: modelId });
      }
    }
    return opts;
  }
  const modelOptions = getAllOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Network className="text-[var(--accent)]" /> BotHub</h1>
        <button onClick={fetchConfig} className="btn-secondary flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      {feedback && <div className={`text-sm px-3 py-2 rounded-lg ${feedback.startsWith("✓") ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]" : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"}`}>{feedback}</div>}

      <div className="card p-5">
        <h2 className="section-title mb-2">Model Routing</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Assign models to different task types. Use dropdowns to pick from your configured models, or type a custom model ID.</p>
        <div className="space-y-4">
          {roles.map((r) => (
            <div key={r.key} className="flex items-start gap-4">
              <div className="w-48 shrink-0">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-[var(--text-secondary)]">{r.desc}</div>
                <div className="text-xs text-[var(--cyan)] mt-1">💡 {r.rec}</div>
              </div>
              <select
                className={`${selectCls} flex-1`}
                value={routing[r.key] || ""}
                onChange={(e) => setRouting({ ...routing, [r.key]: e.target.value })}
              >
                {modelOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button onClick={saveRouting} className="btn-primary mt-4 flex items-center gap-2"><Save size={14} /> Save Routing</button>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-2">💡 Recommended Setup (Low Cost)</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-primary)]">
            <span className="w-32 font-medium text-[var(--green)]">💬 Chat</span>
            <span className="font-mono text-[var(--text-secondary)]">ollama-local/qwen3:8b</span>
            <span className="text-xs text-[var(--green)] ml-auto">Free — runs locally</span>
          </div>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-primary)]">
            <span className="w-32 font-medium text-[var(--yellow)]">🔧 Tools</span>
            <span className="font-mono text-[var(--text-secondary)]">anthropic/claude-sonnet-4-20250514</span>
            <span className="text-xs text-[var(--yellow)] ml-auto">$$ — best tool calling</span>
          </div>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-primary)]">
            <span className="w-32 font-medium text-[var(--cyan)]">🖼️ Vision</span>
            <span className="font-mono text-[var(--text-secondary)]">google/gemini-2.5-pro-preview</span>
            <span className="text-xs text-[var(--cyan)] ml-auto">$$ — great at images</span>
          </div>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-primary)]">
            <span className="w-32 font-medium text-[var(--red)]">💻 Code</span>
            <span className="font-mono text-[var(--text-secondary)]">anthropic/claude-opus-4-6</span>
            <span className="text-xs text-[var(--red)] ml-auto">$$$ — best at complex code</span>
          </div>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-primary)]">
            <span className="w-32 font-medium text-[var(--accent)]">⚡ Fast</span>
            <span className="font-mono text-[var(--text-secondary)]">google/gemini-3-flash-preview</span>
            <span className="text-xs text-[var(--accent)] ml-auto">$ — fast and cheap</span>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-2">How It Works</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          BotHub configures intelligent model routing — your local Ollama model handles casual chat for free,
          Claude handles tool-heavy tasks (best at function calling), Gemini handles quick lookups (fast and cheap),
          and Opus tackles complex coding. The primary model can delegate to specialized models as needed.
          This maps to OpenClaw&apos;s model configuration system.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════ CONFIG ═══════════════════════ */
function ConfigPanel({ config, setConfig, loading, onRefresh }: {
  config: string; setConfig: (s: string) => void; loading?: boolean; onRefresh: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveConfig() {
    setSaving(true); setFeedback("");
    try {
      JSON.parse(config);
      await invokeTool("gateway", { action: "config.apply", raw: config });
      setFeedback("✓ Configuration saved and gateway restarting...");
      onRefresh();
    } catch (e: unknown) {
      setFeedback(`Error: ${e instanceof SyntaxError ? "Invalid JSON — check your syntax" : e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
    setTimeout(() => setFeedback(""), 5000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Settings className="text-[var(--accent)]" /> Configuration</h1>
        <div className="flex gap-2">
          <button onClick={saveConfig} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Config
          </button>
          <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reset
          </button>
        </div>
      </div>
      {feedback && <div className={`text-sm px-3 py-2 rounded-lg ${feedback.startsWith("✓") ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]" : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"}`}>{feedback}</div>}
      <div className="card p-2">
        <textarea
          className="w-full min-h-[700px] bg-[var(--bg-primary)] text-[var(--text-primary)] border-none rounded-lg p-4 font-mono text-xs resize-y focus:outline-none"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════ MEMORY ═══════════════════════ */
function MemoryPanel({ memory, loading, onRefresh }: { memory: string; loading?: boolean; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memory);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => { setEditText(memory); }, [memory]);

  async function saveMemory() {
    setSaving(true);
    try {
      await writeFileApi("/home/tvd/.openclaw/workspace/MEMORY.md", editText);
      setFeedback("✓ Memory saved"); setEditing(false); onRefresh();
    } catch (e: unknown) { setFeedback(`Error: ${e}`); }
    setSaving(false);
    setTimeout(() => setFeedback(""), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3"><BrainCircuit className="text-[var(--accent)]" /> Memory</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={saveMemory} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
              <button onClick={() => { setEditing(false); setEditText(memory); }} className="btn-secondary flex items-center gap-2"><X size={14} /> Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">✏️ Edit</button>
          )}
          <button onClick={onRefresh} className="btn-secondary flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>
      {feedback && <div className={`text-sm px-3 py-2 rounded-lg ${feedback.startsWith("✓") ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]" : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"}`}>{feedback}</div>}
      <div className="card p-5">
        {editing ? (
          <textarea
            className="w-full min-h-[700px] bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg p-4 font-mono text-sm resize-y focus:outline-none focus:border-[var(--accent)]"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <pre className="text-sm font-mono text-[var(--text-secondary)] overflow-auto max-h-[700px] bg-[var(--bg-primary)] p-4 rounded-lg whitespace-pre-wrap">
            {memory || "Loading..."}
          </pre>
        )}
      </div>
    </div>
  );
}
