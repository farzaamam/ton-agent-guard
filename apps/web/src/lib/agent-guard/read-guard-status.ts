import "server-only";

import { Address } from "@ton/core";
import { AgentGuard } from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import type { GuardStatusResponse } from "@/lib/agent-guard/guard-status";
import { getTonClient } from "@/lib/ton/get-ton-client";

export async function readGuardStatus(addressInput: string): Promise<GuardStatusResponse> {
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
        const getterResults = await Promise.allSettled([
            agentGuard.getGetNextSessionId(),
            agentGuard.getGetReservedTotal(),
            agentGuard.getGetAvailableBalance(),
        ]);

        nextSessionId =
            getterResults[0].status === "fulfilled"
                ? getterResults[0].value.toString()
                : null;
        reservedBalance =
            getterResults[1].status === "fulfilled"
                ? getterResults[1].value.toString()
                : null;
        availableBalance =
            getterResults[2].status === "fulfilled"
                ? getterResults[2].value.toString()
                : null;
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
}
