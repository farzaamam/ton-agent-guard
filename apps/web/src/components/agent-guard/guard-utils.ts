import { Address, fromNano } from "@ton/core";

export type { GuardStatusResponse } from "@/lib/agent-guard/guard-status";

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

function readNonEmptyString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractErrorMessage(error: unknown): string | null {
    const directMessage = readNonEmptyString(error);

    if (directMessage) {
        return directMessage;
    }

    if (error instanceof Error) {
        if (error.name === "UserRejectsError") {
            return "Request rejected in wallet.";
        }

        const errorMessage = readNonEmptyString(error.message);

        if (errorMessage) {
            return errorMessage;
        }

        const errorCause = extractErrorMessage(error.cause);

        if (errorCause) {
            return errorCause;
        }

        return readNonEmptyString(error.name);
    }

    if (!error || typeof error !== "object") {
        return null;
    }

    if ("message" in error) {
        const objectMessage = readNonEmptyString(error.message);

        if (objectMessage) {
            return objectMessage;
        }
    }

    if ("info" in error) {
        const objectInfo = readNonEmptyString(error.info);

        if (objectInfo) {
            return objectInfo;
        }
    }

    if ("cause" in error) {
        const objectCause = extractErrorMessage(error.cause);

        if (objectCause) {
            return objectCause;
        }
    }

    return null;
}

export function getDisplayErrorMessage(error: unknown, fallback: string) {
    return extractErrorMessage(error) ?? fallback;
}
