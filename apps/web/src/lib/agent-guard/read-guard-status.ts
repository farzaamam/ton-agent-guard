import "server-only";

import { Address } from "@ton/core";
import {
    AgentGuard,
    type SessionView,
} from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import type {
    GuardSessionSummary,
    GuardStatusResponse,
} from "@/lib/agent-guard/guard-status";
import { getTonClient } from "@/lib/ton/get-ton-client";

const DASHBOARD_SESSION_READ_LIMIT = 24;

function isRateLimitedError(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    if ("response" in error && error.response && typeof error.response === "object") {
        const response = error.response as { status?: unknown };

        return response.status === 429;
    }

    if ("status" in error) {
        return error.status === 429;
    }

    if ("message" in error && typeof error.message === "string") {
        return error.message.includes("429");
    }

    return false;
}

async function readOptionalGetter(
    loader: () => Promise<bigint>
): Promise<string | null> {
    try {
        return (await loader()).toString();
    } catch {
        return null;
    }
}

async function readSessionSummaries(
    agentGuard: {
        getGetSession: (sessionId: bigint) => Promise<SessionView>;
    },
    nextSessionId: string | null
): Promise<{
    sessions: GuardSessionSummary[];
    sessionsTruncated: boolean;
    visibleSessionStartId: string | null;
    visibleSessionEndId: string | null;
}> {
    if (!nextSessionId) {
        return {
            sessions: [],
            sessionsTruncated: false,
            visibleSessionStartId: null,
            visibleSessionEndId: null,
        };
    }

    const parsedNextSessionId = BigInt(nextSessionId);

    if (parsedNextSessionId <= 1n) {
        return {
            sessions: [],
            sessionsTruncated: false,
            visibleSessionStartId: null,
            visibleSessionEndId: null,
        };
    }

    const createdSessionCount = parsedNextSessionId - 1n;
    const boundedWindowSize = BigInt(DASHBOARD_SESSION_READ_LIMIT);
    const startSessionId =
        createdSessionCount > boundedWindowSize
            ? parsedNextSessionId - boundedWindowSize
            : 1n;
    const endSessionId = parsedNextSessionId - 1n;
    const sessions: GuardSessionSummary[] = [];

    for (let sessionId = startSessionId; sessionId <= endSessionId; sessionId += 1n) {
        try {
            const session = await agentGuard.getGetSession(sessionId);

            sessions.push({
                id: sessionId.toString(),
                agent: session.agent.toString(),
                target: session.target.toString(),
                allowedOp: session.allowedOp.toString(),
                policyMode: session.policyMode.toString(),
                bodyHash: session.bodyHash.toString(),
                expiry: session.expiry.toString(),
                maxTotal: session.maxTotal.toString(),
                maxPerTx: session.maxPerTx.toString(),
                spentTotal: session.spentTotal.toString(),
                nonceExpected: session.nonceExpected.toString(),
                revoked: session.revoked,
                lockedAmount: session.lockedAmount.toString(),
            });
        } catch {
            continue;
        }
    }

    return {
        sessions,
        sessionsTruncated: createdSessionCount > boundedWindowSize,
        visibleSessionStartId: startSessionId.toString(),
        visibleSessionEndId: endSessionId.toString(),
    };
}

export async function readGuardStatus(addressInput: string): Promise<GuardStatusResponse> {
    try {
        const tonClient = getTonClient();
        const address = Address.parse(addressInput);
        const contractState = await tonClient.getContractState(address);
        const state = contractState.state;
        const balance = contractState.balance.toString();
        let nextSessionId: string | null = null;
        let reservedBalance: string | null = null;
        let availableBalance: string | null = null;
        let sessions: GuardSessionSummary[] = [];
        let sessionsTruncated = false;
        let visibleSessionStartId: string | null = null;
        let visibleSessionEndId: string | null = null;

        if (state === "active") {
            const agentGuard = tonClient.open(AgentGuard.fromAddress(address));
            nextSessionId = await readOptionalGetter(() =>
                agentGuard.getGetNextSessionId()
            );
            reservedBalance = await readOptionalGetter(() =>
                agentGuard.getGetReservedTotal()
            );
            availableBalance =
                reservedBalance !== null
                    ? (BigInt(balance) - BigInt(reservedBalance)).toString()
                    : await readOptionalGetter(() =>
                          agentGuard.getGetAvailableBalance()
                      );
            const sessionReadResult = await readSessionSummaries(
                agentGuard,
                nextSessionId
            );
            sessions = sessionReadResult.sessions;
            sessionsTruncated = sessionReadResult.sessionsTruncated;
            visibleSessionStartId = sessionReadResult.visibleSessionStartId;
            visibleSessionEndId = sessionReadResult.visibleSessionEndId;
        }

        return {
            address: address.toString(),
            isDeployed: state === "active",
            state,
            balance,
            reservedBalance,
            availableBalance,
            nextSessionId,
            sessionReadLimit: DASHBOARD_SESSION_READ_LIMIT,
            sessionsTruncated,
            visibleSessionStartId,
            visibleSessionEndId,
            sessions,
        };
    } catch (error) {
        if (isRateLimitedError(error)) {
            throw new Error(
                "TON RPC rate limited the dashboard read. Retry in a few seconds or configure TONCENTER_API_KEY."
            );
        }

        throw error;
    }
}
