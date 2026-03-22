import { NextResponse } from "next/server";
import { Address, beginCell, storeStateInit } from "@ton/core";
import { AgentGuard } from "../../../../../../../build/AgentGuard/AgentGuard_AgentGuard";

export async function POST(request: Request) {
    try {
        const { owner } = await request.json();

        if (!owner) {
            return NextResponse.json(
                { error: "Missing owner address" },
                { status: 400 }
            );
        }

        const ownerAddress = Address.parse(owner);
        const contract = await AgentGuard.fromInit(ownerAddress);

        if (!contract.init) {
            return NextResponse.json(
                { error: "AgentGuard init is missing" },
                { status: 500 }
            );
        }

        const stateInit = beginCell()
            .store(storeStateInit(contract.init))
            .endCell()
            .toBoc()
            .toString("base64");

        return NextResponse.json({
            address: contract.address.toString(),
            stateInit,
            amount: "50000000",
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}