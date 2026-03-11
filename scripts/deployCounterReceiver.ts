import { toNano } from "@ton/core";
import { CounterReceiver } from "../build/CounterReceiver/CounterReceiver_CounterReceiver";
import { NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
    const counterReceiver = provider.open(await CounterReceiver.fromInit(1n));

    await counterReceiver.send(
        provider.sender(),
        {
            value: toNano("0.05"),
        },
        null
    );

    await provider.waitForDeploy(counterReceiver.address);

    console.log("CounterReceiver deployed at:", counterReceiver.address.toString());
}