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
            { value: toNano('0.05') },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counterReceiver.address,
            deploy: true,
            success: true,
        });
    });

    it('should increment count on Ping', async () => {
        // initial state
        expect(await counterReceiver.getGetCount()).toBe(0n);

        // send Ping
        await counterReceiver.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'Ping',
                note: 1n,
            }
        );

        // verify increment
        expect(await counterReceiver.getGetCount()).toBe(1n);
    });
});