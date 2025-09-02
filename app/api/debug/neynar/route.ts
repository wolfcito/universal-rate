import { NextRequest, NextResponse } from "next/server";
import { resolveHandleToFid } from "@/lib/neynar";

async function callCast(url: string) {
  // Import fetchJson indirectly by calling resolveCastUrlToAuthorFid path via query string
  // We'll duplicate a minimal call here to expose precise responses for debugging.
  const key = process.env.NEYNAR_API_KEY;
  if (!key) throw new Error("NEYNAR_API_KEY is not set");
  const endpoint = `https://api.neynar.com/v2/farcaster/cast?identifier=${encodeURIComponent(url)}&type=url&api_key=${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "api-key": key,
      "api_key": key as any,
      "x-api-key": key as any,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, body: json ?? text };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle");
    const castUrl = searchParams.get("castUrl");

    const result: any = { env: { hasKey: Boolean(process.env.NEYNAR_API_KEY) } };

    if (handle) {
      try {
        const fid = await resolveHandleToFid(handle);
        result.handle = { handle, fid };
      } catch (e: any) {
        result.handle = { handle, error: e?.message || String(e) };
      }
    }
    if (castUrl) {
      try {
        const resp = await callCast(castUrl);
        result.cast = { url: castUrl, ...resp };
      } catch (e: any) {
        result.cast = { url: castUrl, error: e?.message || String(e) };
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

