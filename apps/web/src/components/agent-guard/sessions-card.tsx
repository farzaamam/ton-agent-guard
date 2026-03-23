type SessionsCardProps = {
    nextSessionId: string | null;
    onOpenCreateSession: () => void;
};

function SummaryItem({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
            <p className="mt-2 text-lg font-medium text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">{hint}</p>
        </div>
    );
}

function getSessionInventory(nextSessionId: string | null) {
    if (!nextSessionId) {
        return null;
    }

    try {
        const parsedNextSessionId = BigInt(nextSessionId);
        const createdSessionCount =
            parsedNextSessionId > 0n ? parsedNextSessionId - 1n : 0n;

        return {
            nextSessionId: parsedNextSessionId,
            createdSessionCount,
        };
    } catch {
        return null;
    }
}

export function SessionsCard({
    nextSessionId,
    onOpenCreateSession,
}: SessionsCardProps) {
    const inventory = getSessionInventory(nextSessionId);

    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-white/40">
                        Sessions
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                        Starter session inventory
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                        This section is ready for per-session reads next. Each
                        session starts with one initial allowed target, and
                        additional target management can layer onto this structure
                        later.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onOpenCreateSession}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                    Create Session
                </button>
            </div>

            {!inventory ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm text-white">
                        Session ids are not available yet.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                        The dashboard can still create sessions now. Once the getter
                        read resolves, this area will surface inferred session ids and
                        expand into a fuller per-session view.
                    </p>
                </div>
            ) : inventory.createdSessionCount === 0n ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm text-white">No sessions created yet.</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                        The first successful create action will use session id 1 and
                        begin with the initial allowed target from the create-session
                        modal.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-6 grid gap-3 lg:grid-cols-3">
                        <SummaryItem
                            label="Created session ids"
                            value={inventory.createdSessionCount.toString()}
                            hint="Inferred from the onchain next-session counter."
                        />
                        <SummaryItem
                            label="First session id"
                            value="1"
                            hint="The first created session is always assigned id 1."
                        />
                        <SummaryItem
                            label="Next session id"
                            value={inventory.nextSessionId.toString()}
                            hint="The next CreateSession call will allocate this id."
                        />
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-white/40">
                                    Session 1
                                </p>
                                <h3 className="mt-2 text-lg font-medium text-white">
                                    Detected onchain
                                </h3>
                            </div>

                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                                Starter read
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-white/55">
                            This placeholder confirms the session path is live without
                            overcommitting to a full chain enumeration pass yet.
                            Detailed session reads, target controls, and execute tooling
                            can attach here next.
                        </p>

                        {inventory.createdSessionCount > 1n ? (
                            <p className="mt-3 text-xs leading-5 text-white/45">
                                {inventory.createdSessionCount - 1n} additional session
                                id
                                {inventory.createdSessionCount - 1n === 1n ? "" : "s"}{" "}
                                exist after session 1.
                            </p>
                        ) : null}
                    </div>
                </>
            )}
        </section>
    );
}
