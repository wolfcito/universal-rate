import { NextRequest, NextResponse } from "next/server";
import { getUserByFid, type WarpcastVerification } from "@/lib/warpcast";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ fid: string }> }) {
  try {
    const { fid } = await context.params;
    const num = Number(fid);
    if (!num || Number.isNaN(num)) {
      return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
    }
    const profile = await getUserByFid(num);
    let eth: string | null = null;
    const ver = (profile?.verifications || []) as WarpcastVerification[];
    const primaryEth = ver.find((v) => (v.protocol || "").toLowerCase() === "ethereum" && v.isPrimary);
    const anyEth = ver.find((v) => (v.protocol || "").toLowerCase() === "ethereum");
    eth = primaryEth?.address || anyEth?.address || profile?.custody_address || null;
    return NextResponse.json({ eth });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

