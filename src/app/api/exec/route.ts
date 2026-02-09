import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { command, cwd } = await req.json();
    if (!command) return NextResponse.json({ error: "command required" }, { status: 400 });
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      exec(command, { cwd: cwd || "/home/tvd/.openclaw/workspace", timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        resolve({ stdout: stdout || "", stderr: stderr || "", code: err?.code ?? 0 });
      });
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "exec failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
