import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { CounterReceiver } from '../build/CounterReceiver/CounterReceiver_CounterReceiver';
import '@ton/test-utils';

describe('CounterReceiver', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counterReceiver: SandboxContract<CounterReceiver>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        counterReceiver = blockchain.openContract(await CounterReceiver.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await counterReceiver.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counterReceiver.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and counterReceiver are ready to use
    });
});
