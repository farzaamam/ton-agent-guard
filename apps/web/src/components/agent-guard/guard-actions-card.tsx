export function GuardActionsCard() {
    return (
        <section className="theme-panel p-6">
            <p className="theme-kicker">Actions</p>
            <h2 className="mt-3 text-2xl font-semibold">Next operator steps</h2>
            <p className="theme-copy mt-3 max-w-2xl text-sm leading-6">
                The first dashboard action is funding. Allowed targets and sessions are
                visible here so the product shape is already in place.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="theme-subtle-panel p-4">
                    <p className="theme-label">Allowed targets</p>
                    <h3 className="mt-2 text-lg font-medium">Add Allowed Target</h3>
                    <p className="theme-copy mt-2 text-sm leading-6">
                        Policy wiring is next. This will let you approve contracts an
                        active session may call.
                    </p>
                    <button
                        type="button"
                        disabled
                        className="theme-secondary-button mt-4 rounded-2xl px-4 py-2 text-sm"
                    >
                        Coming soon
                    </button>
                </div>

                <div className="theme-subtle-panel p-4">
                    <p className="theme-label">Sessions</p>
                    <h3 className="mt-2 text-lg font-medium">Create Session</h3>
                    <p className="theme-copy mt-2 text-sm leading-6">
                        Session creation will appear here with expiry, spend caps, and
                        revocation controls.
                    </p>
                    <button
                        type="button"
                        disabled
                        className="theme-secondary-button mt-4 rounded-2xl px-4 py-2 text-sm"
                    >
                        Coming soon
                    </button>
                </div>
            </div>
        </section>
    );
}
