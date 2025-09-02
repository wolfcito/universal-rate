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

    // Received aggregates (avoid SQL aggregates to bypass PostgREST limitation)
    let recvCountQuery = supabase
      .from("ratings")
      .select("*", { count: "exact", head: true })
      .eq("rated_fid", fid);
    if (since) recvCountQuery = recvCountQuery.gte("created_at", since as string);
    const { count: recvCount, error: recvCountErr } = await recvCountQuery;
    if (recvCountErr) {
      return NextResponse.json(
        { error: `Received count failed: ${recvCountErr.message}` },
        { status: 500 },
      );
    }
    let recvAvg: number | null = null;
    if ((recvCount ?? 0) > 0) {
      let recvScoresQuery = supabase
        .from("ratings")
        .select("score")
        .eq("rated_fid", fid);
      if (since) recvScoresQuery = recvScoresQuery.gte("created_at", since as string);
      const { data: recvScores, error: recvScoresErr } = await recvScoresQuery;
      if (recvScoresErr) {
        return NextResponse.json(
          { error: `Received scores failed: ${recvScoresErr.message}` },
          { status: 500 },
        );
      }
      const arr = (recvScores || []).map((r: any) => Number(r.score)).filter((n) => !Number.isNaN(n));
      recvAvg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    }

    // Given aggregates
    let givenCountQuery = supabase
      .from("ratings")
      .select("*", { count: "exact", head: true })
      .eq("rater_fid", fid);
    if (since) givenCountQuery = givenCountQuery.gte("created_at", since as string);
    const { count: givenCount, error: givenCountErr } = await givenCountQuery;
    if (givenCountErr) {
      return NextResponse.json(
        { error: `Given count failed: ${givenCountErr.message}` },
        { status: 500 },
      );
    }
    let givenAvg: number | null = null;
    if ((givenCount ?? 0) > 0) {
      let givenScoresQuery = supabase
        .from("ratings")
        .select("score")
        .eq("rater_fid", fid);
      if (since) givenScoresQuery = givenScoresQuery.gte("created_at", since as string);
      const { data: givenScores, error: givenScoresErr } = await givenScoresQuery;
      if (givenScoresErr) {
        return NextResponse.json(
          { error: `Given scores failed: ${givenScoresErr.message}` },
          { status: 500 },
        );
      }
      const arr = (givenScores || []).map((r: any) => Number(r.score)).filter((n) => !Number.isNaN(n));
      givenAvg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
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
      received: { average: recvAvg, count: recvCount ?? 0 },
      given: { average: givenAvg, count: givenCount ?? 0 },
      recent: recent ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
