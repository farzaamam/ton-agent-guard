"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonProvider({ children }: { children: React.ReactNode }) {
    return (
        <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
            {children}
        </TonConnectUIProvider>
    );
}