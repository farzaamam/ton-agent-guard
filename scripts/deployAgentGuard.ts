import { toNano } from "@ton/core";
import { AgentGuard } from "../build/AgentGuard/AgentGuard_AgentGuard";
import { NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();
    if (!sender.address) throw new Error("Sender has no address");

    const agentGuard = provider.open(await AgentGuard.fromInit(sender.address));

    await agentGuard.send(
        sender,
        {
            value: toNano("0.05"),
        },
        null
    );

    await provider.waitForDeploy(agentGuard.address);

    console.log("AgentGuard deployed at:", agentGuard.address.toString());
}