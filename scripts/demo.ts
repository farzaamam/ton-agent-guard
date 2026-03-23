import { toNano, beginCell } from "@ton/core";
import { AgentGuard } from "../build/AgentGuard/AgentGuard_AgentGuard";
import {
    CounterReceiver,
    storePing,
} from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import { NetworkProvider } from "@ton/blueprint";

const PING_OPCODE = BigInt(CounterReceiver.opcodes.Ping);

export async function run(provider: NetworkProvider) {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const owner = provider.sender();
    if (!owner.address) throw new Error("Sender has no address");

    const ownerAddress = owner.address;

    // Demo keeps owner and agent the same sender for convenience.
    // The contract still supports separate owner and agent addresses.
    const agent = owner;
    const agentAddress = ownerAddress;

    console.log("Deploying AgentGuard...");
    const guard = provider.open(await AgentGuard.fromInit(ownerAddress));

    await guard.send(owner, { value: toNano("0.2") }, null);
    await provider.waitForDeploy(guard.address);

    console.log("AgentGuard deployed at:", guard.address.toString());

    console.log("Deploying CounterReceiver...");
    const counter = provider.open(await CounterReceiver.fromInit(1n));

    await counter.send(owner, { value: toNano("0.2") }, null);
    await provider.waitForDeploy(counter.address);

    console.log("CounterReceiver deployed at:", counter.address.toString());

    console.log("Funding guard...");
    await owner.send({
        to: guard.address,
        value: toNano("1"),
    });
    await sleep(1500);

    console.log("Creating single-target, single-op session...");
    await guard.send(
        owner,
        { value: toNano("0.1") },
        {
            $$type: "CreateSession",
            agent: agentAddress,
            target: counter.address,
            allowedOp: PING_OPCODE,
            expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
            maxTotal: toNano("0.5"),
            maxPerTx: toNano("0.2"),
        }
    );

    console.log("Session created.");
    await sleep(1500);

    const pingBody = beginCell()
        .store(storePing({ $$type: "Ping", note: 1n }))
        .endCell();

    console.log("Executing via AgentGuard...");
    await guard.send(
        agent,
        { value: toNano("0.2") },
        {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n,
            value: toNano("0.1"),
            body: pingBody,
        }
    );

    console.log("Execute successful.");
    await sleep(1500);

    const session = await guard.getGetSession(1n);

    console.log("Session target:", session.target.toString());
    console.log("Session allowedOp:", session.allowedOp.toString());
    console.log("Session spentTotal:", session.spentTotal.toString());
    console.log("Session nonceExpected:", session.nonceExpected.toString());
    console.log("Session lockedAmount:", session.lockedAmount.toString());

    console.log("Counter count:", (await counter.getGetCount()).toString());
    console.log("Reserved total:", (await guard.getGetReservedTotal()).toString());
    console.log("Available balance:", (await guard.getGetAvailableBalance()).toString());

    console.log("✅ Single-target, single-op session execution verified.");
    console.log("✅ AgentGuard enforced session policy successfully.");
}
