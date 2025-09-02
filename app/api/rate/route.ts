import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; // ensure Node runtime for supabase-js
import { getSupabaseServer } from "@/lib/supabase";
import { resolveCastUrlToAuthorFid } from "@/lib/neynar";
import { getFidByUsername, getUserByFid, type WarpcastVerification } from "@/lib/warpcast";

type PostBody = {
  ratedFid?: number; // optional (if provided, no resolution needed)
  handle?: string; // optional @username
  castUrl?: string; // optional full URL to a cast
  category: string;
  score: number; // 1..10
  comment?: string; // <= 280
  raterFid?: number; // optional fallback if header missing (not trusted)
};

const ALLOWED_CATEGORIES = new Set(["Builder", "Project", "Custom"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PostBody;

    const raterHeader = req.headers.get("x-farcaster-fid");
    const raterFid = raterHeader ? Number(raterHeader) : body.raterFid;
    if (!raterFid || Number.isNaN(raterFid)) {
      return NextResponse.json(
        { error: "Missing rater fid. Include 'x-farcaster-fid' header." },
        { status: 401 },
      );
    }

    const { category, score } = body;

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${Array.from(ALLOWED_CATEGORIES).join(", ")}` },
        { status: 400 },
      );
    }

    if (typeof score !== "number" || score < 1 || score > 10) {
      return NextResponse.json(
        { error: "Score must be a number between 1 and 10" },
        { status: 400 },
      );
    }

    const comment = body.comment?.slice(0, 280) ?? null;
    const cast_url = body.castUrl ?? null;

    // If client provided castUrl but feature is disabled, return a clear message
    if (cast_url && process.env.NEYNAR_ALLOW_CAST_URL !== "1") {
      return NextResponse.json(
        { error: "Cast URL resolution is not available on the free plan. Please provide @handle or ratedFid." },
        { status: 400 },
      );
    }

    // Resolve target FID (preferred: numeric ratedFid -> Warpcast by username -> castUrl if enabled)
    let targetFid: number | null = null;
    if (typeof body.ratedFid === "number" && !Number.isNaN(body.ratedFid)) {
      targetFid = Number(body.ratedFid);
    } else if (typeof body.handle === "string" && body.handle.trim()) {
      const username = body.handle.replace(/^@+/, "").trim();
      targetFid = await getFidByUsername(username);
    } else if (body.castUrl && process.env.NEYNAR_ALLOW_CAST_URL === "1") {
      targetFid = await resolveCastUrlToAuthorFid(body.castUrl);
    }
    if (!targetFid) {
      return NextResponse.json(
        { error: "Unable to resolve rated user. Provide ratedFid, handle, or castUrl." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();
    const { data: inserted, error } = await supabase
      .from("ratings")
      .insert({
        rater_fid: raterFid,
        rated_fid: Number(targetFid),
        category,
        score,
        comment,
        cast_url,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate stats for reveal (last 7 days)
    const { data: agg, error: aggErr } = await supabase
      .from("ratings")
      .select("avg:score.avg(), count:score.count()")
      .eq("rated_fid", Number(targetFid))
      .eq("category", category)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (aggErr) {
      return NextResponse.json(
        { error: aggErr.message, rating: inserted },
        { status: 201 },
      );
    }

    // Try enrich rated user's ETH address (primary verification -> any ETH -> custody)
    let ratedEth: string | null = null;
    try {
      const profile = await getUserByFid(Number(targetFid));
      const ver: WarpcastVerification[] = (profile?.verifications || []) as WarpcastVerification[];
      const primaryEth = ver.find((v) => (v.protocol || "").toLowerCase() === "ethereum" && v.isPrimary);
      const anyEth = ver.find((v) => (v.protocol || "").toLowerCase() === "ethereum");
      ratedEth = primaryEth?.address || anyEth?.address || profile?.custody_address || null;
    } catch {}

    return NextResponse.json({
      rating: inserted,
      stats: {
        average: agg?.avg ?? null,
        count: agg?.count ?? 0,
        window: "7d",
      },
      ratedEth,
    }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ratedFid = Number(searchParams.get("ratedFid"));
    const category = searchParams.get("category") ?? "Builder";
    const window = searchParams.get("window") ?? "7d"; // 7d|30d|all

    if (!ratedFid || Number.isNaN(ratedFid)) {
      return NextResponse.json(
        { error: "ratedFid is required and must be a number" },
        { status: 400 },
      );
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${Array.from(ALLOWED_CATEGORIES).join(", ")}` },
        { status: 400 },
      );
    }

    let since: string | null = null;
    if (window === "7d") since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (window === "30d")
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseServer();
    let query = supabase
      .from("ratings")
      .select("avg:score.avg(), count:score.count()")
      .eq("rated_fid", ratedFid)
      .eq("category", category);

    if (since) query = query.gte("created_at", since);

    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      average: data?.avg ?? null,
      count: data?.count ?? 0,
      window,
      ratedFid,
      category,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
