"use client";

import { beginCell, toNano } from "@ton/core";
import { useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { storeRevokeSession } from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import { formatTonValue } from "@/components/agent-guard/guard-utils";
import {
    getDisplayErrorMessage,
} from "@/components/agent-guard/guard-utils";
import type { GuardSessionSummary } from "@/lib/agent-guard/guard-status";

type SessionsCardProps = {
    guardAddress: string;
    nextSessionId: string | null;
    sessions: GuardSessionSummary[];
    isWalletConnected: boolean;
    isOwnerConnected: boolean;
    isGuardActive: boolean;
    onOpenCreateSession: () => void;
    onSubmittedRevoke: (
        sessionId: string
    ) => Promise<{ revoked: boolean } | null>;
};

type RevokeSessionState =
    | "idle"
    | "validating"
    | "awaiting-wallet"
    | "submitted"
    | "refreshed"
    | "failed";

type RevokeSessionFeedback = {
    state: RevokeSessionState;
    message: string;
};

const REVOKE_SESSION_TRANSACTION_VALUE = toNano("0.02").toString();

const revokeStatusToneClasses: Record<RevokeSessionState, string> = {
    idle: "theme-status-neutral",
    validating: "theme-status-pending",
    "awaiting-wallet": "theme-status-pending",
    submitted: "theme-status-pending",
    refreshed: "theme-status-success",
    failed: "theme-status-error",
};

function getCreatedSessionCount(nextSessionId: string | null) {
    if (!nextSessionId) {
        return null;
    }

    try {
        const parsedNextSessionId = BigInt(nextSessionId);

        return parsedNextSessionId > 0n ? parsedNextSessionId - 1n : 0n;
    } catch {
        return null;
    }
}

function formatShortAddress(address: string) {
    return address.length > 12
        ? `${address.slice(0, 6)}...${address.slice(-6)}`
        : address;
}

function formatOpcode(opcode: string) {
    try {
        return `0x${BigInt(opcode).toString(16).toUpperCase().padStart(8, "0")}`;
    } catch {
        return "Unavailable";
    }
}

function formatExpiry(expiry: string) {
    try {
        const date = new Date(Number(BigInt(expiry)) * 1000);

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "Unavailable";
    }
}

function getSessionStatus(session: GuardSessionSummary) {
    if (session.revoked) {
        return "Revoked";
    }

    try {
        if (BigInt(session.expiry) <= BigInt(Math.floor(Date.now() / 1000))) {
            return "Expired";
        }

        if (BigInt(session.lockedAmount) === 0n) {
            return "Spent";
        }
    } catch {
        return "Unknown";
    }

    return "Active";
}

function SessionRow({
    session,
    actionLabel,
    actionDisabled,
    onRevoke,
    feedback,
}: {
    session: GuardSessionSummary;
    actionLabel: string;
    actionDisabled: boolean;
    onRevoke: () => void;
    feedback?: RevokeSessionFeedback;
}) {
    const status = getSessionStatus(session);

    return (
        <div className="theme-subtle-panel p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto]">
                <div>
                    <p className="theme-label">Session</p>
                    <p className="theme-value mt-2 text-sm font-medium">#{session.id}</p>
                </div>

                <div>
                    <p className="theme-label">Agent</p>
                    <p className="theme-value mt-2 break-all text-sm" title={session.agent}>
                        {formatShortAddress(session.agent)}
                    </p>
                </div>

                <div>
                    <p className="theme-label">Target</p>
                    <p className="theme-value mt-2 break-all text-sm" title={session.target}>
                        {formatShortAddress(session.target)}
                    </p>
                </div>

                <div>
                    <p className="theme-label">Expiry</p>
                    <p className="theme-value mt-2 text-sm">{formatExpiry(session.expiry)}</p>
                </div>

                <div>
                    <p className="theme-label">Max total</p>
                    <p className="theme-value mt-2 text-sm">
                        {formatTonValue(session.maxTotal, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                </div>

                <div>
                    <p className="theme-label">Max per tx</p>
                    <p className="theme-value mt-2 text-sm">
                        {formatTonValue(session.maxPerTx, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                </div>

                <div>
                    <p className="theme-label">Usage</p>
                    <p className="theme-value mt-2 text-sm">
                        Spent{" "}
                        {formatTonValue(session.spentTotal, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                    <p className="theme-hint mt-2 text-xs leading-5">
                        Op {formatOpcode(session.allowedOp)}
                        {" · "}
                        Locked{" "}
                        {formatTonValue(session.lockedAmount, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                        {" · "}Nonce {session.nonceExpected}
                    </p>
                </div>

                <div className="md:text-right">
                    <p className="theme-label">Status</p>
                    <span
                        className={`theme-pill mt-2 text-xs ${
                            status === "Active"
                                ? "theme-pill-active"
                                : status === "Revoked"
                                  ? "theme-pill-danger"
                                  : ""
                        }`}
                    >
                        {status}
                    </span>
                    <button
                        type="button"
                        onClick={onRevoke}
                        disabled={actionDisabled}
                        className="theme-danger-button mt-3 rounded-full px-3 py-1 text-xs"
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>

            {feedback?.message ? (
                <p
                    className={`mt-4 text-sm leading-6 ${revokeStatusToneClasses[feedback.state]}`}
                >
                    {feedback.message}
                </p>
            ) : null}
        </div>
    );
}

export function SessionsCard({
    guardAddress,
    nextSessionId,
    sessions,
    isWalletConnected,
    isOwnerConnected,
    isGuardActive,
    onOpenCreateSession,
    onSubmittedRevoke,
}: SessionsCardProps) {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const [activeRevokeSessionId, setActiveRevokeSessionId] = useState<string | null>(
        null
    );
    const [revokeFeedbackById, setRevokeFeedbackById] = useState<
        Record<string, RevokeSessionFeedback>
    >({});
    const createdSessionCount = getCreatedSessionCount(nextSessionId);

    const setRevokeFeedback = (
        sessionId: string,
        state: RevokeSessionState,
        message: string
    ) => {
        setRevokeFeedbackById((current) => ({
            ...current,
            [sessionId]: {
                state,
                message,
            },
        }));
    };

    const handleRevokeSession = async (session: GuardSessionSummary) => {
        if (session.revoked) {
            return;
        }

        if (!isWalletConnected) {
            setRevokeFeedback(
                session.id,
                "failed",
                "Connect the owner wallet before revoking a session."
            );
            return;
        }

        if (!isOwnerConnected) {
            setRevokeFeedback(
                session.id,
                "failed",
                "Only the owner wallet can revoke sessions on this guard."
            );
            return;
        }

        if (!isGuardActive) {
            setRevokeFeedback(
                session.id,
                "failed",
                "This AgentGuard is not active yet."
            );
            return;
        }

        setActiveRevokeSessionId(session.id);
        setRevokeFeedback(session.id, "validating", `Checking session ${session.id}...`);

        try {
            const payload = beginCell()
                .store(
                    storeRevokeSession({
                        $$type: "RevokeSession",
                        sessionId: BigInt(session.id),
                    })
                )
                .endCell()
                .toBoc()
                .toString("base64");

            setRevokeFeedback(
                session.id,
                "awaiting-wallet",
                `Confirm the revoke transaction for session ${session.id} in your wallet.`
            );

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                network: wallet?.account.chain,
                messages: [
                    {
                        address: guardAddress,
                        amount: REVOKE_SESSION_TRANSACTION_VALUE,
                        payload,
                    },
                ],
            });

            setRevokeFeedback(
                session.id,
                "submitted",
                `Revoke submitted for session ${session.id}. Refreshing dashboard state...`
            );

            try {
                const refreshed = await onSubmittedRevoke(session.id);

                if (refreshed?.revoked) {
                    setRevokeFeedback(
                        session.id,
                        "refreshed",
                        `Session ${session.id} revoked and dashboard state refreshed.`
                    );
                    return;
                }

                setRevokeFeedback(
                    session.id,
                    "failed",
                    `The wallet signed the revoke transaction, but session ${session.id} still appears active. Refresh again in a few seconds.`
                );
            } catch {
                setRevokeFeedback(
                    session.id,
                    "submitted",
                    `Session ${session.id} revoke submitted. Chain refresh may take a few seconds.`
                );
            }
        } catch (error) {
            setRevokeFeedback(
                session.id,
                "failed",
                getDisplayErrorMessage(error, "Failed to revoke session")
            );
        } finally {
            setActiveRevokeSessionId(null);
        }
    };

    return (
        <section className="theme-panel p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="theme-kicker">Sessions</p>
                    <h2 className="mt-3 text-2xl font-semibold">Session management</h2>
                    <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                        Review each session row, its budget, expiry, current usage,
                        and lifecycle state. Each session is pinned to a single
                        target contract and one allowed message opcode.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onOpenCreateSession}
                    className="theme-primary-button rounded-2xl px-5 py-3 text-sm"
                >
                    Create Session
                </button>
            </div>

            {createdSessionCount === null ? (
                <div className="theme-subtle-panel mt-6 p-5">
                    <p className="theme-value text-sm">Session reads are unavailable.</p>
                    <p className="theme-copy mt-2 text-sm leading-6">
                        The guard is still operational, but the session counter could
                        not be resolved from chain right now.
                    </p>
                </div>
            ) : createdSessionCount === 0n ? (
                <div className="theme-subtle-panel mt-6 p-5">
                    <p className="theme-value text-sm">No sessions created yet.</p>
                    <p className="theme-copy mt-2 text-sm leading-6">
                        Create the first session to start managing agent budgets and
                        expiry windows from this dashboard.
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    <div className="theme-subtle-panel px-4 py-3 text-xs uppercase tracking-wide text-[var(--muted)]">
                        Showing {sessions.length} of {createdSessionCount.toString()} session
                        {createdSessionCount === 1n ? "" : "s"}
                    </div>

                    {sessions.map((session) => (
                        <SessionRow
                            key={session.id}
                            session={session}
                            actionLabel={
                                session.revoked
                                    ? "Revoked"
                                    : activeRevokeSessionId === session.id
                                      ? revokeFeedbackById[session.id]?.state ===
                                        "validating"
                                          ? "Validating..."
                                          : revokeFeedbackById[session.id]?.state ===
                                              "awaiting-wallet"
                                            ? "Awaiting wallet..."
                                            : "Refreshing..."
                                      : "Revoke session"
                            }
                            actionDisabled={
                                session.revoked ||
                                activeRevokeSessionId !== null ||
                                !isWalletConnected ||
                                !isOwnerConnected ||
                                !isGuardActive
                            }
                            onRevoke={() => {
                                void handleRevokeSession(session);
                            }}
                            feedback={revokeFeedbackById[session.id]}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
