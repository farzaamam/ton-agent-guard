import Link from "next/link";

export default function Home() {
    return (
        <main className="app-shell">
            <section className="page-frame justify-center">
                <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <div className="hero-panel p-8 text-left sm:p-10 lg:p-12">
                        <div className="page-badge w-fit">
                            AgentGuard v0.1 · TON execution guard
                        </div>
                        <p className="theme-kicker mt-8">On-chain execution guard</p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
                            Bounded delegation
                            <span className="block text-[var(--accent-strong)]">
                                for TON agents
                            </span>
                        </h1>

                        <p className="theme-copy mt-6 max-w-2xl text-base leading-8 sm:text-lg">
                            AgentGuard provides bounded delegation through fixed
                            target, opcode, spend, expiry, and nonce controls.
                            Strict exact-body-hash enforcement turns broad method
                            authorization into deterministic action authorization.
                        </p>

                        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                            <Link
                                href="/create-guard"
                                className="theme-primary-button rounded-2xl px-6 py-3 text-sm"
                            >
                                Create Guard
                            </Link>

                            <a
                                href="https://github.com/farzaamam/ton-agent-guard#readme"
                                target="_blank"
                                rel="noreferrer"
                                className="theme-secondary-button rounded-2xl px-6 py-3 text-sm"
                            >
                                View Docs
                            </a>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="theme-accent-panel p-6">
                            <p className="theme-label">Execution envelope</p>
                            <h2 className="mt-4 text-3xl font-semibold">
                                One guard, revocable sessions, capped spend.
                            </h2>
                            <p className="theme-copy mt-3 text-sm leading-6">
                                The owner defines explicit on-chain boundaries
                                instead of handing an agent ambient wallet
                                authority. AgentGuard acts as an execution
                                firewall by default and enables deterministic
                                action authorization in strict mode.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="theme-subtle-panel p-5">
                                <p className="theme-label">Routing</p>
                                <p className="mt-3 text-lg font-semibold">
                                    Fixed target contract
                                </p>
                                <p className="theme-copy mt-2 text-sm leading-6">
                                    Every session forwards only to the contract you
                                    pin up front.
                                </p>
                            </div>

                            <div className="theme-subtle-panel p-5">
                                <p className="theme-label">Safety</p>
                                <p className="mt-3 text-lg font-semibold">
                                    Two policy modes
                                </p>
                                <p className="theme-copy mt-2 text-sm leading-6">
                                    Run sessions in opcode-only mode or pin an
                                    exact bodyHash. Strict exact-body-hash mode
                                    still keeps opcode validation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="theme-panel p-6 text-left">
                        <p className="theme-label">Sessions</p>
                        <h2 className="mt-3 text-2xl font-semibold">
                            Delegated access
                        </h2>
                        <p className="theme-copy mt-3 text-sm leading-6">
                            Create agent sessions with expiry, per-tx caps, and total
                            budget limits.
                        </p>
                    </div>

                    <div className="theme-panel p-6 text-left">
                        <p className="theme-label">Policy</p>
                        <h2 className="mt-3 text-2xl font-semibold">
                            Deterministic action authorization
                        </h2>
                        <p className="theme-copy mt-3 text-sm leading-6">
                            Pin each session to one destination contract, one
                            opcode, and optionally one exact bodyHash for
                            pre-approved payload execution.
                        </p>
                    </div>

                    <div className="theme-panel p-6 text-left">
                        <p className="theme-label">Control</p>
                        <h2 className="mt-3 text-2xl font-semibold">
                            Revoke anytime
                        </h2>
                        <p className="theme-copy mt-3 text-sm leading-6">
                            Kill sessions instantly and keep owner control over the
                            funded guard.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
