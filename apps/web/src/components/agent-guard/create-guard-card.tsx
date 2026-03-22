"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    TonConnectButton,
    useTonAddress,
    useTonConnectUI,
} from "@tonconnect/ui-react";

type GuardStatus = "idle" | "checking" | "not-deployed" | "deployed" | "deploying";

export function CreateGuardCard() {
    const [tonConnectUI] = useTonConnectUI();
    const walletAddress = useTonAddress();

    const [statusText, setStatusText] = useState("");
    const [guardAddress, setGuardAddress] = useState("");
    const [stateInit, setStateInit] = useState("");
    const [deployAmount, setDeployAmount] = useState("");
    const [guardStatus, setGuardStatus] = useState<GuardStatus>("idle");
    const [isBusy, setIsBusy] = useState(false);

    const isConnected = useMemo(() => !!walletAddress, [walletAddress]);

    useEffect(() => {
        const resolveGuard = async () => {
            try {
                if (!walletAddress) {
                    setGuardAddress("");
                    setStateInit("");
                    setDeployAmount("");
                    setGuardStatus("idle");
                    setStatusText("");
                    return;
                }

                setGuardStatus("checking");
                setStatusText("Resolving your guard...");

                const prepareRes = await fetch("/api/guards/prepare", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        owner: walletAddress,
                    }),
                });

                const prepareData = await prepareRes.json();

                if (!prepareRes.ok) {
                    throw new Error(prepareData.error || "Failed to prepare guard");
                }

                setGuardAddress(prepareData.address);
                setStateInit(prepareData.stateInit);
                setDeployAmount(prepareData.amount);

                const statusRes = await fetch(
                    `/api/guards/status?address=${encodeURIComponent(prepareData.address)}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const statusData = await statusRes.json();

                if (!statusRes.ok) {
                    throw new Error(statusData.error || "Failed to check guard status");
                }

                if (statusData.isDeployed) {
                    setGuardStatus("deployed");
                    setStatusText("Your guard is already deployed.");
                } else {
                    setGuardStatus("not-deployed");
                    setStatusText("Your guard is not deployed yet.");
                }
            } catch (error) {
                setGuardStatus("idle");
                setStatusText(
                    error instanceof Error ? error.message : "Something went wrong"
                );
            }
        };

        void resolveGuard();
    }, [walletAddress]);

    const handleDeployGuard = async () => {
        try {
            if (!walletAddress) {
                setStatusText("Connect your wallet first.");
                return;
            }

            if (!guardAddress || !stateInit || !deployAmount) {
                setStatusText("Guard deployment data is not ready yet.");
                return;
            }

            setIsBusy(true);
            setGuardStatus("deploying");
            setStatusText("Waiting for wallet confirmation...");

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [
                    {
                        address: guardAddress,
                        amount: deployAmount,
                        stateInit,
                    },
                ],
            });

            setStatusText("Transaction submitted. Re-checking guard status...");

            const statusRes = await fetch(
                `/api/guards/status?address=${encodeURIComponent(guardAddress)}`,
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            const statusData = await statusRes.json();

            if (statusRes.ok && statusData.isDeployed) {
                setGuardStatus("deployed");
                setStatusText("Your guard is deployed.");
            } else {
                setGuardStatus("not-deployed");
                setStatusText("Transaction sent. Deployment confirmation may take a moment.");
            }
        } catch (error) {
            setGuardStatus(guardAddress ? "not-deployed" : "idle");
            setStatusText(
                error instanceof Error ? error.message : "Deployment failed"
            );
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">My Guard</h2>
                <TonConnectButton />
            </div>

            <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Connected wallet
                    </p>
                    <p className="mt-2 break-all text-sm text-white">
                        {walletAddress || "Not connected"}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Derived AgentGuard address
                    </p>
                    <p className="mt-2 break-all text-sm text-white">
                        {guardAddress || "Connect wallet to resolve"}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">Status</p>
                    <p className="mt-2 text-sm text-white">
                        {guardStatus === "idle" && "Waiting for wallet connection"}
                        {guardStatus === "checking" && "Checking your guard"}
                        {guardStatus === "not-deployed" && "Not deployed"}
                        {guardStatus === "deployed" && "Active"}
                        {guardStatus === "deploying" && "Deploying"}
                    </p>
                </div>
            </div>

            {statusText ? <p className="mt-4 text-sm text-white/70">{statusText}</p> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {guardStatus === "not-deployed" ? (
                    <button
                        type="button"
                        onClick={handleDeployGuard}
                        disabled={!isConnected || isBusy}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isBusy ? "Creating/Deploying..." : "Create AgetGuard"}
                    </button>
                ) : null}

                {guardStatus === "deployed" && guardAddress ? (
                    <Link
                        href={`/guards/${encodeURIComponent(guardAddress)}`}
                        className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:bg-white/90"
                    >
                        Open AgentGuard
                    </Link>
                ) : null}
            </div>
        </div>
    );
}