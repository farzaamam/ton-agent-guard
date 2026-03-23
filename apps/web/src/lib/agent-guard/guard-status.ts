export type GuardStatusResponse = {
    address: string;
    isDeployed: boolean;
    state: string;
    balance: string;
    reservedBalance: string | null;
    availableBalance: string | null;
    nextSessionId: string | null;
};
