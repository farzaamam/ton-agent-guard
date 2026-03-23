import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { Cell, toNano, beginCell } from "@ton/core";
import {
    AgentGuard,
    AgentGuard_errors_backward,
} from "../build/AgentGuard/AgentGuard_AgentGuard";
import {
    CounterReceiver,
    storePing,
} from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import "@ton/test-utils";

const nowSec = (bc: Blockchain) => bc.now ?? Math.floor(Date.now() / 1000);
const PING_OPCODE = BigInt(CounterReceiver.opcodes.Ping);
const cellHashInt = (cell: Cell) => BigInt(`0x${cell.hash().toString("hex")}`);

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

    const wrongOpBody = () =>
        beginCell()
            .storeUint(0xdeadbeef, 32)
            .storeUint(0, 1)
            .endCell();

    const createDefaultSession = async (
        expiry?: bigint,
        target = counter.address,
        sessionAgent = agent.address,
        allowedOp = PING_OPCODE,
        policyMode = 0n,
        bodyHash = 0n
    ) => {
        const sessionExpiry = expiry ?? BigInt(nowSec(blockchain) + 3600);

        return guard.send(
            owner.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "CreateSession",
                agent: sessionAgent,
                target,
                allowedOp,
                policyMode,
                bodyHash,
                expiry: sessionExpiry,
                maxTotal: toNano("0.5"),
                maxPerTx: toNano("0.2"),
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
                value: toNano("0.05"),
                body: pingBody(1n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(exec.transactions).toHaveTransaction({
            from: guard.address,
            to: counter.address,
            success: true,
        });

        expect(await counter.getGetCount()).toBe(1n);
    });

    it("fails when execute body opcode does not match session allowedOp", async () => {
        await createDefaultSession();

        const res = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body: wrongOpBody(),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("rejects negative allowedOp when creating a session", async () => {
        const res = await createDefaultSession(undefined, counter.address, agent.address, -1n);

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BAD_ALLOWED_OP,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
    });

    it("rejects allowedOp above 0xffffffff when creating a session", async () => {
        const res = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            0x1_0000_0000n
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BAD_ALLOWED_OP,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
    });

    it("rejects invalid policyMode when creating a session", async () => {
        const res = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            2n
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BAD_POLICY_MODE,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
    });

    it("rejects opcode-only mode with nonzero bodyHash", async () => {
        const strictBody = pingBody(11n);
        const res = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            0n,
            cellHashInt(strictBody)
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BODY_HASH_MUST_BE_ZERO,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
    });

    it("rejects exact-body-hash mode with zero bodyHash", async () => {
        const res = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            1n,
            0n
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BODY_HASH_REQUIRED,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
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

    it("fails when non-owner tries to create session", async () => {
        const expiry = BigInt(nowSec(blockchain) + 3600);

        const res = await guard.send(
            stranger.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "CreateSession",
                agent: agent.address,
                target: counter.address,
                allowedOp: PING_OPCODE,
                policyMode: 0n,
                bodyHash: 0n,
                expiry,
                maxTotal: toNano("0.5"),
                maxPerTx: toNano("0.2"),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: stranger.address,
            to: guard.address,
            success: false,
        });
    });

    it("fails when agent matches guard address", async () => {
        const res = await createDefaultSession(undefined, counter.address, guard.address);

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
        expect(await guard.getGetReservedTotal()).toBe(0n);
    });

    it("fails when target matches guard address", async () => {
        const res = await createDefaultSession(undefined, guard.address);

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
        expect(await guard.getGetReservedTotal()).toBe(0n);
    });

    it("fails when agent matches target", async () => {
        const res = await createDefaultSession(undefined, agent.address, agent.address);

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
        });

        expect(await guard.getGetNextSessionId()).toBe(1n);
        expect(await guard.getGetReservedTotal()).toBe(0n);
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
                value: toNano("0.25"),
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
                value: toNano("0.2"),
                body: pingBody(2n),
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
                value: toNano("0.2"),
                body: pingBody(3n),
            }
        );

        expect(third.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
        });

        expect(await counter.getGetCount()).toBe(3n);
    });

    it("session target is fixed: executes only to the configured target", async () => {
        await createDefaultSession(undefined, counter2.address);

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body: pingBody(9n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(exec.transactions).toHaveTransaction({
            from: guard.address,
            to: counter2.address,
            success: true,
        });

        expect(await counter.getGetCount()).toBe(0n);
        expect(await counter2.getGetCount()).toBe(9n);
    });

    it("opcode-only policy executes successfully without a body hash requirement", async () => {
        const body = pingBody(21n);
        const create = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            0n,
            0n
        );

        expect(create.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const createdSession = await guard.getGetSession(1n);
        expect(createdSession.policyMode).toBe(0n);
        expect(createdSession.bodyHash).toBe(0n);

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body,
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(exec.transactions).toHaveTransaction({
            from: guard.address,
            to: counter.address,
            success: true,
        });

        expect(await counter.getGetCount()).toBe(21n);
    });

    it("exact-body-hash policy executes successfully with the configured body hash", async () => {
        const strictBody = pingBody(22n);
        const strictBodyHash = cellHashInt(strictBody);
        const create = await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            1n,
            strictBodyHash
        );

        expect(create.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        const createdSession = await guard.getGetSession(1n);
        expect(createdSession.policyMode).toBe(1n);
        expect(createdSession.bodyHash).toBe(strictBodyHash);

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body: strictBody,
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(exec.transactions).toHaveTransaction({
            from: guard.address,
            to: counter.address,
            success: true,
        });

        expect(await counter.getGetCount()).toBe(22n);
    });

    it("fails exact-body-hash execution when body payload differs but opcode stays the same", async () => {
        const strictBody = pingBody(30n);
        const mismatchedBody = pingBody(31n);
        await createDefaultSession(
            undefined,
            counter.address,
            agent.address,
            PING_OPCODE,
            1n,
            cellHashInt(strictBody)
        );

        const createdSession = await guard.getGetSession(1n);
        expect(createdSession.policyMode).toBe(1n);
        expect(createdSession.bodyHash).toBe(cellHashInt(strictBody));

        const res = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body: mismatchedBody,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: false,
            exitCode: AgentGuard_errors_backward.BODY_HASH_MISMATCH,
        });

        expect(await counter.getGetCount()).toBe(0n);
    });

    it("exposes session state and lock status via getters", async () => {
        await createDefaultSession();

        expect((await guard.getGetOwner()).toString()).toBe(owner.address.toString());
        expect(await guard.getGetNextSessionId()).toBe(2n);
        expect(await guard.getGetReservedTotal()).toBe(toNano("0.5"));

        const createdSession = await guard.getGetSession(1n);
        expect(createdSession.agent.toString()).toBe(agent.address.toString());
        expect(createdSession.target.toString()).toBe(counter.address.toString());
        expect(createdSession.allowedOp).toBe(PING_OPCODE);
        expect(createdSession.policyMode).toBe(0n);
        expect(createdSession.bodyHash).toBe(0n);
        expect(createdSession.expiry > BigInt(nowSec(blockchain))).toBe(true);
        expect(createdSession.maxTotal).toBe(toNano("0.5"));
        expect(createdSession.maxPerTx).toBe(toNano("0.2"));
        expect(createdSession.spentTotal).toBe(0n);
        expect(createdSession.nonceExpected).toBe(0n);
        expect(createdSession.revoked).toBe(false);
        expect(createdSession.lockedAmount).toBe(toNano("0.5"));

        const exec = await guard.send(
            agent.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Execute",
                sessionId: 1n,
                nonce: 0n,
                value: toNano("0.05"),
                body: pingBody(3n),
            }
        );

        expect(exec.transactions).toHaveTransaction({
            from: agent.address,
            to: guard.address,
            success: true,
        });

        expect(await guard.getGetReservedTotal()).toBe(toNano("0.45"));

        const updatedSession = await guard.getGetSession(1n);
        expect(updatedSession.target.toString()).toBe(counter.address.toString());
        expect(updatedSession.allowedOp).toBe(PING_OPCODE);
        expect(updatedSession.policyMode).toBe(0n);
        expect(updatedSession.bodyHash).toBe(0n);
        expect(updatedSession.spentTotal).toBe(toNano("0.05"));
        expect(updatedSession.nonceExpected).toBe(1n);
        expect(updatedSession.lockedAmount).toBe(toNano("0.45"));
    });

    it("blocks over-withdrawal while a session is active and releases funds after expiry", async () => {
        const expiry = BigInt(nowSec(blockchain) + 10);
        await createDefaultSession(expiry);

        const lockedBalance = await guard.getGetReservedTotal();
        expect(lockedBalance).toBe(toNano("0.5"));

        const availableBeforeExpiry = await guard.getGetAvailableBalance();
        const blocked = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "Withdraw",
                amount: availableBeforeExpiry + 1n,
                to: owner.address,
            }
        );

        expect(blocked.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
        });

        blockchain.now = Number(expiry) + 1;

        expect(await guard.getGetReservedTotal()).toBe(0n);
        expect((await guard.getGetSession(1n)).lockedAmount).toBe(0n);

        const availableAfterExpiry = await guard.getGetAvailableBalance();
        const safeWithdrawAmount =
            availableAfterExpiry > toNano("0.02")
                ? availableAfterExpiry - toNano("0.02")
                : availableAfterExpiry / 2n;

        const released = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "Withdraw",
                amount: safeWithdrawAmount,
                to: owner.address,
            }
        );

        expect(released.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: true,
        });

        expect(released.transactions).toHaveTransaction({
            from: guard.address,
            to: owner.address,
            success: true,
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

    it("fails when owner withdraws to guard address", async () => {
        const res = await guard.send(
            owner.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "Withdraw",
                amount: toNano("0.1"),
                to: guard.address,
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: guard.address,
            success: false,
        });
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
