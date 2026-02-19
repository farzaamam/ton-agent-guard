import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { AgentGuard } from '../build/AgentGuard/AgentGuard_AgentGuard';
import '@ton/test-utils';

describe('AgentGuard', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let agentGuard: SandboxContract<AgentGuard>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        agentGuard = blockchain.openContract(await AgentGuard.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await agentGuard.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: agentGuard.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and agentGuard are ready to use
    });
});
