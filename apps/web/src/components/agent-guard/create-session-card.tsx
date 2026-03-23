"use client";

import { Address, beginCell, toNano } from "@ton/core";
import { useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { storeCreateSession } from "../../../../../build/AgentGuard/AgentGuard_AgentGuard";
import {
    formatTonValue,
    getDisplayErrorMessage,
} from "@/components/agent-guard/guard-utils";

type CreateSessionCardProps = {
    guardAddress: string;
    nextSessionId: string | null;
    availableBalance: string | null;
    isWalletConnected: boolean;
    isOwnerConnected: boolean;
    isGuardActive: boolean;
    onSubmittedRefresh: (
        previousNextSessionId: string | null
    ) => Promise<{ nextSessionId: string | null } | null>;
};

type CreateSessionState =
    | "idle"
    | "validating"
    | "awaiting-wallet"
    | "submitted"
    | "refreshed"
    | "failed";

type CreateSessionFormValues = {
    agent: string;
    expiry: string;
    maxTotal: string;
    maxPerTx: string;
    allowedTarget: string;
};

type CreateSessionField = keyof CreateSessionFormValues;

type CreateSessionFieldErrors = Partial<Record<CreateSessionField, string>>;

type PreparedCreateSessionRequest = {
    agent: string;
    expiry: string;
    maxTotal: string;
    maxPerTx: string;
    allowedTarget: string;
};

const CREATE_SESSION_TRANSACTION_VALUE = toNano("0.1").toString();

const statusToneClasses: Record<CreateSessionState, string> = {
    idle: "text-white/60",
    validating: "text-white/80",
    "awaiting-wallet": "text-white/80",
    submitted: "text-white/80",
    refreshed: "text-emerald-200",
    failed: "text-rose-200",
};

const statusLabels: Record<CreateSessionState, string> = {
    idle: "Idle",
    validating: "Validating",
    "awaiting-wallet": "Awaiting wallet confirmation",
    submitted: "Submitted",
    refreshed: "Refreshed",
    failed: "Failed",
};

function padDatePart(value: number) {
    return value.toString().padStart(2, "0");
}

function getDefaultExpiryInput() {
    const date = new Date(Date.now() + 60 * 60 * 1000);

    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
        date.getDate()
    )}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function getInitialFormValues(): CreateSessionFormValues {
    return {
        agent: "",
        expiry: getDefaultExpiryInput(),
        maxTotal: "",
        maxPerTx: "",
        allowedTarget: "",
    };
}

function validateCreateSessionForm(
    values: CreateSessionFormValues
): {
    errors: CreateSessionFieldErrors;
    prepared: PreparedCreateSessionRequest | null;
} {
    const errors: CreateSessionFieldErrors = {};
    let agent: Address | null = null;
    let allowedTarget: Address | null = null;
    let expirySeconds: bigint | null = null;
    let maxTotal: bigint | null = null;
    let maxPerTx: bigint | null = null;

    const agentValue = values.agent.trim();
    const allowedTargetValue = values.allowedTarget.trim();
    const maxTotalValue = values.maxTotal.trim();
    const maxPerTxValue = values.maxPerTx.trim();
    const expiryValue = values.expiry.trim();

    try {
        agent = Address.parse(agentValue);
    } catch {
        errors.agent = "Enter a valid TON address.";
    }

    try {
        allowedTarget = Address.parse(allowedTargetValue);
    } catch {
        errors.allowedTarget = "Enter a valid TON address.";
    }

    if (!expiryValue) {
        errors.expiry = "Choose an expiry time.";
    } else {
        const expiryDate = new Date(expiryValue);

        if (Number.isNaN(expiryDate.getTime())) {
            errors.expiry = "Enter a valid future expiry.";
        } else {
            expirySeconds = BigInt(Math.floor(expiryDate.getTime() / 1000));

            if (expirySeconds <= BigInt(Math.floor(Date.now() / 1000))) {
                errors.expiry = "Expiry must be in the future.";
            }
        }
    }

    try {
        maxTotal = toNano(maxTotalValue);

        if (maxTotal <= 0n) {
            errors.maxTotal = "Enter an amount greater than zero.";
        }
    } catch {
        errors.maxTotal = "Enter a valid TON amount.";
    }

    try {
        maxPerTx = toNano(maxPerTxValue);

        if (maxPerTx <= 0n) {
            errors.maxPerTx = "Enter an amount greater than zero.";
        }
    } catch {
        errors.maxPerTx = "Enter a valid TON amount.";
    }

    if (maxTotal && maxPerTx && maxPerTx > maxTotal) {
        errors.maxPerTx = "Max per tx cannot exceed max total.";
    }

    if (Object.keys(errors).length > 0) {
        return {
            errors,
            prepared: null,
        };
    }

    return {
        errors: {},
        prepared: {
            agent: agent!.toString(),
            expiry: expirySeconds!.toString(),
            maxTotal: maxTotal!.toString(),
            maxPerTx: maxPerTx!.toString(),
            allowedTarget: allowedTarget!.toString(),
        },
    };
}

