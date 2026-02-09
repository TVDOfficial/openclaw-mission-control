// Calls the local proxy which forwards to OpenClaw gateway
export async function invokeTool(tool: string, args: Record<string, unknown> = {}) {
  const res = await fetch("/api/openclaw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args }),
  });
  const data = await res.json();
  
  if (data?.ok && data?.result?.details) {
    return data.result.details;
  }
  if (data?.ok && data?.result?.content?.[0]?.text) {
    try {
      return JSON.parse(data.result.content[0].text);
    } catch {
      return data.result.content[0].text;
    }
  }
  if (data?.ok && data?.result) {
    return data.result;
  }
  return data;
}

export async function getHealth() {
  const res = await fetch("/api/openclaw");
  return res.json();
}

export async function readFileApi(path: string): Promise<string> {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (data.ok) return data.content;
  throw new Error(data.error || "read failed");
}

export async function writeFileApi(path: string, content: string): Promise<void> {
  const res = await fetch("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "write failed");
}

export async function runExec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const res = await fetch("/api/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, cwd }),
  });
  const data = await res.json();
  if (!data.ok && data.error) throw new Error(data.error);
  return data;
}
