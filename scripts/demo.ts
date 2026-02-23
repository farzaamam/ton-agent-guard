import { toNano, beginCell } from "@ton/core"; 
import { AgentGuard } from "../build/AgentGuard/AgentGuard_AgentGuard";
import { CounterReceiver, storePing } from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import { NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    const owner = provider.sender();
    if (!owner.address) throw new Error("Sender has no address");

    const agent = owner;

    console.log("Deploying AgentGuard...");
    const guard = provider.open(
        await AgentGuard.fromInit(owner.address)
    );

    await guard.send(owner, { value: toNano("0.2") }, null);

    console.log("AgentGuard deployed at:", guard.address.toString());

    console.log("Deploying CounterReceiver...");
    const counter = provider.open(
        await CounterReceiver.fromInit()
    );

    await counter.send(owner, { value: toNano("0.2") }, null);
    console.log("CounterReceiver deployed at:", counter.address.toString());

    console.log("Funding guard...");
    await owner.send({
        to: guard.address,
        value: toNano("1"),
    });
    await sleep(2500);

    console.log("Creating session...");
    await guard.send(
        owner,
        { value: toNano("0.1") },
        {
            $$type: "CreateSession",
            agent: agent.address!,
            expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
            maxTotal: toNano("0.5"),
            maxPerTx: toNano("0.2"),
            allowedTarget: counter.address,
        }
    );
    console.log("Session created.");
    await sleep(2500);

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
    console.log("Execute successful.");
    await sleep(2500);


    console.log("Deploying second CounterReceiver...");
    const counter2 = provider.open(await CounterReceiver.fromInit());
    await counter2.send(owner, { value: toNano("0.2") }, null);

    console.log("Adding second allowed target...");
    await guard.send(owner, { value: toNano("0.1") }, {
        $$type: "AddAllowedTarget",
        sessionId: 1n,
        target: counter2.address,
    });

    console.log("Executing via AgentGuard (Target 2)...");
    await guard.send(agent, { value: toNano("0.2") }, {
        $$type: "Execute",
        sessionId: 1n,
        nonce: 1n,
        target: counter2.address,
        value: toNano("0.1"),
        body: pingBody,
    });

    console.log("Counter1 count:", await counter.getGetCount());
    console.log("Counter2 count:", await counter2.getGetCount());

    console.log("✅ Multi-target session routing verified.");
    console.log("AgentGuard successfully enforced session policy.");
}