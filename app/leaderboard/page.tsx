"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entry = {
  rated_fid: number;
  avg_score: number;
  ratings_count: number;
  latest_at: string;
  profile?: { fid: number; username?: string; display_name?: string; pfp_url?: string } | null;
};

export default function LeaderboardPage() {
  const categories = ["Builder", "Project", "Custom"] as const;
  const windows = ["7d", "30d", "all"] as const;
  const [category, setCategory] = useState<(typeof categories)[number]>("Builder");
  const [window, setWindow] = useState<(typeof windows)[number]>("7d");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?category=${encodeURIComponent(category)}&window=${window}&limit=25&minCount=10&resolve=1`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load leaderboard");
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, window]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">🏆 Leaderboard</h1>
        <Link href="/" className="text-xs text-[var(--ock-text-foreground-muted)] hover:underline">Home</Link>
      </div>

      <div className="flex gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-lg text-sm border ${
              category === c
                ? "bg-[var(--app-accent-light)] border-[var(--app-accent)] text-[var(--app-accent)]"
                : "bg-[var(--app-card-bg)] border-[var(--app-card-border)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {windows.map((w) => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            className={`px-3 py-1 rounded-lg text-xs border ${
              window === w
                ? "bg-[var(--app-accent-light)] border-[var(--app-accent)] text-[var(--app-accent)]"
                : "bg-[var(--app-card-bg)] border-[var(--app-card-border)]"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)]">
        <div className="p-3 border-b border-[var(--app-card-border)] text-xs text-[var(--app-foreground-muted)] flex justify-between">
          <span>Rank</span>
          <span>User</span>
          <span>Avg</span>
          <span>Count</span>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-[var(--app-foreground-muted)]">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-[var(--app-foreground-muted)]">No entries yet</div>
        ) : (
          <ul>
            {items.map((it, idx) => (
              <li key={`${it.rated_fid}-${idx}`} className="px-3 py-2 text-sm flex items-center justify-between border-t border-[var(--app-card-border)]">
                <span className="w-10">#{idx + 1}</span>
                <span className="flex-1 flex items-center gap-2">
                  {it.profile?.pfp_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.profile.pfp_url} alt="pfp" className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-[var(--app-gray)] inline-block" />)
                  }
                  <span>
                    {it.profile?.username ? `@${it.profile.username}` : `FID:${it.rated_fid}`}
                  </span>
                </span>
                <span className="w-14 text-right">{Number(it.avg_score).toFixed(2)}</span>
                <span className="w-12 text-right">{it.ratings_count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
