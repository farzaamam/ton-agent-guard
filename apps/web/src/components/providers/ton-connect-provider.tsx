"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonProvider({ children }: { children: React.ReactNode }) {
    return (
        <TonConnectUIProvider manifestUrl="https://tonconnect-sdk-demo-dapp.vercel.app/tonconnect-manifest.json">
            {children}
        </TonConnectUIProvider>
    );
}