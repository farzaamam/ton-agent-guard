"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonProvider({ children }: { children: React.ReactNode }) {
    return (
        <TonConnectUIProvider 
            analytics={{ mode: "off" }}
            manifestUrl="https://tonconnect-sdk-demo-dapp.vercel.app/tonconnect-manifest.json">
            {children}
        </TonConnectUIProvider>
    );
}