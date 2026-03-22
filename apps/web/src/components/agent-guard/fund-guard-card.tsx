type FundGuardCardProps = {
    address: string;
    amount: string;
    presets: string[];
    isWalletConnected: boolean;
    isSubmitting: boolean;
    canSubmit: boolean;
    statusText: string;
    statusTone: "neutral" | "pending" | "success" | "error";
    onAmountChange: (value: string) => void;
    onPresetSelect: (value: string) => void;
    onSubmit: () => void;
};

const statusToneClasses: Record<FundGuardCardProps["statusTone"], string> = {
    neutral: "text-white/60",
    pending: "text-white/80",
    success: "text-emerald-200",
    error: "text-rose-200",
};

export function FundGuardCard({
    address,
    amount,
    presets,
    isWalletConnected,
    isSubmitting,
    canSubmit,
    statusText,
    statusTone,
    onAmountChange,
    onPresetSelect,
    onSubmit,
}: FundGuardCardProps) {
    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
                Fund AgentGuard
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
                Add TON to operating balance
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Send TON from the connected wallet directly to this deployed
                guard.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => onPresetSelect(preset)}
                        disabled={isSubmitting}
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                            amount === preset
                                ? "border-white bg-white text-black"
                                : "border-white/10 bg-black/30 text-white/70 hover:bg-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {preset} TON
                    </button>
                ))}
            </div>

            <div className="mt-6">
                <label
                    htmlFor="guard-fund-amount"
                    className="text-xs uppercase tracking-wide text-white/40"
                >
                    Amount (TON)
                </label>
                <input
                    id="guard-fund-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.05"
                    value={amount}
                    onChange={(event) => onAmountChange(event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                    Destination
                </p>
                <p className="mt-2 break-all text-sm text-white">{address}</p>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/50">
                {isWalletConnected
                    ? "Funding uses TonConnect and waits for the current wallet to confirm the transfer."
                    : "Connect a wallet to fund this AgentGuard."}
            </p>

            {statusText ? (
                <p className={`mt-4 text-sm ${statusToneClasses[statusTone]}`}>
                    {statusText}
                </p>
            ) : null}

            <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isSubmitting ? "Waiting for wallet..." : "Fund AgentGuard"}
            </button>
        </section>
    );
}
