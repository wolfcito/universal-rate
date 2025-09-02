import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getUserByFid, type WarpcastUser } from "@/lib/warpcast";

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

    type BaseItem = {
      rated_fid: number;
      avg_score: number;
      ratings_count: number;
      latest_at: string;
    };
    type Item = BaseItem & { profile?: WarpcastUser | null };

    let items: BaseItem[] = (data || []) as BaseItem[];

    if (resolve) {
      const enriched: Item[] = await Promise.all(
        items.map(async (it: BaseItem): Promise<Item> => {
          try {
            const u = await getUserByFid(Number(it.rated_fid));
            return { ...it, profile: u || null };
          } catch {
            return { ...it, profile: null };
          }
        }),
      );
      // Replace with enriched entries including profiles
      items = enriched;
    }

    return NextResponse.json({
      category,
      window,
      minCount,
      limit,
      items: items as Item[],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
