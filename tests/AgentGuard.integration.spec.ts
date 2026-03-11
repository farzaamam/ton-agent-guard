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
    let stranger: SandboxContract<TreasuryContract>;

    let guard: SandboxContract<AgentGuard>;
    let counter: SandboxContract<CounterReceiver>;
    let counter2: SandboxContract<CounterReceiver>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        owner = await blockchain.treasury("owner");
        agent = await blockchain.treasury("agent");
        stranger = await blockchain.treasury("stranger");

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

        // Deploy CounterReceiver #1
        counter = blockchain.openContract(await CounterReceiver.fromInit(1n));
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

        // Deploy CounterReceiver #2
        counter2 = blockchain.openContract(await CounterReceiver.fromInit(2n));
        const deployCounter2 = await counter2.send(
            owner.getSender(),
            { value: toNano("0.05") },
            null
        );
        expect(deployCounter2.transactions).toHaveTransaction({
            from: owner.address,
            to: counter2.address,
            deploy: true,
            success: true,
        });

        // Fund guard so it can forward value during Execute
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

    const pingBody = (note: bigint = 1n) =>
        beginCell()
            .store(storePing({ $$type: "Ping", note }))
            .endCell();

    const createDefaultSession = async (expiry?: bigint) => {
        const sessionExpiry = expiry ?? BigInt(nowSec(blockchain) + 3600);

        return guard.send(
            owner.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "CreateSession",
                agent: agent.address,
                expiry: sessionExpiry,
                maxTotal: toNano("0.5"),
                maxPerTx: toNano("0.2"),
                allowedTarget: counter.address,
            }
        );
    };

    it("happy path: CreateSession -> Execute(Ping) increments CounterReceiver", async () => {
        expect(await counter.getGetCount()).toBe(0n);

        const create = await createDefaultSession();

        expect(create.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(await counter.getGetCount()).toBe(1n);
    });

    it("fails on replay nonce (same nonce twice)", async () => {
        await createDefaultSession();

        const ok = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(ok.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        const replay = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(replay.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });
    });

    it("fails when target is not allowed", async () => {
        await createDefaultSession();

        const bad = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: guard.address, // NOT allowed
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(bad.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails when non-owner tries to create session", async () => {
        const expiry = BigInt(nowSec(blockchain) + 3600);

        const res = await guard.send(
            stranger.getSender(),
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

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });
    });

    it("fails when sender is not the session agent", async () => {
        await createDefaultSession();

        const res = await guard.send(
            stranger.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails after session expiry", async () => {
        const expiry = BigInt(nowSec(blockchain) + 10);
        await createDefaultSession(expiry);

        blockchain.now = Number(expiry) + 1;

        const res = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails after session is revoked", async () => {
        await createDefaultSession();

        const revoke = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "RevokeSession",
                sessionId: 1n,
            }
        );

        expect(revoke.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const res = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails when value exceeds maxPerTx", async () => {
        await createDefaultSession();

        const res = await guard.send(
            agent.getSender(),
            { value: toNano("0.3") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.25"), // maxPerTx is 0.2
                body: pingBody(1n),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails when cumulative spend exceeds maxTotal", async () => {
        await createDefaultSession();

        const first = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.2"),
                body: pingBody(1n),
            }
        );

        expect(first.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        const second = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 1n,
                target: counter.address,
                value: toNano("0.2"),
                body: pingBody(1n),
            }
        );

        expect(second.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        const third = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 2n,
                target: counter.address,
                value: toNano("0.2"), // total would become 0.6 > 0.5
                body: pingBody(1n),
            }
        );

        expect(third.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(2n);
    });

    it("owner can add allowed target and agent can execute to it", async () => {
        await createDefaultSession();

        const add = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "AddAllowedTarget",
                sessionId: 1n,
                target: counter2.address,
            }
        );

        expect(add.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter2.address,
                value: toNano("0.05"),
                body: pingBody(2n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(await counter2.getGetCount()).toBe(2n);
    });

    it("owner can remove allowed target and execution then fails", async () => {
        await createDefaultSession();

        const remove = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "RemoveAllowedTarget",
                sessionId: 1n,
                target: counter.address,
            }
        );

        expect(remove.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                target: counter.address,
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("fails when non-owner tries to add allowed target", async () => {
        await createDefaultSession();

        const res = await guard.send(
            stranger.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "AddAllowedTarget",
                sessionId: 1n,
                target: counter2.address,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });
    });

    it("fails when non-owner tries to remove allowed target", async () => {
        await createDefaultSession();

        const res = await guard.send(
            stranger.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "RemoveAllowedTarget",
                sessionId: 1n,
                target: counter.address,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });
    });

    it("owner can withdraw", async () => {
        const before = await owner.getBalance();

        const res = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "Withdraw",
                amount: toNano("0.1"),
                to: owner.address,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: guard.address,
            to: owner.address,
            success: true,
        });

        const after = await owner.getBalance();
        expect(after > before).toBe(true);
    });

    it("fails when non-owner tries to withdraw", async () => {
        const res = await guard.send(
            stranger.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "Withdraw",
                amount: toNano("0.1"),
                to: stranger.address,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });
    });
});