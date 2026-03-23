"use client";

import { FundGuardCard } from "@/components/agent-guard/fund-guard-card";
import { GuardModalShell } from "@/components/agent-guard/guard-modal-shell";

type FundGuardModalProps = {
    isOpen: boolean;
    onClose: () => void;
    address: string;
    amount: string;
    presets: string[];
    isWalletConnected: boolean;
    isSubmitting: boolean;
    canSubmit: boolean;
    statusText: string;
    statusTone: "neutral" | "pending" | "success" | "error";
    onAmountChange: (value: string) => void;
    onPresetSelect: (value: string) => void;
    onSubmit: () => void;
};

export function FundGuardModal({
    isOpen,
    onClose,
    address,
    amount,
    presets,
    isWalletConnected,
    isSubmitting,
    canSubmit,
    statusText,
    statusTone,
    onAmountChange,
    onPresetSelect,
    onSubmit,
}: FundGuardModalProps) {
    return (
        <GuardModalShell isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
            <FundGuardCard
                address={address}
                amount={amount}
                presets={presets}
                isWalletConnected={isWalletConnected}
                isSubmitting={isSubmitting}
                canSubmit={canSubmit}
                statusText={statusText}
                statusTone={statusTone}
                onAmountChange={onAmountChange}
                onPresetSelect={onPresetSelect}
                onSubmit={onSubmit}
            />
        </GuardModalShell>
    );
}
