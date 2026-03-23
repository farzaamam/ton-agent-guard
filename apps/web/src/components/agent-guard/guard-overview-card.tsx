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
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
            <p className="mt-2 break-all text-sm text-white">{value}</p>
            {hint ? <p className="mt-2 text-xs leading-5 text-white/50">{hint}</p> : null}
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
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-white/40">
                        Overview
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                        Guard overview
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                        This dashboard manages the deterministic AgentGuard for the
                        connected owner wallet.
                    </p>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onOpenWithdrawGuard}
                        disabled={!canOpenWithdrawGuard}
                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Withdraw Guard
                    </button>

                    <button
                        type="button"
                        onClick={onOpenFundGuard}
                        disabled={!isDeployed}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Fund Guard
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isDeployed
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/60"
                    }`}
                >
                    {isDeployed ? "Active" : "Not active"}
                </span>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
