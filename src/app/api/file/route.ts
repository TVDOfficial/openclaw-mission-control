import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    const content = await readFile(path, "utf-8");
    return NextResponse.json({ ok: true, content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "read failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path, content } = await req.json();
    if (!path || content === undefined) return NextResponse.json({ error: "path and content required" }, { status: 400 });
    await writeFile(path, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
