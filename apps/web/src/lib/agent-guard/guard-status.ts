export type GuardSessionSummary = {
    id: string;
    agent: string;
    target: string;
    allowedOp: string;
    expiry: string;
    maxTotal: string;
    maxPerTx: string;
    spentTotal: string;
    nonceExpected: string;
    revoked: boolean;
    lockedAmount: string;
};

export type GuardStatusResponse = {
    address: string;
    isDeployed: boolean;
    state: string;
    balance: string;
    reservedBalance: string | null;
    availableBalance: string | null;
    nextSessionId: string | null;
    sessions: GuardSessionSummary[];
};
