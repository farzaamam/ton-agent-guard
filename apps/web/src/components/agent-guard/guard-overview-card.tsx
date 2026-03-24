type GuardOverviewCardProps = {
    address: string;
    ownerLabel: string;
    ownerHint?: string;
    isDeployed: boolean;
    state: string;
    onchainBalance: string;
    canOpenWithdrawGuard: boolean;
    onOpenFundGuard: () => void;
    onOpenWithdrawGuard: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
};

function OverviewRow({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="theme-subtle-panel p-4">
            <p className="theme-label">{label}</p>
            <p className="theme-value mt-2 break-all text-sm">{value}</p>
            {hint ? <p className="theme-hint mt-2 text-xs leading-5">{hint}</p> : null}
        </div>
    );
}

export function GuardOverviewCard({
    address,
    ownerLabel,
    ownerHint,
    isDeployed,
    state,
    onchainBalance,
    canOpenWithdrawGuard,
    onOpenFundGuard,
    onOpenWithdrawGuard,
    onRefresh,
    isRefreshing,
}: GuardOverviewCardProps) {
    return (
        <section className="theme-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="theme-kicker">Overview</p>
                    <h2 className="mt-3 text-2xl font-semibold">Guard overview</h2>
                    <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                        This dashboard manages the deterministic AgentGuard for the
                        connected owner wallet.
                    </p>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onOpenWithdrawGuard}
                        disabled={!canOpenWithdrawGuard}
                        className="theme-secondary-button rounded-2xl px-5 py-3 text-sm"
                    >
                        Withdraw Guard
                    </button>

                    <button
                        type="button"
                        onClick={onOpenFundGuard}
                        disabled={!isDeployed}
                        className="theme-primary-button rounded-2xl px-5 py-3 text-sm"
                    >
                        Fund Guard
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <span
                    className={`theme-pill text-xs font-medium ${
                        isDeployed ? "theme-pill-active" : ""
                    }`}
                >
                    {isDeployed ? "Active" : "Not active"}
                </span>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="theme-pill-button px-3 py-1 text-xs"
                >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                <OverviewRow label="AgentGuard address" value={address} />
                <OverviewRow
                    label="Connected owner wallet"
                    value={ownerLabel}
                    hint={ownerHint}
                />
                <OverviewRow
                    label="Guard status"
                    value={isDeployed ? "Active onchain" : "AgentGuard not active"}
                    hint={`Latest contract state: ${state}`}
                />
                <OverviewRow
                    label="Guard balance"
                    value={onchainBalance}
                    hint="Current onchain balance fetched from the chain."
                />
            </div>
        </section>
    );
}
