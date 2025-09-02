"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { Button, Icon } from "../components/DemoComponents";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Name, Identity, Avatar, Address, EthBalance } from "@coinbase/onchainkit/identity";

// Profile view for Farcaster Mini App (MiniKit)
// - Uses MiniKit context for user identity when available
// - Provides "Save Frame" CTA and external profile open
// - Accepts optional `fid` search param to view another profile in the future

function ProfilePageInner() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const searchParams = useSearchParams();

  // Optional target fid from query (?fid=123)
  const targetFid = useMemo(() => {
    const value = searchParams?.get("fid");
    return value ? Number(value) : undefined;
  }, [searchParams]);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const didAdd = await addFrame();
    setFrameAdded(Boolean(didAdd));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client?.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="star" size="md" />}
        >
          <span className="sr-only">Save Frame</span>
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  // Resolve identity from MiniKit context if present
  const profile = context?.user as
    | {
        fid?: number;
        username?: string;
        displayName?: string;
        pfpUrl?: string;
        bio?: string;
      }
    | undefined;

  const effectiveFid = targetFid ?? profile?.fid;
  const username = profile?.username;
  const displayName = profile?.displayName ?? username ?? `User ${effectiveFid ?? ""}`;
  const pfpUrl = profile?.pfpUrl;
  const bio = profile?.bio;

  const [stats, setStats] = useState<{
    received: { average: number | null; count: number };
    given: { average: number | null; count: number };
    recent: Array<{ id: string; rater_fid: number; score: number; category: string; comment?: string | null; created_at: string }>;
    window: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fid = effectiveFid;
    if (!fid) return;
    setLoading(true);
    setError(null);
    fetch(`/api/profile/${fid}?window=30d`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json?.error || "Failed to load profile stats");
        setStats(json);
      })
      .catch((e) => setError(e?.message || "Failed to load profile stats"))
      .finally(() => setLoading(false));
  }, [effectiveFid]);

  const openExternalProfile = useCallback(() => {
    if (username) {
      openUrl(`https://warpcast.com/${username}`);
    } else if (effectiveFid) {
      openUrl(`https://warpcast.com/user/${effectiveFid}`);
    }
  }, [openUrl, username, effectiveFid]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-semibold">Profile</h1>
            <Wallet className="z-10">
              <ConnectWallet>
                <Name className="text-inherit" />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1 animate-fade-in">
          <section className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--app-gray)] border border-[var(--app-card-border)]">
                  {pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pfpUrl}
                      alt={`${displayName}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--app-foreground-muted)] text-sm">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium truncate">{displayName}</h2>
                    {username && (
                      <span className="text-xs text-[var(--app-foreground-muted)] truncate">@{username}</span>
                    )}
                  </div>
                  {effectiveFid && (
                    <p className="text-xs text-[var(--app-foreground-muted)]">fid: {effectiveFid}</p>
                  )}
                </div>
              </div>

              {bio && (
                <p className="mt-4 text-sm text-[var(--app-foreground-muted)]">{bio}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Button onClick={openExternalProfile} variant="outline" size="sm" icon={<Icon name="arrow-right" size="sm" />}>
                  View on Warpcast
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)] p-3 text-center">
              <div className="text-xl font-semibold">
                {loading ? "…" : stats ? stats.given.count : "—"}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Ratings Given</div>
            </div>
            <div className="bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)] p-3 text-center">
              <div className="text-xl font-semibold">
                {loading ? "…" : stats ? stats.received.count : "—"}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Ratings Received</div>
            </div>
            <div className="bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)] p-3 text-center">
              <div className="text-xl font-semibold">
                {loading ? "…" : stats && stats.received.average != null ? Number(stats.received.average).toFixed(1) : "—"}
              </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">Avg (30d)</div>
            </div>
          </section>

          <section className="mt-4 bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)] p-4">
            <h3 className="text-sm font-medium mb-2">Recent Ratings (received)</h3>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : loading ? (
              <p className="text-sm text-[var(--app-foreground-muted)]">Loading…</p>
            ) : !stats || stats.recent.length === 0 ? (
              <p className="text-sm text-[var(--app-foreground-muted)]">No recent ratings</p>
            ) : (
              <ul className="space-y-2">
                {stats.recent.map((r) => (
                  <li key={r.id} className="text-sm flex justify-between border-b border-[var(--app-card-border)] pb-1">
                    <span>From {r.rater_fid} • {r.category}</span>
                    <span className="font-semibold">{r.score}/10</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto px-4 py-6">Loading…</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
