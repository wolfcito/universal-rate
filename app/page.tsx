"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { quickAuth } from "@farcaster/miniapp-sdk";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";

function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // ready() handled globally in AppReady

  // Initialize tab from query param if present (?tab=features)
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "features" || tab === "home") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const handleSignIn = useCallback(async () => {
    try {
      await quickAuth.getToken();
    } catch (err) {
      console.error("Sign in failed", err);
    }
  }, []);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="star" size="md" />}
        >
          <span className="sr-only">Add Mini App</span>
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Added</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  const miniUser = (context?.user as { fid?: number } | undefined) || undefined;
  const isSignedIn = typeof miniUser?.fid === "number";

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-semibold">🎯 Rate</h1>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        {/* Quick actions: hide when user is signed in */}
        {!isSignedIn && (
          <div className="mb-3 flex gap-2">
            <Button onClick={handleSignIn} variant="primary" size="sm">
              Sign in
            </Button>
            <Link href="/profile">
              <Button variant="secondary" size="sm" icon={<Icon name="arrow-right" size="sm" />}>
                View Profile
              </Button>
            </Link>
          </div>
        )}

        <main className="flex-1">
          {activeTab === "home" && <Home />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base - Wolf&apos;s Den
          </Button>
        </footer>
      </div>
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto px-4 py-6">Loading…</div>}>
      <App />
    </Suspense>
  );
}
