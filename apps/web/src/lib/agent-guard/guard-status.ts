export type GuardSessionSummary = {
    id: string;
    agent: string;
    target: string;
    allowedOp: string;
    policyMode: string;
    bodyHash: string;
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
    sessionReadLimit: number;
    sessionsTruncated: boolean;
    visibleSessionStartId: string | null;
    visibleSessionEndId: string | null;
    sessions: GuardSessionSummary[];
};
