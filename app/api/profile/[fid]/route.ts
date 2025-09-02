import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { fid: string } },
) {
  try {
    const fid = Number(params.fid);
    if (!fid || Number.isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid fid parameter" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const window = (searchParams.get("window") || "30d").toLowerCase();
    let since: string | null = null;
    if (window === "7d") since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (window === "30d") since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseServer();

    // Received aggregates
    let recvQuery = supabase
      .from("ratings")
      .select("avg:score.avg(), count:score.count()")
      .eq("rated_fid", fid);
    if (since) recvQuery = recvQuery.gte("created_at", since);
    const { data: recv, error: recvErr } = await recvQuery.single();
    if (recvErr) {
      return NextResponse.json(
        { error: `Received agg failed: ${recvErr.message}` },
        { status: 500 },
      );
    }

    // Given aggregates
    let givenQuery = supabase
      .from("ratings")
      .select("avg:score.avg(), count:score.count()")
      .eq("rater_fid", fid);
    if (since) givenQuery = givenQuery.gte("created_at", since);
    const { data: given, error: givenErr } = await givenQuery.single();
    if (givenErr) {
      return NextResponse.json(
        { error: `Given agg failed: ${givenErr.message}` },
        { status: 500 },
      );
    }

    // Recent received ratings (last 5)
    let recentQuery = supabase
      .from("ratings")
      .select("id, rater_fid, rated_fid, category, score, comment, created_at")
      .eq("rated_fid", fid)
      .order("created_at", { ascending: false })
      .limit(5);
    if (since) recentQuery = recentQuery.gte("created_at", since);
    const { data: recent, error: recentErr } = await recentQuery;
    if (recentErr) {
      return NextResponse.json(
        { error: `Recent failed: ${recentErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      fid,
      window,
      received: {
        average: recv?.avg ?? null,
        count: recv?.count ?? 0,
      },
      given: {
        average: given?.avg ?? null,
        count: given?.count ?? 0,
      },
      recent: recent ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

