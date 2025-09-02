import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function call(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { url, status: res.status, ok: res.ok, body: json ?? text };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    const username = searchParams.get("username");
    const base = "https://api.warpcast.com/v2";
    const out: any = {};
    if (fid) {
      out.user = await call(`${base}/user?fid=${encodeURIComponent(fid)}`);
      out.verifications = await call(`${base}/verifications?fid=${encodeURIComponent(fid)}`);
      out.user_verifications = await call(`${base}/user-verifications?fid=${encodeURIComponent(fid)}`);
    }
    if (username) {
      out.by_username = await call(`${base}/user-by-username?username=${encodeURIComponent(username)}`);
    }
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

