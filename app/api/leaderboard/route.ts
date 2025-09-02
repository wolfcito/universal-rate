import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getUserByFid } from "@/lib/warpcast";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "Builder";
    const window = searchParams.get("window") || "7d"; // 7d|30d|all
    const minCount = Number(searchParams.get("minCount") || 10);
    const limit = Number(searchParams.get("limit") || 50);
    const resolve = ["1", "true", "yes"].includes((searchParams.get("resolve") || "").toLowerCase());

    let since: string | null = null;
    if (window === "7d") since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (window === "30d") since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc("leaderboard", {
      _category: category,
      _since: since,
      _min_count: minCount,
      _limit: limit,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = (data || []) as Array<{
      rated_fid: number;
      avg_score: number;
      ratings_count: number;
      latest_at: string;
    }>;

    if (resolve) {
      const enriched = await Promise.all(
        items.map(async (it) => {
          try {
            const u = await getUserByFid(Number(it.rated_fid));
            return { ...it, profile: u || null };
          } catch {
            return { ...it, profile: null };
          }
        }),
      );
      items = enriched as any;
    }

    return NextResponse.json({
      category,
      window,
      minCount,
      limit,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
