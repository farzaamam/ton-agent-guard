"use server";

import { readGuardStatus } from "@/lib/agent-guard/read-guard-status";

export async function readGuardStatusAction(address: string) {
    return readGuardStatus(address);
}
