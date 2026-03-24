"use client";

import Link from "next/link";
import { toNano } from "@ton/core";
import {
    TonConnectButton,
    useTonAddress,
    useTonConnectUI,
    useTonWallet,
} from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { CreateSessionModal } from "@/components/agent-guard/create-session-modal";
import { FundGuardModal } from "@/components/agent-guard/fund-guard-modal";
import { GuardOverviewCard } from "@/components/agent-guard/guard-overview-card";
import { SessionsCard } from "@/components/agent-guard/sessions-card";
import { WithdrawGuardModal } from "@/components/agent-guard/withdraw-guard-modal";
import {
    GuardStatusResponse,
    areSameAddress,
    formatDeploymentLabel,
    getDisplayErrorMessage,
    formatTonValue,
} from "@/components/agent-guard/guard-utils";
import { readGuardStatusAction } from "@/app/actions/read-guard-status";

type GuardDashboardProps = {
    address: string;
};

type LoadState = "loading" | "ready" | "error";
type FundState = "idle" | "pending" | "success" | "error";
type OwnerState = "idle" | "loading" | "ready" | "error";

const FUND_PRESETS = ["0.05", "0.1", "0.25"];
const REFRESH_DELAYS_MS = [1500, 2500, 4000];

async function requestGuardStatus(address: string): Promise<GuardStatusResponse> {
    return readGuardStatusAction(address);
}

async function requestPreparedGuard(owner: string) {
    const response = await fetch("/api/guards/prepare", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            owner,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to resolve connected guard");
    }

    return data as { address: string };
}

