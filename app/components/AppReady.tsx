"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

export default function AppReady() {
  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    // Hide Farcaster Mini App splash as soon as possible
    sdk.actions.ready().catch(() => {
      // ignore when not running inside a Mini App host
    });
  }, []);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  return null;
}

