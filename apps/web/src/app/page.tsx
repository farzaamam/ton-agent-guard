import Link from "next/link";

const landingHighlights = [
    {
        label: "Routing",
        title: "Fixed target contract",
        copy: "Every session forwards only to the contract you pin up front.",
        panelClass: "theme-subtle-panel",
    },
    {
        label: "Sessions",
        title: "Revocable bounded access",
        copy: "Set expiry, per-transaction caps, and total budget limits, then revoke anytime.",
        panelClass: "theme-panel",
    },
    {
        label: "Safety",
        title: "Strict deterministic mode",
        copy: "Run in opcode-only mode or require an exact body hash for pre-approved payload execution.",
        panelClass: "theme-accent-panel",
    },
] as const;

export default function Home() {
    return (
        <main className="app-shell">
            <section className="page-frame justify-center">
                <div className="hero-panel mx-auto mt-6 w-full max-w-6xl p-8 text-left sm:mt-8 sm:p-10 lg:p-12">
                    <div className="page-badge w-fit">
                        AGENTGUARD V0.1 · TON EXECUTION GUARD
                    </div>
                    <p className="theme-kicker mt-8">ON-CHAIN EXECUTION GUARD</p>
                    <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-tight sm:text-7xl">
                        Bounded delegation for TON agents
                    </h1>

                    <p className="theme-copy mt-6 max-w-3xl text-base leading-8 sm:text-lg">
                        AgentGuard lets owners create bounded on-chain execution
                        sessions with fixed target, opcode, spend, expiry,
                        nonce, and optional exact-body-hash authorization.
                    </p>

                    <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                        <a
                            href="https://github.com/farzaamam/ton-agent-guard#readme"
                            target="_blank"
                            rel="noreferrer"
                            className="theme-secondary-button rounded-2xl px-6 py-3 text-sm"
                        >
                            View Docs
                        </a>

                        <Link
                            href="/create-guard"
                            className="theme-primary-button rounded-2xl px-6 py-3 text-sm"
                        >
                            Create Guard
                        </Link>
                    </div>

                    <p className="theme-copy mt-6 max-w-3xl text-sm leading-7 sm:text-base">
                        Execution firewall by default. Deterministic action
                        authorization in strict mode.
                    </p>
                </div>

                <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
                    {landingHighlights.map((item) => (
                        <div
                            key={item.label}
                            className={`${item.panelClass} flex min-h-56 flex-col p-5 text-left`}
                        >
                            <p className="theme-label">{item.label}</p>
                            <h2 className="mt-3 text-xl font-semibold">
                                {item.title}
                            </h2>
                            <p className="theme-copy mt-3 text-sm leading-6">
                                {item.copy}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
