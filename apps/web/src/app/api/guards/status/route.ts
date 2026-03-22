import { NextRequest, NextResponse } from "next/server";
import { Address } from "@ton/core";

export async function GET(request: NextRequest) {
    try {
        const addressParam = request.nextUrl.searchParams.get("address");

        if (!addressParam) {
            return NextResponse.json(
                { error: "Missing address" },
                { status: 400 }
            );
        }

        const address = Address.parse(addressParam);

        const endpoint =
            "https://testnet.toncenter.com/api/v2/getAddressInformation?address=" +
            encodeURIComponent(address.toString());

        const response = await fetch(endpoint, {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`TON API error: ${response.status}`);
        }

        const data = await response.json();

        const state = data?.result?.state ?? "unknown";
        const balance = data?.result?.balance ?? "0";

        return NextResponse.json({
            address: address.toString(),
            isDeployed: state === "active",
            state,
            balance,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to fetch guard status",
            },
            { status: 500 }
        );
    }
}