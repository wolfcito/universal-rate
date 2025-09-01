import Link from "next/link";

export const runtime = "nodejs";

export default async function LeaderboardPage() {
  // Placeholder MVP: Static scaffolding. Next step is to back this with a SQL view aggregating avg(score), count(*) by rated_fid with filters (window, category, min ratings >= 10).
  const categories = ["Builder", "Project", "Custom"] as const;
  const windows = ["7d", "30d", "all"] as const;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">🏆 Leaderboard</h1>
        <Link href="/" className="text-xs text-[var(--ock-text-foreground-muted)] hover:underline">Home</Link>
      </div>

      <div className="flex gap-2">
        {categories.map((c) => (
          <button key={c} className="px-3 py-1 rounded-lg text-sm bg-[var(--app-card-bg)] border border-[var(--app-card-border)]">
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {windows.map((w) => (
          <button key={w} className="px-3 py-1 rounded-lg text-xs bg-[var(--app-card-bg)] border border-[var(--app-card-border)]">
            {w}
          </button>
        ))}
      </div>

      <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] p-4">
        <p className="text-[var(--app-foreground-muted)] text-sm">Coming soon: dynamic leaderboard with min 10 ratings, weekly reset and tie-breaker by recency.</p>
      </div>
    </div>
  );
}

