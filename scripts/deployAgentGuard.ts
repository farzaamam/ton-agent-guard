import { toNano } from '@ton/core';
import { AgentGuard } from '../build/AgentGuard/AgentGuard_AgentGuard';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const agentGuard = provider.open(await AgentGuard.fromInit());

    await agentGuard.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(agentGuard.address);

    // run methods on `agentGuard`
}
