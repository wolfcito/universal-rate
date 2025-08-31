"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import { useCallback, useState, useMemo } from "react";
import { Icon } from "./DemoComponents";

export default function BottomNav() {
  const pathname = usePathname();
  const addFrame = useAddFrame();
  const { context } = useMiniKit();
  const [adding, setAdding] = useState(false);

  const canShowAdd = useMemo(() => {
    // Show only if client context exists and mini app is NOT yet added
    if (!context) return false;
    return !context.client?.added;
  }, [context]);

  const onAdd = useCallback(async () => {
    try {
      setAdding(true);
      await addFrame();
    } finally {
      setAdding(false);
    }
  }, [addFrame]);

  const linkCls = (active: boolean) =>
    `px-3 py-2 text-sm font-medium ${
      active
        ? "text-[var(--app-accent)]"
        : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--app-card-border)] bg-[var(--app-card-bg)] backdrop-blur-md">
      <div className="max-w-md mx-auto flex items-center justify-around px-4 py-2">
        <Link href="/" className={linkCls(pathname === "/")}>Home</Link>
        <Link href="/profile" className={linkCls(pathname?.startsWith("/profile") ?? false)}>
          Profile
        </Link>
        {canShowAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={adding}
            aria-label="Add Mini App"
            className="p-2 rounded-lg text-[var(--app-accent)] hover:bg-[var(--app-accent-light)] disabled:opacity-50"
            title="Add Mini App"
          >
            <Icon name="star" />
          </button>
        )}
      </div>
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
