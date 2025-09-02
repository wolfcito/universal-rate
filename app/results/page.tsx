"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Name, Identity, Avatar, Address, EthBalance } from "@coinbase/onchainkit/identity";
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel } from "@coinbase/onchainkit/transaction";
import { encodeFunctionData, keccak256, toBytes } from "viem";
import { Button } from "../components/DemoComponents";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)]">
          <h3 className="text-lg font-medium text-[var(--app-foreground)]">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function ResultsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const handle = params.get("handle") || "@username";
  const category = params.get("category") || "Builder";
  const score = Number(params.get("score") || "0");
  const avgParam = params.get("average");
  const countParam = params.get("count");
  const windowParam = params.get("window") || "7d";
  const ratedFid = params.get("ratedFid");
  const ratedEthParam = params.get("ratedEth");
  const [ratedEth, setRatedEth] = useState<string | null>(ratedEthParam);
  const id = params.get("id");

  const [average, setAverage] = useState<number | null>(avgParam ? Number(avgParam) : null);
  const [count, setCount] = useState<number>(countParam ? Number(countParam) : 0);
  const [statsWindow, setStatsWindow] = useState<string>(windowParam);
  const percentile = useMemo(() => 35, []);
  const [toast, setToast] = useState<null | { type: "success" | "error"; message: string }>(null);
  const rateLogAddress = process.env.NEXT_PUBLIC_RATELOG_ADDRESS as `0x${string}` | undefined;

  const recordCall = useMemo(() => {
    try {
      if (!rateLogAddress || !ratedEth) return null;
      const abi = [{
        type: "function",
        name: "recordRating",
        stateMutability: "payable",
        inputs: [
          { name: "rated", type: "address" },
          { name: "score", type: "uint8" },
          { name: "category", type: "bytes32" },
          { name: "commentHash", type: "bytes32" },
        ],
        outputs: [],
      }] as const;
      const categoryHash = keccak256(toBytes(category));
      const commentHash = keccak256(toBytes((params.get("comment") || "").slice(0, 280)));
      const data = encodeFunctionData({
        abi,
        functionName: "recordRating",
        args: [ratedEth as `0x${string}`, Number(score) as any, categoryHash, commentHash],
      });
      return [{ to: rateLogAddress, data, value: BigInt(0) }];
    } catch {
      return null;
    }
  }, [rateLogAddress, ratedEth, category, score, params]);

  useEffect(() => {
    if (!ratedEth && ratedFid) {
      fetch(`/api/address/${ratedFid}`).then(async (r) => ({ ok: r.ok, json: await r.json() }))
        .then(({ ok, json }) => {
          if (!ok) return;
          if (json?.eth) setRatedEth(json.eth);
        }).catch(() => {});
    }
  }, [ratedEth, ratedFid]);

  // ready() handled globally in AppReady

  useEffect(() => {
    if (!average && ratedFid) {
      // Fetch latest stats if not provided in query
      const controller = new AbortController();
      fetch(`/api/rate?ratedFid=${ratedFid}&category=${encodeURIComponent(category)}&window=${statsWindow}`, { signal: controller.signal })
        .then(async (r) => ({ ok: r.ok, json: await r.json() }))
        .then(({ ok, json }) => {
          if (!ok) throw new Error(json?.error || "Failed to load stats");
          setAverage(typeof json.average === "number" ? json.average : null);
          setCount(typeof json.count === "number" ? json.count : 0);
          setStatsWindow(typeof json.window === "string" ? json.window : "7d");
        })
        .catch(() => {})
        .finally(() => {});
      return () => controller.abort();
    }
  }, [average, ratedFid, category, statsWindow]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleShare = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || (typeof window !== "undefined" ? globalThis.window.location.origin : "");
      const shareUrl = baseUrl ? `${baseUrl}` : "";
      const text = `${handle} got rated ${score}/10 in ${category}. What do you think? ${shareUrl}`;
      await sdk.actions.composeCast({ text });
      setToast({ type: "success", message: "Share composer opened" });
    } catch {
      setToast({ type: "error", message: "Failed to open share composer" });
    }
  };

  const handleRateAnother = () => router.push("/");

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
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
          </div>
        </header>

        <main className="space-y-6 animate-fade-in">
          <Card title="🎉 Resultados desbloqueados">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Tu rating: <strong>{score}/10</strong></span>
                <span>
                  Comunidad: <strong>{average ?? "–"}/10</strong> {average !== null && <span>📈</span>}
                </span>
              </div>
              <div className="text-sm text-[var(--app-foreground-muted)]">{count} ratings en {statsWindow}</div>
              <div className="text-sm text-[var(--app-foreground-muted)]">Tu percentil: {percentile}º</div>
              <div className="text-sm text-[var(--app-foreground-muted)]">
                Distribución (última semana): 10 ███████  9 █████  8 ████  7 ██ ← tú
              </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleShare} variant="primary">
              Share
            </Button>
            <Button onClick={handleRateAnother} variant="secondary">
              Rate Another
            </Button>
            {recordCall && (
              <Transaction calls={recordCall}>
                <TransactionButton className="text-xs px-2 py-1" text="Publish Proof" />
                <TransactionStatus>
                  <TransactionStatusLabel />
                </TransactionStatus>
              </Transaction>
            )}
            <Button onClick={() => id && router.push(`/rating/${id}`)} variant="outline" disabled={!id}>
              Details
            </Button>
          </div>
              <div className="text-xs text-[var(--app-foreground-muted)]">
                {handle} • Cat.: {category}
              </div>
            </div>
          </Card>
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <button
            className="text-[var(--ock-text-foreground-muted)] text-xs px-2 py-1 rounded hover:bg-[var(--app-accent-light)]"
            onClick={() => router.push("/")}
          >
            Back to Home
          </button>
        </footer>
      </div>
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 -translate-x-1/2 bottom-20 px-4 py-2 rounded-lg shadow-lg border text-sm ${
            toast.type === "success"
              ? "bg-green-600/90 border-green-500 text-white"
              : "bg-red-600/90 border-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto px-4 py-6">Loading…</div>}>
      <ResultsPageInner />
    </Suspense>
  );
}
