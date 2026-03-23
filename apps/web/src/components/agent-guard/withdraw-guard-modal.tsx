import { GuardModalShell } from "@/components/agent-guard/guard-modal-shell";
import { WithdrawGuardCard } from "@/components/agent-guard/withdraw-guard-card";

type WithdrawGuardModalProps = {
    isOpen: boolean;
    onClose: () => void;
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

export function WithdrawGuardModal({
    isOpen,
    onClose,
    guardAddress,
    ownerAddress,
    balance,
    availableBalance,
    isWalletConnected,
    isOwnerConnected,
    isGuardActive,
    onSubmittedRefresh,
}: WithdrawGuardModalProps) {
    return (
        <GuardModalShell isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
            <WithdrawGuardCard
                guardAddress={guardAddress}
                ownerAddress={ownerAddress}
                balance={balance}
                availableBalance={availableBalance}
                isWalletConnected={isWalletConnected}
                isOwnerConnected={isOwnerConnected}
                isGuardActive={isGuardActive}
                onSubmittedRefresh={onSubmittedRefresh}
            />
        </GuardModalShell>
    );
}
