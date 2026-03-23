import { formatTonValue } from "@/components/agent-guard/guard-utils";
import type { GuardSessionSummary } from "@/lib/agent-guard/guard-status";

type SessionsCardProps = {
    nextSessionId: string | null;
    sessions: GuardSessionSummary[];
    onOpenCreateSession: () => void;
};

function getCreatedSessionCount(nextSessionId: string | null) {
    if (!nextSessionId) {
        return null;
    }

    try {
        const parsedNextSessionId = BigInt(nextSessionId);

        return parsedNextSessionId > 0n ? parsedNextSessionId - 1n : 0n;
    } catch {
        return null;
    }
}

function formatShortAddress(address: string) {
    return address.length > 12
        ? `${address.slice(0, 6)}...${address.slice(-6)}`
        : address;
}

function formatExpiry(expiry: string) {
    try {
        const date = new Date(Number(BigInt(expiry)) * 1000);

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "Unavailable";
    }
}

function getSessionStatus(session: GuardSessionSummary) {
    if (session.revoked) {
        return "Revoked";
    }

    try {
        if (BigInt(session.expiry) <= BigInt(Math.floor(Date.now() / 1000))) {
            return "Expired";
        }

        if (BigInt(session.lockedAmount) === 0n) {
            return "Spent";
        }
    } catch {
        return "Unknown";
    }

    return "Active";
}

function SessionRow({ session }: { session: GuardSessionSummary }) {
    const status = getSessionStatus(session);

    return (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto]">
                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Session
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                        #{session.id}
                    </p>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Agent
                    </p>
                    <p className="mt-2 break-all text-sm text-white" title={session.agent}>
                        {formatShortAddress(session.agent)}
                    </p>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Expiry
                    </p>
                    <p className="mt-2 text-sm text-white">
                        {formatExpiry(session.expiry)}
                    </p>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Max total
                    </p>
                    <p className="mt-2 text-sm text-white">
                        {formatTonValue(session.maxTotal, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Max per tx
                    </p>
                    <p className="mt-2 text-sm text-white">
                        {formatTonValue(session.maxPerTx, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Usage
                    </p>
                    <p className="mt-2 text-sm text-white">
                        Spent{" "}
                        {formatTonValue(session.spentTotal, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                        Locked{" "}
                        {formatTonValue(session.lockedAmount, {
                            placeholder: "Unavailable",
                            maximumFractionDigits: 4,
                        })}
                        {" · "}Nonce {session.nonceExpected}
                    </p>
                </div>

                <div className="md:text-right">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                        Status
                    </p>
                    <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${
                            status === "Active"
                                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                                : status === "Revoked"
                                  ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
                                  : "border-white/10 bg-white/5 text-white/70"
                        }`}
                    >
                        {status}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function SessionsCard({
    nextSessionId,
    sessions,
    onOpenCreateSession,
}: SessionsCardProps) {
    const createdSessionCount = getCreatedSessionCount(nextSessionId);

    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-white/40">
                        Sessions
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                        Session management
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                        Review each session row, its budget, expiry, current usage,
                        and lifecycle state. Each session starts with one initial
                        allowed target.
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

            {createdSessionCount === null ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm text-white">Session reads are unavailable.</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                        The guard is still operational, but the session counter could
                        not be resolved from chain right now.
                    </p>
                </div>
            ) : createdSessionCount === 0n ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm text-white">No sessions created yet.</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                        Create the first session to start managing agent budgets and
                        expiry windows from this dashboard.
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-white/45">
                        Showing {sessions.length} of {createdSessionCount.toString()} session
                        {createdSessionCount === 1n ? "" : "s"}
                    </div>

                    {sessions.map((session) => (
                        <SessionRow key={session.id} session={session} />
                    ))}
                </div>
            )}
        </section>
    );
}
