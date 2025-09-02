"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

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
        <Link href="/leaderboard" className={linkCls(pathname?.startsWith("/leaderboard") ?? false)}>
          Leaderboard
        </Link>
      </div>
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
