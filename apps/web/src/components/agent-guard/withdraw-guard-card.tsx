"use client";

import { Address, beginCell, fromNano, toNano } from "@ton/core";
import { useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { storeWithdraw } from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import {
    formatTonValue,
    getDisplayErrorMessage,
} from "@/components/agent-guard/guard-utils";

type WithdrawGuardCardProps = {
    guardAddress: string;
    ownerAddress: string;
    balance: string;
    availableBalance: string | null;
    isWalletConnected: boolean;
    isOwnerConnected: boolean;
    isGuardActive: boolean;
    onSubmittedRefresh: (
        previousBalance: string,
        previousAvailableBalance: string | null
    ) => Promise<{ balance: string; availableBalance: string | null } | null>;
};

type WithdrawGuardState =
    | "idle"
    | "validating"
    | "awaiting-wallet"
    | "submitted"
    | "refreshed"
    | "failed";

const WITHDRAW_GUARD_TRANSACTION_VALUE = toNano("0.02").toString();
const WITHDRAW_GUARD_SAFETY_BUFFER = toNano("0.02");

const statusToneClasses: Record<WithdrawGuardState, string> = {
    idle: "theme-status-neutral",
    validating: "theme-status-pending",
    "awaiting-wallet": "theme-status-pending",
    submitted: "theme-status-pending",
    refreshed: "theme-status-success",
    failed: "theme-status-error",
};

const statusLabels: Record<WithdrawGuardState, string> = {
    idle: "Idle",
    validating: "Validating",
    "awaiting-wallet": "Awaiting wallet confirmation",
    submitted: "Submitted",
    refreshed: "Refreshed",
    failed: "Failed",
};

function prepareWithdrawPayload(amount: bigint, ownerAddress: string) {
    const body = beginCell()
        .store(
            storeWithdraw({
                $$type: "Withdraw",
                amount,
                to: Address.parse(ownerAddress),
            })
        )
        .endCell()
        .toBoc()
        .toString("base64");

    return {
        amount: WITHDRAW_GUARD_TRANSACTION_VALUE,
        body,
    };
}

function getSafeWithdrawAmount(availableBalance: string | null) {
    if (!availableBalance) {
        return null;
    }

    const parsedAvailableBalance = BigInt(availableBalance);

    if (parsedAvailableBalance <= 0n) {
        return 0n;
    }

    if (parsedAvailableBalance > WITHDRAW_GUARD_SAFETY_BUFFER) {
        return parsedAvailableBalance - WITHDRAW_GUARD_SAFETY_BUFFER;
    }

    return parsedAvailableBalance / 2n;
}

export function WithdrawGuardCard({
    guardAddress,
    ownerAddress,
    balance,
    availableBalance,
    isWalletConnected,
    isOwnerConnected,
    isGuardActive,
    onSubmittedRefresh,
}: WithdrawGuardCardProps) {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();

    const [amount, setAmount] = useState("");
    const [submissionState, setSubmissionState] =
        useState<WithdrawGuardState>("idle");
    const [amountError, setAmountError] = useState("");
    const [statusText, setStatusText] = useState("");
    const safeWithdrawAmount = getSafeWithdrawAmount(availableBalance);

    const isBusy =
        submissionState === "validating" ||
        submissionState === "awaiting-wallet" ||
        submissionState === "submitted";

    const hasKnownWithdrawableBalance =
        safeWithdrawAmount !== null ? safeWithdrawAmount > 0n : true;
    const canSubmit =
        isWalletConnected &&
        isOwnerConnected &&
        isGuardActive &&
        hasKnownWithdrawableBalance &&
        !isBusy;

    const submitLabel =
        submissionState === "validating"
            ? "Validating..."
            : submissionState === "awaiting-wallet"
              ? "Awaiting wallet..."
              : submissionState === "submitted"
                ? "Refreshing..."
                : "Withdraw Guard";

    const eligibilityHint = !isWalletConnected
        ? "Connect the owner wallet to withdraw unlocked guard funds."
        : !isOwnerConnected
          ? "Only the wallet that resolves to this AgentGuard can withdraw guard funds."
            : !isGuardActive
              ? "This AgentGuard must be active before funds can be withdrawn."
              : safeWithdrawAmount === 0n
                ? "No unlocked balance is currently available to withdraw."
              : "Withdraw sends unlocked TON back to the connected owner wallet. Max leaves a small fee buffer so the contract call can complete.";

    const handleAmountChange = (value: string) => {
        if (value && !/^\d*(\.\d{0,9})?$/.test(value)) {
            return;
        }

        if (!isBusy) {
            setSubmissionState("idle");
            setAmountError("");
            setStatusText("");
        }

        setAmount(value);
    };

    const handleUseMax = () => {
        if (safeWithdrawAmount === null || isBusy) {
            return;
        }

        setSubmissionState("idle");
        setAmountError("");
        setStatusText("");
        setAmount(fromNano(safeWithdrawAmount));
    };

    const handleSubmit = async () => {
        if (!isWalletConnected) {
            setSubmissionState("failed");
            setStatusText("Connect the owner wallet first.");
            return;
        }

        if (!isOwnerConnected) {
            setSubmissionState("failed");
            setStatusText("Only the owner wallet can withdraw from this guard.");
            return;
        }

        if (!isGuardActive) {
            setSubmissionState("failed");
            setStatusText("This AgentGuard is not active yet.");
            return;
        }

        setSubmissionState("validating");
        setAmountError("");
        setStatusText("Checking withdraw parameters...");

        const amountValue = amount.trim();

        if (!amountValue) {
            setAmountError("Enter a TON amount to withdraw.");
            setSubmissionState("failed");
            setStatusText("Enter an amount before submitting.");
            return;
        }

        let withdrawAmount: bigint;

        try {
            withdrawAmount = toNano(amountValue);
        } catch (error) {
            setAmountError("Enter a valid TON amount.");
            setSubmissionState("failed");
            setStatusText(
                getDisplayErrorMessage(error, "Enter a valid TON amount.")
            );
            return;
        }

        if (withdrawAmount <= 0n) {
            setAmountError("Enter an amount greater than zero.");
            setSubmissionState("failed");
            setStatusText("Withdraw amount must be greater than zero.");
            return;
        }

        if (safeWithdrawAmount !== null && withdrawAmount > safeWithdrawAmount) {
            setAmountError(
                `Withdraw amount exceeds the safe max (${formatTonValue(
                    safeWithdrawAmount.toString(),
                    {
                        placeholder: "0 TON",
                        maximumFractionDigits: 4,
                    }
                )}).`
            );
            setSubmissionState("failed");
            setStatusText(
                "Lower the withdraw amount to leave a small fee buffer for the contract call."
            );
            return;
        }

        let preparedPayload: { amount: string; body: string };

        try {
            preparedPayload = prepareWithdrawPayload(withdrawAmount, ownerAddress);
        } catch (error) {
            setSubmissionState("failed");
            setStatusText(
                getDisplayErrorMessage(error, "Failed to prepare withdraw payload.")
            );
            return;
        }

        try {
            setSubmissionState("awaiting-wallet");
            setStatusText("Confirm the Withdraw transaction in your wallet.");

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                network: wallet?.account.chain,
                messages: [
                    {
                        address: guardAddress,
                        amount: preparedPayload.amount,
                        payload: preparedPayload.body,
                    },
                ],
            });

            setSubmissionState("submitted");
            setStatusText("Withdraw submitted. Refreshing dashboard state...");

            try {
                const refreshed = await onSubmittedRefresh(balance, availableBalance);
                const didRefresh =
                    !!refreshed &&
                    (refreshed.balance !== balance ||
                        refreshed.availableBalance !== availableBalance);

                if (didRefresh) {
                    setAmount("");
                    setSubmissionState("refreshed");
                    setStatusText(
                        "Withdraw submitted and the dashboard refreshed."
                    );
                    return;
                }

                setSubmissionState("failed");
                setStatusText(
                    "The wallet signed the transaction, but no balance change was detected onchain. Check available balance and owner permissions."
                );
            } catch {
                setSubmissionState("submitted");
                setStatusText(
                    "Withdraw submitted. Chain refresh may take a few seconds."
                );
            }
        } catch (error) {
            setSubmissionState("failed");
            setStatusText(
                getDisplayErrorMessage(error, "Failed to submit withdraw")
            );
        }
    };

    return (
        <section className="theme-panel p-6">
            <p className="theme-kicker">Withdraw Guard</p>
            <h2 className="mt-3 text-2xl font-semibold">
                Return unlocked TON to the owner
            </h2>
            <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                Withdraw from the guard&apos;s unlocked operating balance back to the
                connected owner wallet.
            </p>

            <div className="mt-6 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                    <label htmlFor="guard-withdraw-amount" className="theme-label">
                        Amount (TON)
                    </label>
                    <input
                        id="guard-withdraw-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.10"
                        value={amount}
                        onChange={(event) => handleAmountChange(event.target.value)}
                        disabled={isBusy}
                        className="theme-input mt-2 text-sm"
                    />
                    {amountError ? (
                        <p className="theme-error mt-2 text-xs leading-5">{amountError}</p>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={handleUseMax}
                    disabled={safeWithdrawAmount === null || safeWithdrawAmount <= 0n || isBusy}
                    className="theme-secondary-button rounded-2xl px-4 py-3 text-sm"
                >
                    Max
                </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="theme-subtle-panel p-4">
                    <p className="theme-label">Destination</p>
                    <p className="theme-value mt-2 break-all text-sm">
                        {ownerAddress || "Connect the owner wallet"}
                    </p>
                </div>

                <div className="theme-subtle-panel p-4">
                    <p className="theme-label">Available balance</p>
                    <p className="theme-value mt-2 text-sm">
                        {formatTonValue(availableBalance, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                    <p className="theme-hint mt-2 text-xs leading-5">
                        Safe max now:{" "}
                        {formatTonValue(safeWithdrawAmount?.toString(), {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                    <p className="theme-hint mt-2 text-xs leading-5">
                        Guard balance:{" "}
                        {formatTonValue(balance, {
                            placeholder: "0 TON",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                </div>
            </div>

            <div className="theme-subtle-panel mt-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="theme-label">Transaction state</p>
                        <p
                            className={`mt-2 text-sm ${statusToneClasses[submissionState]}`}
                        >
                            {statusLabels[submissionState]}
                        </p>
                    </div>

                    <div className="sm:text-right">
                        <p className="theme-label">Execution amount</p>
                        <p className="theme-value mt-2 text-sm">
                            {formatTonValue(WITHDRAW_GUARD_TRANSACTION_VALUE, {
                                placeholder: "0 TON",
                                maximumFractionDigits: 4,
                            })}
                        </p>
                    </div>
                </div>

                {statusText ? (
                    <p
                        className={`mt-4 text-sm leading-6 ${statusToneClasses[submissionState]}`}
                    >
                        {statusText}
                    </p>
                ) : null}
            </div>

            <p className="theme-copy mt-4 text-sm leading-6">{eligibilityHint}</p>

            <button
                type="button"
                onClick={() => {
                    void handleSubmit();
                }}
                disabled={!canSubmit}
                className="theme-primary-button mt-6 rounded-2xl px-5 py-3 text-sm"
            >
                {submitLabel}
            </button>
        </section>
    );
}
