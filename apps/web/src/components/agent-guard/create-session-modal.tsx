import { CreateSessionCard } from "@/components/agent-guard/create-session-card";
import { GuardModalShell } from "@/components/agent-guard/guard-modal-shell";

type CreateSessionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    guardAddress: string;
    nextSessionId: string | null;
    availableBalance: string | null;
    isWalletConnected: boolean;
    isOwnerConnected: boolean;
    isGuardActive: boolean;
    onSubmittedRefresh: (
        previousNextSessionId: string | null
    ) => Promise<{ nextSessionId: string | null } | null>;
};

export function CreateSessionModal({
    isOpen,
    onClose,
    guardAddress,
    nextSessionId,
    availableBalance,
    isWalletConnected,
    isOwnerConnected,
    isGuardActive,
    onSubmittedRefresh,
}: CreateSessionModalProps) {
    return (
        <GuardModalShell isOpen={isOpen} onClose={onClose}>
            <CreateSessionCard
                guardAddress={guardAddress}
                nextSessionId={nextSessionId}
                availableBalance={availableBalance}
                isWalletConnected={isWalletConnected}
                isOwnerConnected={isOwnerConnected}
                isGuardActive={isGuardActive}
                onSubmittedRefresh={onSubmittedRefresh}
            />
        </GuardModalShell>
    );
}
