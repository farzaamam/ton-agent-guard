import "server-only";

import { TonClient } from "@ton/ton";

const DEFAULT_TONCENTER_RPC_ENDPOINT = "https://testnet.toncenter.com/api/v2/jsonRPC";

let tonClient: TonClient | null = null;

export function getTonClient() {
    if (!tonClient) {
        tonClient = new TonClient({
            endpoint:
                process.env.TONCENTER_RPC_ENDPOINT ?? DEFAULT_TONCENTER_RPC_ENDPOINT,
            apiKey: process.env.TONCENTER_API_KEY,
        });
    }

    return tonClient;
}
