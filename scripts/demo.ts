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

    console.log("Executing Ping via guard...");
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


   /* console.log("Trying replay (should fail)...");
    try {
        await guard.send(agent, { value: toNano("0.2") }, {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 0n, // replay
            target: counter.address,
            value: toNano("0.1"),
            body: pingBody,
        });
        console.log("❌ Replay unexpectedly succeeded");
    } catch (e) {
        console.log("✅ Replay failed as expected:", (e as Error).message);
    }
    await sleep(2500);

    console.log("Trying wrong target (should fail)...");
    try {
        await guard.send(agent, { value: toNano("0.2") }, {
            $$type: "Execute",
            sessionId: 1n,
            nonce: 1n,
            target: guard.address, // wrong target
            value: toNano("0.1"),
            body: pingBody,
        });
        console.log("❌ Wrong target unexpectedly succeeded");
    } catch (e) {
        console.log("✅ Wrong target failed as expected:", (e as Error).message);
    }
        */
}