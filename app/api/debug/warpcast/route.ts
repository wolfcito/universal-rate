import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type DebugResponse = { url: string; status: number; ok: boolean; body: unknown };

async function call(url: string): Promise<DebugResponse> {
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { url, status: res.status, ok: res.ok, body: json ?? text };
}

export async function GET(req: NextRequest) {
  try {
    // Restrict this endpoint to development only
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    const username = searchParams.get("username");
    const base = "https://api.warpcast.com/v2";
    const out: {
      user?: DebugResponse;
      verifications?: DebugResponse;
      user_verifications?: DebugResponse;
      by_username?: DebugResponse;
    } = {};
    if (fid) {
      out.user = await call(`${base}/user?fid=${encodeURIComponent(fid)}`);
      out.verifications = await call(`${base}/verifications?fid=${encodeURIComponent(fid)}`);
      out.user_verifications = await call(`${base}/user-verifications?fid=${encodeURIComponent(fid)}`);
    }
    if (username) {
      out.by_username = await call(`${base}/user-by-username?username=${encodeURIComponent(username)}`);
    }
    return NextResponse.json(out);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
