"use client";

import { type ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  icon,
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0052FF] disabled:opacity-50 disabled:pointer-events-none";

  const variantClasses = {
    primary:
      "bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-background)]",
    secondary:
      "bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] text-[var(--app-foreground)]",
    outline:
      "border border-[var(--app-accent)] hover:bg-[var(--app-accent-light)] text-[var(--app-accent)]",
    ghost:
      "hover:bg-[var(--app-accent-light)] text-[var(--app-foreground-muted)]",
  };

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1.5 rounded-md",
    md: "text-sm px-4 py-2 rounded-lg",
    lg: "text-base px-6 py-3 rounded-lg",
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="flex items-center mr-2">{icon}</span>}
      {children}
    </button>
  );
}

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden transition-all hover:shadow-xl ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)]">
          <h3 className="text-lg font-medium text-[var(--app-foreground)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Features({ setActiveTab }: FeaturesProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Key Features">
        <ul className="space-y-3 mb-4">
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Minimalistic and beautiful UI design
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Responsive layout for all devices
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Dark mode support
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              OnchainKit integration
            </span>
          </li>
        </ul>
        <Button variant="outline" onClick={() => setActiveTab("home")}>
          Back to Home
        </Button>
      </Card>
    </div>
  );
}

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  const router = useRouter();
  const search = useSearchParams();
  const { context } = useMiniKit();
  const isSignedIn = Boolean(context?.user && (context.user as any).fid);
  const fid = isSignedIn ? (context!.user as any).fid : undefined;

  const [handle, setHandle] = useState("@username");
  const [category, setCategory] = useState("Builder");
  const [score, setScore] = useState(7);
  const [comment, setComment] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [countRatings, setCountRatings] = useState<number>(0);
  const [statsWindow, setStatsWindow] = useState<string>("7d");
  const [toast, setToast] = useState<
    | { type: "success" | "error"; message: string }
    | null
  >(null);
  const [detailsHref, setDetailsHref] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // Reset results when editing
    setShowResults(false);
    setIsPreview(false);
  }, [handle, category, score, comment]);

  // Prefill handle from query (?handle=...) e.g., from Rate Back
  useEffect(() => {
    const h = search?.get("handle");
    if (!h) return;
    const trimmed = h.trim();
    const val = /^@/.test(trimmed) || /^\d+$/.test(trimmed) || /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `@${trimmed}`;
    setHandle(val);
  }, [search]);

  const dec = () => setScore((s) => Math.max(1, s - 1));
  const inc = () => setScore((s) => Math.min(10, s + 1));

  const handleSignIn = useCallback(async () => {
    try {
      await sdk.actions.signIn({ acceptAuthAddress: true });
    } catch (e) {
      // swallow; UX stays on page
      console.error(e);
    }
  }, []);

  const handleAddMiniApp = useCallback(async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handlePreview = () => {
    setIsPreview(true);
    setShowResults(true);
  };

  const handleRateNow = async () => {
    try {
      setIsSubmitting(true);
      const body: any = {
        category,
        score,
        comment: comment || undefined,
      };
      // Heuristic:
      // - Warpcast profile URL → ratedFid (parse)
      // - cast URL → show toast (coming soon) and abort unless explicitly enabled
      // - numeric → ratedFid
      // - else → handle
      const trimmed = handle.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          const u = new URL(trimmed);
          const segs = u.pathname.split("/").filter(Boolean);
          const isProfile = segs.length >= 3 && segs[0] === "~" && segs[1] === "profiles" && /^\d+$/.test(segs[2] ?? "");
          if (isProfile) {
            body.ratedFid = Number(segs[2]);
          } else {
            setToast({ type: "error", message: "Cast URL no soportada aún. Usa @handle o URL de perfil." });
            return; // abort without showing results
          }
        } catch {
          setToast({ type: "error", message: "URL inválida. Usa @handle, FID o URL de perfil." });
          return;
        }
      } else if (/^\d+$/.test(trimmed)) body.ratedFid = Number(trimmed);
      else if (trimmed) body.handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;

      const raterFid = (context?.user as any)?.fid;
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(raterFid ? { "x-farcaster-fid": String(raterFid) } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to rate");

      // Capture stats from API to show real averages
      if (json?.stats) {
        setAvgScore(
          typeof json.stats.average === "number" ? json.stats.average : null,
        );
        setCountRatings(typeof json.stats.count === "number" ? json.stats.count : 0);
        setStatsWindow(typeof json.stats.window === "string" ? json.stats.window : "7d");
      } else {
        setAvgScore(null);
        setCountRatings(0);
        setStatsWindow("7d");
      }
      if (json?.rating?.id) setDetailsHref(`/rating/${json.rating.id}`);
      setIsPreview(false);
      setShowResults(true);

      // Navigate to dedicated results page with details
      const q = new URLSearchParams({
        handle,
        category,
        score: String(score),
        average: json?.stats?.average ? String(json.stats.average) : "",
        count: json?.stats?.count ? String(json.stats.count) : "0",
        window: json?.stats?.window || "7d",
      });
      if (json?.rating?.rated_fid) q.set("ratedFid", String(json.rating.rated_fid));
      if (json?.rating?.id) q.set("id", String(json.rating.id));
      router.push(`/results?${q.toString()}`);
      setToast({ type: "success", message: "Rating submitted successfully" });
    } catch (e) {
      console.error(e);
      // fallback to local reveal to keep UX flowing
      setIsPreview(false);
      setShowResults(true);
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to submit rating" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = useCallback(async () => {
    setIsComposing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const shareUrl = baseUrl ? `${baseUrl}` : ""; // URL has fc:frame meta in layout
      const text = `${handle} got rated ${score}/10 in ${category}. What do you think? ${shareUrl}`;
      await sdk.actions.composeCast({ text });
      setToast({ type: "success", message: "Share composer opened" });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to open share composer" });
    } finally {
      setIsComposing(false);
    }
  }, [handle, score, category]);

  const resetForm = () => {
    setHandle("@username");
    setCategory("Builder");
    setScore(7);
    setComment("");
    setShowResults(false);
    setIsPreview(false);
  };

  const communityAverage = useMemo(() => 8.2, []);
  const percentile = useMemo(() => 35, []);
  const remaining = 280 - comment.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        {!isSignedIn ? (
          <div className="space-y-4">
            <p className="text-[var(--app-foreground-muted)]">
              Califica y desbloquea el promedio comunitario.
            </p>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">@handle, FID o URL de perfil</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                placeholder="@dwr • 12345 • https://warpcast.com/~/profiles/12345"
              />
              <div className="text-xs text-[var(--app-foreground-muted)] mt-1">cast url coming soon</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
              >
                <option>Builder</option>
                <option>Project</option>
                <option>Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Puntuación</label>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={dec}>
                  −
                </Button>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={inc}>
                  +
                </Button>
                <span className="text-sm text-[var(--app-foreground-muted)] w-10 text-right">{score}/10</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Comentario (opcional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 280))}
                className="w-full min-h-20 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                placeholder="≤ 280 caracteres"
              />
              <div className="text-xs text-[var(--app-foreground-muted)] text-right">{remaining}</div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSignIn} variant="primary">
                Sign in with Farcaster
              </Button>
              <Button onClick={handlePreview} variant="secondary">
                Preview
              </Button>
            </div>

            {showResults && (
              <ResultsCard
                handle={handle}
                score={score}
                average={avgScore ?? communityAverage}
                count={countRatings}
                window={statsWindow}
                percentile={percentile}
                onShare={handleShare}
                onRateAnother={resetForm}
                composing={isComposing}
                isPreview
                detailsHref={detailsHref || undefined}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-[var(--app-foreground-muted)]">Wallet/FID: {fid}</div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">@handle, FID o URL de perfil</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                placeholder="@dwr • 12345 • https://warpcast.com/~/profiles/12345"
              />
              <div className="text-xs text-[var(--app-foreground-muted)] mt-1">cast url coming soon</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
              >
                <option>Builder</option>
                <option>Project</option>
                <option>Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Puntuación</label>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={dec}>
                  −
                </Button>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={inc}>
                  +
                </Button>
                <span className="text-sm text-[var(--app-foreground-muted)] w-10 text-right">{score}/10</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--app-foreground-muted)]">Comentario (opcional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 280))}
                className="w-full min-h-20 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                placeholder="≤ 280 caracteres"
              />
              <div className="text-xs text-[var(--app-foreground-muted)] text-right">{remaining}</div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRateNow} variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Rating…" : "Rate Now"}
              </Button>
            </div>

            {showResults && (
              <ResultsCard
                handle={handle}
                score={score}
                average={avgScore ?? communityAverage}
                count={countRatings}
                window={statsWindow}
                percentile={percentile}
                onShare={handleShare}
                onRateAnother={resetForm}
                composing={isComposing}
              />
            )}
          </div>
        )}
      </Card>

      {/* Transaction demo removed */}
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 -translate-x-1/2 bottom-20 px-4 py-2 rounded-lg shadow-lg border text-sm ${
            toast.type === "success"
              ? "bg-green-600/90 border-green-500 text-white"
              : "bg-red-600/90 border-red-500 text-white"
          }`}
          onAnimationEnd={() => {
            // auto-hide after 2.5s
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

type ResultsCardProps = {
  handle: string;
  score: number;
  average: number; // community average
  count: number; // number of ratings in window
  window: string; // e.g., "7d"
  percentile: number;
  onShare: () => void;
  onRateAnother: () => void;
  composing?: boolean;
  isPreview?: boolean;
  detailsHref?: string;
};

function ResultsCard({ handle, score, average, count, window, percentile, onShare, onRateAnother, composing = false, isPreview = false, detailsHref }: ResultsCardProps) {
  return (
    <Card title={isPreview ? "🎉 Vista previa de resultados" : "🎉 Resultados desbloqueados"}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Tu rating: <strong>{score}/10</strong></span>
          <span>Comunidad: <strong>{average}/10</strong> 📈</span>
        </div>
        <div className="text-sm text-[var(--app-foreground-muted)]">{count} ratings en {window}</div>
        <div className="text-sm text-[var(--app-foreground-muted)]">Tu percentil: {percentile}º</div>
        <div className="text-sm text-[var(--app-foreground-muted)]">
          Distribución (última semana): 10 ███████  9 █████  8 ████  7 ██ ← tú
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={onShare} disabled={composing} variant="primary">
            {composing ? "Sharing…" : "Share"}
          </Button>
          <Button onClick={onRateAnother} variant="secondary">
            Rate Another
          </Button>
          {detailsHref && (
            <a href={detailsHref} className="inline-flex">
              <Button variant="outline">Details</Button>
            </a>
          )}
        </div>
        <div className="text-xs text-[var(--app-foreground-muted)]">
          {handle} • Cat.: Builder
        </div>
      </div>
    </Card>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const icons = {
    heart: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Heart</title>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    star: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Star</title>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Check</title>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    plus: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Plus</title>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    "arrow-right": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Arrow Right</title>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}

type Todo = {
  id: number;
  text: string;
  completed: boolean;
}

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "Learn about MiniKit", completed: false },
    { id: 2, text: "Build a Mini App", completed: true },
    { id: 3, text: "Deploy to Base and go viral", completed: false },
  ]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (newTodo.trim() === "") return;

    const newId =
      todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
    setTodos([...todos, { id: newId, text: newTodo, completed: false }]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <Card title="Get started">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          />
          <Button
            variant="primary"
            size="md"
            onClick={addTodo}
            icon={<Icon name="plus" size="sm" />}
          >
            Add
          </Button>
        </div>

        <ul className="space-y-2">
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id={`todo-${todo.id}`}
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    todo.completed
                      ? "bg-[var(--app-accent)] border-[var(--app-accent)]"
                      : "border-[var(--app-foreground-muted)] bg-transparent"
                  }`}
                >
                  {todo.completed && (
                    <Icon
                      name="check"
                      size="sm"
                      className="text-[var(--app-background)]"
                    />
                  )}
                </button>
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={`text-[var(--app-foreground-muted)] cursor-pointer ${todo.completed ? "line-through opacity-70" : ""}`}
                >
                  {todo.text}
                </label>
              </div>
              <button
                type="button"
                onClick={() => deleteTodo(todo.id)}
                className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}


// Removed TransactionCard component
