"use client";

import { type ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import AppReady from "./components/AppReady";

export function Providers(props: { children: ReactNode }) {
  const chainName = process.env.NEXT_PUBLIC_CHAIN?.toLowerCase();
  const chain = chainName === "base-sepolia" ? baseSepolia : base;
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      <AppReady />
      {props.children}
    </MiniKitProvider>
  );
}
