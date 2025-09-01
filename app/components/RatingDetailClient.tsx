"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useState, useEffect, useCallback } from "react";
import { Button } from "./DemoComponents";

type Props = {
  ratedFid: number;
  raterFid: number;
  category: string;
  score: number;
  comment?: string | null;
  handleLabel?: string; // optional display label for rated user
};

export default function RatingDetailClient({ ratedFid, raterFid, category, score, comment, handleLabel }: Props) {
  const [toast, setToast] = useState<null | { type: "success" | "error"; message: string }>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const share = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const shareUrl = baseUrl ? `${baseUrl}` : "";
      const who = handleLabel ? handleLabel : `FID:${ratedFid}`;
      const text = `${who} got rated ${score}/10 in ${category}. ${comment ? `“${comment}” ` : ""}${shareUrl}`;
      await sdk.actions.composeCast({ text });
      setToast({ type: "success", message: "Share composer opened" });
    } catch (e) {
      setToast({ type: "error", message: "Failed to open share composer" });
    }
  }, [ratedFid, score, category, comment, handleLabel]);

  const viewProfile = () => {
    const url = `https://warpcast.com/~/profiles/${ratedFid}`;
    window.open(url, "_blank");
  };

  const rateBack = () => {
    // Prefill Home with the rater's FID in the handle field (heuristic accepts numeric)
    window.location.href = `/?handle=${encodeURIComponent(String(raterFid))}`;
  };

  return (
    <div className="flex gap-2">
      <Button onClick={rateBack} variant="secondary">Rate Back</Button>
      <Button onClick={viewProfile} variant="outline">View Profile</Button>
      <Button onClick={share} variant="primary">Share</Button>

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

