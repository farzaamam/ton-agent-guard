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
    neutral: "theme-status-neutral",
    pending: "theme-status-pending",
    success: "theme-status-success",
    error: "theme-status-error",
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
        <section className="theme-panel p-6">
            <p className="theme-kicker">Fund AgentGuard</p>
            <h2 className="mt-3 text-2xl font-semibold">
                Add TON to operating balance
            </h2>
            <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
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
                        className={`theme-pill-button px-3 py-1 text-sm ${
                            amount === preset ? "theme-pill-button-active" : ""
                        }`}
                    >
                        {preset} TON
                    </button>
                ))}
            </div>

            <div className="mt-6">
                <label htmlFor="guard-fund-amount" className="theme-label">
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
                    className="theme-input mt-2 text-sm"
                />
            </div>

            <div className="theme-subtle-panel mt-4 p-4">
                <p className="theme-label">Destination</p>
                <p className="theme-value mt-2 break-all text-sm">{address}</p>
            </div>

            <p className="theme-copy mt-4 text-sm leading-6">
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
                className="theme-primary-button mt-6 rounded-2xl px-5 py-3 text-sm"
            >
                {isSubmitting ? "Waiting for wallet..." : "Fund AgentGuard"}
            </button>
        </section>
    );
}
