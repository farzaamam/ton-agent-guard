import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { toNano, beginCell } from "@ton/core";
import { AgentGuard } from "../build/AgentGuard/AgentGuard_AgentGuard";
import {
    CounterReceiver,
    storePing,
} from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import "@ton/test-utils";

const nowSec = (bc: Blockchain) => bc.now ?? Math.floor(Date.now() / 1000);

describe("AgentGuard (integration)", () => {
    let blockchain: Blockchain;

    let owner: SandboxContract<TreasuryContract>;
    let agent: SandboxContract<TreasuryContract>;

    let guard: SandboxContract<AgentGuard>;
    let counter: SandboxContract<CounterReceiver>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        owner = await blockchain.treasury("owner");
        agent = await blockchain.treasury("agent");

        // Deploy AgentGuard(owner)
        guard = blockchain.openContract(await AgentGuard.fromInit(owner.address));
        const deployGuard = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            null
        );
        expect(deployGuard.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            deploy: true,
            success: true,
        });

        // Deploy CounterReceiver
        counter = blockchain.openContract(await CounterReceiver.fromInit());
        const deployCounter = await counter.send(
            owner.getSender(),
            { value: toNano("0.05") },
            null
        );
        expect(deployCounter.transactions).toHaveTransaction({
            from: owner.address,
            to: counter.address,
            deploy: true,
            success: true,
        });

        // Fund the guard so it can forward value during Execute
        const fund = await owner.send({
            to: guard.address,
            value: toNano("1"),
        });
        expect(fund.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });
    });

    it("happy path: CreateSession -> Execute(Ping) increments CounterReceiver", async () => {
        expect(await counter.getGetCount()).toBe(0n);

        // Create session
        const expiry = BigInt(nowSec(blockchain)+ 3600); // 1 hour from sandbox 'now'

        const create = await guard.send(
            owner.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "CreateSession",
                agent: agent.address,
                expiry,
                maxTotal: toNano("0.5"),
                maxPerTx: toNano("0.2"),
                allowedTarget: counter.address,
            }
        );

        expect(create.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        // Build Ping payload cell
        const pingBody = beginCell()
            .store(storePing({ $$type: "Ping", note: 1n }))
            .endCell();

        // Execute via agent
        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") }, // covers gas + forward
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody,
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        // Prove the target was actually called
        expect(await counter.getGetCount()).toBe(1n);
    });

    it("fails on replay nonce (same nonce twice)", async () => {
        const expiry = BigInt(nowSec(blockchain) + 3600);

        await guard.send(owner.getSender(), { value: toNano("0.1") }, {
            $$type: "CreateSession",
            agent: agent.address,
            expiry,
            maxTotal: toNano("0.5"),
            maxPerTx: toNano("0.2"),
            allowedTarget: counter.address,
        });

        const pingBody = beginCell()
            .store(storePing({ $$type: "Ping", note: 1n }))
            .endCell();

        // First execute ok
        const ok = await guard.send(agent.getSender(), { value: toNano("0.2") }, {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n,
            target: counter.address,
            value: toNano("0.05"),
            body: pingBody,
        });

        expect(ok.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        // Replay same nonce should fail
        const replay = await guard.send(agent.getSender(), { value: toNano("0.2") }, {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n, // replay
            target: counter.address,
            value: toNano("0.05"),
            body: pingBody,
        });

        expect(replay.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });
    });

    it("fails when target is not allowed", async () => {
        const expiry = BigInt(nowSec(blockchain) + 3600);

        await guard.send(owner.getSender(), { value: toNano("0.1") }, {
            $$type: "CreateSession",
            agent: agent.address,
            expiry,
            maxTotal: toNano("0.5"),
            maxPerTx: toNano("0.2"),
            allowedTarget: counter.address,
        });

        const pingBody = beginCell()
            .store(storePing({ $$type: "Ping", note: 1n }))
            .endCell();

        // Wrong target (guard itself) should fail
        const bad = await guard.send(agent.getSender(), { value: toNano("0.2") }, {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n,
            target: guard.address, // NOT allowed
            value: toNano("0.05"),
            body: pingBody,
        });

        expect(bad.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        // Count should remain unchanged
        expect(await counter.getGetCount()).toBe(0n);
    });
});