export function GuardActionsCard() {
    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">Actions</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Next operator steps</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                The first dashboard action is funding. Allowed targets and sessions are
                visible here so the product shape is already in place.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Allowed targets
                    </p>
                    <h3 className="mt-2 text-lg font-medium text-white">
                        Add Allowed Target
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                        Policy wiring is next. This will let you approve contracts an
                        active session may call.
                    </p>
                    <button
                        type="button"
                        disabled
                        className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45 disabled:cursor-not-allowed"
                    >
                        Coming soon
                    </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Sessions
                    </p>
                    <h3 className="mt-2 text-lg font-medium text-white">
                        Create Session
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                        Session creation will appear here with expiry, spend caps, and
                        revocation controls.
                    </p>
                    <button
                        type="button"
                        disabled
                        className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45 disabled:cursor-not-allowed"
                    >
                        Coming soon
                    </button>
                </div>
            </div>
        </section>
    );
}
