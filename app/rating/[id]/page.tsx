import { getSupabaseServer } from "@/lib/supabase";
import Link from "next/link";
import RatingDetailClient from "@/app/components/RatingDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export default async function RatingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("ratings")
    .select("id, rater_fid, rated_fid, category, score, comment, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-10">
        <h1 className="text-lg font-semibold mb-2">Rating not found</h1>
        <p className="text-[var(--app-foreground-muted)]">The rating you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4">
      <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] p-5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">🧾 Detalle de rating</h1>
          <span className="text-xs text-[var(--app-foreground-muted)]">{new Date(data.created_at).toLocaleString()}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-[var(--app-foreground-muted)]">@rated • Cat.: </span>
            <strong>{data.category}</strong> • <strong>{data.score}/10</strong>
          </div>
          {data.comment && (
            <div className="text-[var(--app-foreground-muted)]">“{data.comment}”</div>
          )}
          <div className="text-[var(--app-foreground-muted)]">rater: {data.rater_fid} • rated: {data.rated_fid}</div>
        </div>

        <div className="mt-4">
          <RatingDetailClient
            ratedFid={data.rated_fid}
            raterFid={data.rater_fid}
            category={data.category}
            score={data.score}
            comment={data.comment}
          />
        </div>
      </div>
      <div className="flex justify-center">
        <Link href="/" className="text-xs text-[var(--ock-text-foreground-muted)] hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
