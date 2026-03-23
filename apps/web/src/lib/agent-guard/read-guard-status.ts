import "server-only";

import { Address } from "@ton/core";
import { AgentGuard } from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import type { GuardStatusResponse } from "@/lib/agent-guard/guard-status";
import { getTonClient } from "@/lib/ton/get-ton-client";

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
        }

        return {
            address: address.toString(),
            isDeployed: state === "active",
            state,
            balance,
            reservedBalance,
            availableBalance,
            nextSessionId,
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
