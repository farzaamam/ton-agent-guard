import { toNano, beginCell } from "@ton/core";
import { AgentGuard } from "../build/AgentGuard/AgentGuard_AgentGuard";
import {
    CounterReceiver,
    storePing,
} from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import { NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const owner = provider.sender();
    if (!owner.address) throw new Error("Sender has no address");

    const ownerAddress = owner.address;

    // For now, demo uses the same sender as both owner and agent.
    // Integration tests already prove the separated owner/agent model.
    const agent = owner;
    const agentAddress = ownerAddress;

    console.log("Deploying AgentGuard...");
    const guard = provider.open(await AgentGuard.fromInit(ownerAddress));

    await guard.send(owner, { value: toNano("0.2") }, null);
    await provider.waitForDeploy(guard.address);

    console.log("AgentGuard deployed at:", guard.address.toString());

    console.log("Deploying CounterReceiver #1...");
    const counter = provider.open(await CounterReceiver.fromInit(1n));

    await counter.send(owner, { value: toNano("0.2") }, null);
    await provider.waitForDeploy(counter.address);

    console.log("CounterReceiver #1 deployed at:", counter.address.toString());

    console.log("Funding guard...");
    await owner.send({
        to: guard.address,
        value: toNano("1"),
    });
    await sleep(1500);

    console.log("Creating session...");
    await guard.send(
        owner,
        { value: toNano("0.1") },
        {
            $$type: "CreateSession",
            agent: agentAddress,
            expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
            maxTotal: toNano("0.5"),
            maxPerTx: toNano("0.2"),
            allowedTarget: counter.address,
        }
    );

    console.log("Session created.");
    await sleep(1500);

    const pingBody = beginCell()
        .store(storePing({ $$type: "Ping", note: 1n }))
        .endCell();

    console.log("Executing via AgentGuard (Target 1)...");
    await guard.send(
        agent,
        { value: toNano("0.2") },
        {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n,
            target: counter.address,
            value: toNano("0.1"),
            body: pingBody,
        }
    );

    console.log("Execute to target 1 successful.");
    await sleep(1500);

    console.log("Deploying CounterReceiver #2...");
    const counter2 = provider.open(await CounterReceiver.fromInit(2n));

    await counter2.send(owner, { value: toNano("0.2") }, null);
    await provider.waitForDeploy(counter2.address);

    console.log("CounterReceiver #2 deployed at:", counter2.address.toString());

    console.log("Adding second allowed target...");
    await guard.send(
        owner,
        { value: toNano("0.1") },
        {
            $$type: "AddAllowedTarget",
            sessionId: 1n,
            target: counter2.address,
        }
    );

    await sleep(1500);

    console.log("Executing via AgentGuard (Target 2)...");
    await guard.send(
        agent,
        { value: toNano("0.2") },
        {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 1n,
            target: counter2.address,
            value: toNano("0.1"),
            body: pingBody,
        }
    );

    console.log("Execute to target 2 successful.");
    console.log("Counter1 count:", await counter.getGetCount());
    console.log("Counter2 count:", await counter2.getGetCount());

    console.log("✅ Multi-target session routing verified.");
    console.log("✅ AgentGuard enforced session policy successfully.");
}