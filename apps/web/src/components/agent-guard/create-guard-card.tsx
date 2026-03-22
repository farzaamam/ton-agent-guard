"use client";

import { useState } from "react";
import {
    TonConnectButton,
    useTonAddress,
    useTonConnectUI,
} from "@tonconnect/ui-react";

export function CreateGuardCard() {
    const [tonConnectUI] = useTonConnectUI();
    const walletAddress = useTonAddress();
    const [status, setStatus] = useState("");
    const [expectedAddress, setExpectedAddress] = useState("");

    const handleCreateGuard = async () => {
        try {
            if (!walletAddress) {
                setStatus("Connect your wallet first.");
                return;
            }

            setStatus("Preparing deployment...");

            const res = await fetch("/api/guards/prepare", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    owner: walletAddress,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to prepare deployment");
            }

            setExpectedAddress(data.address);
            setStatus("Waiting for wallet confirmation...");

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [
                    {
                        address: data.address,
                        amount: data.amount,
                        stateInit: data.stateInit,
                    },
                ],
            });

            setStatus("Transaction submitted to wallet.");
        } catch (error) {
            setStatus(
                error instanceof Error ? error.message : "Something went wrong"
            );
        }
    };

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">Create Guard</h2>
                <TonConnectButton />
            </div>

            <p className="mb-4 text-sm text-white/60">
                Connected wallet: {walletAddress || "Not connected"}
            </p>

            <button
                type="button"
                onClick={handleCreateGuard}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black"
            >
                Deploy AgentGuard
            </button>

            {status ? <p className="mt-4 text-sm text-white/70">{status}</p> : null}

            {expectedAddress ? (
                <p className="mt-2 break-all text-xs text-white/50">
                    Expected guard address: {expectedAddress}
                </p>
            ) : null}
        </div>
    );
}