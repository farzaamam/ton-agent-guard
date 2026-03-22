import { Address, fromNano } from "@ton/core";

export type GuardStatusResponse = {
    address: string;
    isDeployed: boolean;
    state: string;
    balance: string;
    reservedBalance: string | null;
    availableBalance: string | null;
};

export function areSameAddress(left: string, right: string) {
    return Address.parse(left).equals(Address.parse(right));
}

export function formatTonValue(
    value: string | null | undefined,
    options?: {
        placeholder?: string;
        maximumFractionDigits?: number;
    }
) {
    if (!value) {
        return options?.placeholder ?? "Coming soon";
    }

    const formatted = fromNano(value);
    const [whole, fraction = ""] = formatted.split(".");
    const trimmedFraction = fraction.slice(0, options?.maximumFractionDigits ?? 3);
    const normalizedFraction = trimmedFraction.replace(/0+$/, "");

    if (!normalizedFraction) {
        return `${whole} TON`;
    }

    return `${whole}.${normalizedFraction} TON`;
}

export function formatDeploymentLabel(isDeployed: boolean, state: string) {
    if (isDeployed) {
        return "Active";
    }

    if (state === "uninitialized") {
        return "Not deployed";
    }

    return state === "unknown" ? "Unknown" : state;
}