function prepareCreateSessionPayload(input: PreparedCreateSessionRequest) {
    const body = beginCell()
        .store(
            storeCreateSession({
                $$type: "CreateSession",
                agent: Address.parse(input.agent),
                expiry: BigInt(input.expiry),
                maxTotal: BigInt(input.maxTotal),
                maxPerTx: BigInt(input.maxPerTx),
                allowedTarget: Address.parse(input.allowedTarget),
            })
        )
        .endCell()
        .toBoc()
        .toString("base64");

    return {
        amount: CREATE_SESSION_TRANSACTION_VALUE,
        body,
    };
}

function SessionField({
    id,
    label,
    placeholder,
    value,
    onChange,
    type = "text",
    inputMode,
    disabled,
    hint,
    error,
}: {
    id: string;
    label: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "datetime-local";
    inputMode?: "decimal" | "text";
    disabled: boolean;
    hint?: string;
    error?: string;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="text-xs uppercase tracking-wide text-white/40"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                inputMode={inputMode}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {error ? (
                <p className="mt-2 text-xs leading-5 text-rose-200">{error}</p>
            ) : hint ? (
                <p className="mt-2 text-xs leading-5 text-white/45">{hint}</p>
            ) : null}
        </div>
    );
}

export function CreateSessionCard({
    guardAddress,
    nextSessionId,
    availableBalance,
    isWalletConnected,
    isOwnerConnected,
    isGuardActive,
    onSubmittedRefresh,
}: CreateSessionCardProps) {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();

    const [formValues, setFormValues] = useState<CreateSessionFormValues>(
        getInitialFormValues
    );
    const [fieldErrors, setFieldErrors] = useState<CreateSessionFieldErrors>({});
    const [submissionState, setSubmissionState] =
        useState<CreateSessionState>("idle");
    const [statusText, setStatusText] = useState("");

    const isBusy =
        submissionState === "validating" ||
        submissionState === "awaiting-wallet" ||
        submissionState === "submitted";

    const canSubmit =
        isWalletConnected && isOwnerConnected && isGuardActive && !isBusy;

    const submitLabel =
        submissionState === "validating"
            ? "Validating..."
            : submissionState === "awaiting-wallet"
              ? "Awaiting wallet..."
              : submissionState === "submitted"
                ? "Refreshing..."
                : "Create Session";

    const eligibilityHint = !isWalletConnected
        ? "Connect the owner wallet to create sessions."
        : !isOwnerConnected
          ? "Only the wallet that resolves to this AgentGuard can create sessions."
          : !isGuardActive
            ? "This AgentGuard must be active before sessions can be created."
            : "Each session starts with one initial allowed target. Additional targets can be added only after the session exists.";

    const updateField = (field: CreateSessionField, value: string) => {
        if (
            (field === "maxTotal" || field === "maxPerTx") &&
            value &&
            !/^\d*(\.\d{0,9})?$/.test(value)
        ) {
            return;
        }

        if (!isBusy) {
            setSubmissionState("idle");
            setStatusText("");
            setFieldErrors({});
        }

        setFormValues((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!isWalletConnected) {
            setSubmissionState("failed");
            setStatusText("Connect the owner wallet first.");
            return;
        }

        if (!isOwnerConnected) {
            setSubmissionState("failed");
            setStatusText("Only the owner wallet can create a session on this guard.");
            return;
        }

        if (!isGuardActive) {
            setSubmissionState("failed");
            setStatusText("This AgentGuard is not active yet.");
            return;
        }

        setSubmissionState("validating");
        setStatusText("Checking session parameters...");

        const validation = validateCreateSessionForm(formValues);

        if (!validation.prepared) {
            setFieldErrors(validation.errors);
            setSubmissionState("failed");
            setStatusText("Fix the highlighted fields and try again.");
            return;
        }

        if (
            availableBalance &&
            BigInt(validation.prepared.maxTotal) > BigInt(availableBalance)
        ) {
            setFieldErrors({
                maxTotal: `Max total exceeds available guard balance (${formatTonValue(
                    availableBalance,
                    {
                        placeholder: "0 TON",
                        maximumFractionDigits: 4,
                    }
                )}).`,
            });
            setSubmissionState("failed");
            setStatusText(
                "Fund the guard or lower max total before creating this session."
            );
            return;
        }

        setFieldErrors({});
        const createdSessionId = nextSessionId;

        try {
            const preparedPayload = prepareCreateSessionPayload(validation.prepared);

            if (!preparedPayload.body) {
                throw new Error("CreateSession payload is empty");
            }

            setSubmissionState("awaiting-wallet");
            setStatusText("Confirm the CreateSession transaction in your wallet.");

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                network: wallet?.account.chain,
                messages: [
                    {
                        address: guardAddress,
                        amount: preparedPayload.amount,
                        payload: preparedPayload.body,
                    },
                ],
            });

            setSubmissionState("submitted");
            setStatusText(
                createdSessionId
                    ? `Session ${createdSessionId} submitted. Refreshing dashboard state...`
                    : "CreateSession submitted. Refreshing dashboard state..."
            );

            setFormValues(getInitialFormValues());

            try {
                const refreshed = await onSubmittedRefresh(nextSessionId);
                const nextIdChanged =
                    !!createdSessionId &&
                    !!refreshed?.nextSessionId &&
                    refreshed.nextSessionId !== createdSessionId;

                if (nextIdChanged) {
                    setSubmissionState("refreshed");
                    setStatusText(
                        `Session ${createdSessionId} submitted and the dashboard refreshed.`
                    );
                    return;
                }

                setSubmissionState("failed");
                setStatusText(
                    "The wallet signed the transaction, but no new session was detected onchain. Check guard balance and contract constraints, especially max total versus available balance."
                );
            } catch {
                setStatusText(
                    createdSessionId
                        ? `Session ${createdSessionId} submitted. Chain refresh may take a few seconds.`
                        : "Session submitted. Chain refresh may take a few seconds."
                );
            }
        } catch (error) {
            setSubmissionState("failed");
            setStatusText(
                getDisplayErrorMessage(
                    error,
                    "Failed to prepare or submit CreateSession"
                )
            );
        }
    };

    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
                Create Session
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
                Define the next operator session
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Assign an agent, set expiry and spend caps, and choose the one
                initial allowed target that starts the session.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SessionField
                    id="session-agent"
                    label="Agent address"
                    placeholder="EQ..."
                    value={formValues.agent}
                    onChange={(value) => updateField("agent", value)}
                    disabled={isBusy}
                    error={fieldErrors.agent}
                />
                <SessionField
                    id="session-expiry"
                    label="Expiry"
                    type="datetime-local"
                    value={formValues.expiry}
                    onChange={(value) => updateField("expiry", value)}
                    disabled={isBusy}
                    hint="Local time. The contract stores expiry as unix seconds."
                    error={fieldErrors.expiry}
                />
                <SessionField
                    id="session-max-total"
                    label="Max total (TON)"
                    placeholder="0.50"
                    value={formValues.maxTotal}
                    onChange={(value) => updateField("maxTotal", value)}
                    inputMode="decimal"
                    disabled={isBusy}
                    error={fieldErrors.maxTotal}
                />
                <SessionField
                    id="session-max-per-tx"
                    label="Max per tx (TON)"
                    placeholder="0.20"
                    value={formValues.maxPerTx}
                    onChange={(value) => updateField("maxPerTx", value)}
                    inputMode="decimal"
                    disabled={isBusy}
                    error={fieldErrors.maxPerTx}
                />
            </div>

            <div className="mt-4">
                <SessionField
                    id="session-allowed-target"
                    label="Initial allowed target"
                    placeholder="EQ..."
                    value={formValues.allowedTarget}
                    onChange={(value) => updateField("allowedTarget", value)}
                    disabled={isBusy}
                    hint="This is the only allowed target at creation time."
                    error={fieldErrors.allowedTarget}
                />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-white/40">
                            Transaction state
                        </p>
                        <p
                            className={`mt-2 text-sm ${statusToneClasses[submissionState]}`}
                        >
                            {statusLabels[submissionState]}
                        </p>
                    </div>

                    <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-white/40">
                            Available balance
                        </p>
                        <p className="mt-2 text-sm text-white">
                            {formatTonValue(availableBalance, {
                                placeholder: "Loading...",
                                maximumFractionDigits: 4,
                            })}
                        </p>
                    </div>
                </div>

                {statusText ? (
                    <p
                        className={`mt-4 text-sm leading-6 ${statusToneClasses[submissionState]}`}
                    >
                        {statusText}
                    </p>
                ) : null}
            </div>

            <p className="mt-3 text-xs leading-5 text-white/45">
                Next session id: {nextSessionId ?? "Loading..."}
            </p>
            <p className="mt-4 text-sm leading-6 text-white/50">{eligibilityHint}</p>

            <button
                type="button"
                onClick={() => {
                    void handleSubmit();
                }}
                disabled={!canSubmit}
                className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {submitLabel}
            </button>
        </section>
    );
}