function sleep(delayMs: number) {
    return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function GuardDashboard({ address }: GuardDashboardProps) {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const walletAddress = useTonAddress();

    const [guardStatus, setGuardStatus] = useState<GuardStatusResponse | null>(null);
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [loadMessage, setLoadMessage] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [ownerState, setOwnerState] = useState<OwnerState>("idle");
    const [connectedGuardAddress, setConnectedGuardAddress] = useState("");

    const [fundAmount, setFundAmount] = useState("0.05");
    const [fundState, setFundState] = useState<FundState>("idle");
    const [fundMessage, setFundMessage] = useState("");
    const [isFundGuardModalOpen, setIsFundGuardModalOpen] = useState(false);
    const [isWithdrawGuardModalOpen, setIsWithdrawGuardModalOpen] =
        useState(false);
    const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] =
        useState(false);

    useEffect(() => {
        let isCancelled = false;

        const loadGuard = async () => {
            try {
                setLoadState("loading");
                setLoadMessage("");

                const nextStatus = await requestGuardStatus(address);

                if (isCancelled) {
                    return;
                }

                setGuardStatus(nextStatus);
                setLoadState("ready");
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setGuardStatus(null);
                setLoadState("error");
                setLoadMessage(
                    getDisplayErrorMessage(error, "Failed to load AgentGuard")
                );
            }
        };

        void loadGuard();

        return () => {
            isCancelled = true;
        };
    }, [address]);

    useEffect(() => {
        let isCancelled = false;

        const resolveOwnerGuard = async () => {
            if (!walletAddress) {
                setOwnerState("idle");
                setConnectedGuardAddress("");
                return;
            }

            try {
                setOwnerState("loading");

                const result = await requestPreparedGuard(walletAddress);

                if (isCancelled) {
                    return;
                }

                setConnectedGuardAddress(result.address);
                setOwnerState("ready");
            } catch {
                if (isCancelled) {
                    return;
                }

                setConnectedGuardAddress("");
                setOwnerState("error");
            }
        };

        void resolveOwnerGuard();

        return () => {
            isCancelled = true;
        };
    }, [walletAddress]);

    const refreshGuardStatus = async (options?: {
        shouldStop?: (nextStatus: GuardStatusResponse) => boolean;
    }) => {
        setIsRefreshing(true);

        let lastStatus: GuardStatusResponse | null = null;

        try {
            for (let attempt = 0; attempt <= REFRESH_DELAYS_MS.length; attempt += 1) {
                const nextStatus = await requestGuardStatus(address);

                setGuardStatus(nextStatus);
                setLoadState("ready");
                setLoadMessage("");
                lastStatus = nextStatus;

                if (
                    !options?.shouldStop ||
                    options.shouldStop(nextStatus) ||
                    attempt === REFRESH_DELAYS_MS.length
                ) {
                    return nextStatus;
                }

                await sleep(REFRESH_DELAYS_MS[attempt]);
            }

            return lastStatus;
        } catch (error) {
            setLoadState("error");
            setLoadMessage(
                getDisplayErrorMessage(error, "Failed to refresh AgentGuard")
            );
            throw error;
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAmountChange = (value: string) => {
        if (!/^\d*(\.\d{0,9})?$/.test(value)) {
            return;
        }

        if (fundState !== "pending") {
            setFundState("idle");
            setFundMessage("");
        }

        setFundAmount(value);
    };

    const handlePresetSelect = (value: string) => {
        if (fundState !== "pending") {
            setFundState("idle");
            setFundMessage("");
        }

        setFundAmount(value);
    };

    const handleFundGuard = async () => {
        if (!walletAddress) {
            setFundState("error");
            setFundMessage("Connect your wallet first.");
            return;
        }

        if (!guardStatus?.isDeployed) {
            setFundState("error");
            setFundMessage("This AgentGuard is not active yet.");
            return;
        }

        const amountValue = fundAmount.trim();

        if (!amountValue) {
            setFundState("error");
            setFundMessage("Enter a TON amount first.");
            return;
        }

        let amountNano: bigint;

        try {
            amountNano = toNano(amountValue);
        } catch (error) {
            setFundState("error");
            setFundMessage(
                getDisplayErrorMessage(error, "Enter a valid TON amount.")
            );
            return;
        }

        if (amountNano <= 0n) {
            setFundState("error");
            setFundMessage("Enter an amount greater than zero.");
            return;
        }

        const previousBalance = guardStatus.balance;

        try {
            setFundState("pending");
            setFundMessage("Waiting for wallet confirmation...");

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                network: wallet?.account.chain,
                messages: [
                    {
                        address: guardStatus.address,
                        amount: amountNano.toString(),
                    },
                ],
            });

            setFundAmount("");
            setFundMessage("Funding transaction submitted. Refreshing guard balance...");

            try {
                const refreshedStatus = await refreshGuardStatus({
                    shouldStop: (nextStatus) =>
                        nextStatus.balance !== previousBalance,
                });

                setFundState("success");
                setFundMessage(
                    refreshedStatus && refreshedStatus.balance !== previousBalance
                        ? "Funding transaction submitted. Guard balance updated."
                        : "Funding transaction submitted. Balance refresh may take a few seconds."
                );
            } catch {
                setFundState("success");
                setFundMessage(
                    "Funding transaction submitted. Balance refresh may take a few seconds."
                );
            }
        } catch (error) {
            setFundState("error");
            setFundMessage(getDisplayErrorMessage(error, "Funding failed"));
        }
    };

    const handleCreateSessionRefresh = async (previousNextSessionId: string | null) =>
        refreshGuardStatus({
            shouldStop: (nextStatus) => {
                if (!previousNextSessionId || !nextStatus.nextSessionId) {
                    return true;
                }

                return nextStatus.nextSessionId !== previousNextSessionId;
            },
        });

    const handleWithdrawGuardRefresh = async (
        previousBalance: string,
        previousAvailableBalance: string | null
    ) =>
        refreshGuardStatus({
            shouldStop: (nextStatus) =>
                nextStatus.balance !== previousBalance ||
                nextStatus.availableBalance !== previousAvailableBalance,
        });

    const handleRevokeSessionRefresh = async (sessionId: string) => {
        const refreshedStatus = await refreshGuardStatus({
            shouldStop: (nextStatus) =>
                nextStatus.sessions.some(
                    (session) => session.id === sessionId && session.revoked
                ),
        });
        const session = refreshedStatus?.sessions.find(
            (candidate) => candidate.id === sessionId
        );

        return session ? { revoked: session.revoked } : null;
    };

    const isOwnerConnected =
        !!walletAddress &&
        !!connectedGuardAddress &&
        areSameAddress(address, connectedGuardAddress);

    const ownerLabel = !walletAddress
        ? "Connect wallet to manage this guard"
        : ownerState === "loading"
          ? "Checking connected wallet..."
          : isOwnerConnected
            ? walletAddress
            : "Owner wallet not connected";

    const ownerHint =
        walletAddress && connectedGuardAddress && !isOwnerConnected
            ? `Connected wallet resolves to ${connectedGuardAddress}`
            : ownerState === "error"
              ? "Could not verify the connected wallet against the deterministic guard flow."
              : undefined;

    const isWalletConnected = Boolean(walletAddress);
    const canOpenWithdrawGuard =
        isWalletConnected && isOwnerConnected && guardStatus?.isDeployed === true;
    const canSubmitFunding =
        isWalletConnected &&
        Boolean(fundAmount.trim()) &&
        fundState !== "pending" &&
        guardStatus?.isDeployed === true;

    if (loadState === "loading" && !guardStatus) {
        return (
            <section className="theme-panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="theme-kicker">Dashboard</p>
                        <h2 className="mt-3 text-2xl font-semibold">Loading AgentGuard</h2>
                        <p className="theme-copy mt-3 text-sm leading-6">
                            Checking deployment state and current balance.
                        </p>
                    </div>
                    <TonConnectButton />
                </div>
            </section>
        );
    }

    if (loadState === "error" && !guardStatus) {
        return (
            <section className="theme-danger-panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="theme-kicker">Dashboard</p>
                        <h2 className="mt-3 text-2xl font-semibold">
                            Could not load this AgentGuard
                        </h2>
                        <p className="theme-error mt-3 text-sm leading-6">
                            {loadMessage}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void refreshGuardStatus();
                        }}
                        className="theme-secondary-button rounded-2xl px-5 py-3 text-sm"
                    >
                        Retry
                    </button>
                </div>
            </section>
        );
    }

    if (!guardStatus) {
        return null;
    }

    return (
        <div className="space-y-6">
            <FundGuardModal
                isOpen={isFundGuardModalOpen}
                onClose={() => {
                    setIsFundGuardModalOpen(false);
                }}
                address={guardStatus.address}
                amount={fundAmount}
                presets={FUND_PRESETS}
                isWalletConnected={isWalletConnected}
                isSubmitting={fundState === "pending"}
                canSubmit={canSubmitFunding}
                statusText={fundMessage}
                statusTone={
                    fundState === "pending"
                        ? "pending"
                        : fundState === "success"
                          ? "success"
                          : fundState === "error"
                            ? "error"
                            : "neutral"
                }
                onAmountChange={handleAmountChange}
                onPresetSelect={handlePresetSelect}
                onSubmit={() => {
                    void handleFundGuard();
                }}
            />

            <CreateSessionModal
                isOpen={isCreateSessionModalOpen}
                onClose={() => {
                    setIsCreateSessionModalOpen(false);
                }}
                guardAddress={guardStatus.address}
                nextSessionId={guardStatus.nextSessionId}
                availableBalance={guardStatus.availableBalance}
                isWalletConnected={isWalletConnected}
                isOwnerConnected={isOwnerConnected}
                isGuardActive={guardStatus.isDeployed}
                onSubmittedRefresh={handleCreateSessionRefresh}
            />

            <WithdrawGuardModal
                isOpen={isWithdrawGuardModalOpen}
                onClose={() => {
                    setIsWithdrawGuardModalOpen(false);
                }}
                guardAddress={guardStatus.address}
                ownerAddress={isOwnerConnected ? walletAddress : ""}
                balance={guardStatus.balance}
                availableBalance={guardStatus.availableBalance}
                isWalletConnected={isWalletConnected}
                isOwnerConnected={isOwnerConnected}
                isGuardActive={guardStatus.isDeployed}
                onSubmittedRefresh={handleWithdrawGuardRefresh}
            />

            <section className="theme-accent-panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="theme-kicker">Dashboard</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            AgentGuard
                        </h2>
                        <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                            Operate a deployed guard, review its onchain state, fund
                            it, withdraw unlocked balance back to the owner, and
                            create owner-controlled opcode-only or exact-body-hash
                            sessions.
                        </p>
                    </div>

                    <TonConnectButton />
                </div>
            </section>

            <GuardOverviewCard
                address={guardStatus.address}
                ownerLabel={ownerLabel}
                ownerHint={ownerHint}
                isDeployed={guardStatus.isDeployed}
                state={formatDeploymentLabel(guardStatus.isDeployed, guardStatus.state)}
                onchainBalance={formatTonValue(guardStatus.balance, {
                    placeholder: "0 TON",
                    maximumFractionDigits: 4,
                })}
                canOpenWithdrawGuard={canOpenWithdrawGuard}
                onOpenFundGuard={() => {
                    setIsFundGuardModalOpen(true);
                }}
                onOpenWithdrawGuard={() => {
                    setIsWithdrawGuardModalOpen(true);
                }}
                onRefresh={() => {
                    void refreshGuardStatus();
                }}
                isRefreshing={isRefreshing}
            />

            {!guardStatus.isDeployed ? (
                <section className="theme-panel p-6">
                    <p className="theme-kicker">Status</p>
                    <h2 className="mt-3 text-2xl font-semibold">AgentGuard not active</h2>
                    <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                        This address is not deployed yet. Return to the current create/open
                        flow to deploy the deterministic guard for your wallet or reopen it
                        once it is live.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/create-guard"
                            className="theme-primary-button rounded-2xl px-5 py-3 text-center text-sm"
                        >
                            Back to Guard Setup
                        </Link>

                        <button
                            type="button"
                            onClick={() => {
                                void refreshGuardStatus();
                            }}
                            disabled={isRefreshing}
                            className="theme-secondary-button rounded-2xl px-5 py-3 text-sm"
                        >
                            {isRefreshing ? "Checking..." : "Check again"}
                        </button>
                    </div>
                </section>
            ) : (
                <>
            <SessionsCard
                guardAddress={guardStatus.address}
                nextSessionId={guardStatus.nextSessionId}
                sessions={guardStatus.sessions}
                sessionReadLimit={guardStatus.sessionReadLimit}
                sessionsTruncated={guardStatus.sessionsTruncated}
                visibleSessionStartId={guardStatus.visibleSessionStartId}
                visibleSessionEndId={guardStatus.visibleSessionEndId}
                isWalletConnected={isWalletConnected}
                isOwnerConnected={isOwnerConnected}
                isGuardActive={guardStatus.isDeployed}
                onOpenCreateSession={() => {
                            setIsCreateSessionModalOpen(true);
                        }}
                        onSubmittedRevoke={handleRevokeSessionRefresh}
                    />
                </>
            )}
        </div>
    );
}
