import Link from "next/link";

export default function CreateGuardPage() {
    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
                <div className="mb-10 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-sm text-white/60 transition hover:text-white"
                    >
                        ← Back
                    </Link>

                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Guard Setup
                    </div>
                </div>

                <div className="mb-8">
                    <p className="mb-3 text-sm uppercase tracking-[0.2em] text-white/40">
                        Create Guard
                    </p>
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                        Deploy a new AgentGuard
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                        Start with a minimal operator flow. Connect a wallet later, then use
                        this screen to initialize and fund a new guard contract.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
                    <form className="space-y-6">
                        <div>
                            <label
                                htmlFor="ownerAddress"
                                className="mb-2 block text-sm font-medium text-white/80"
                            >
                                Owner address
                            </label>
                            <input
                                id="ownerAddress"
                                name="ownerAddress"
                                type="text"
                                placeholder="EQ..."
                                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-white/25"
                            />
                            <p className="mt-2 text-xs text-white/40">
                                This wallet will control guard configuration, revocation, and withdrawals.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="initialFunding"
                                className="mb-2 block text-sm font-medium text-white/80"
                            >
                                Initial funding
                            </label>
                            <input
                                id="initialFunding"
                                name="initialFunding"
                                type="text"
                                placeholder="10 TON"
                                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-white/25"
                            />
                            <p className="mt-2 text-xs text-white/40">
                                Optional for now. Later this will map to the deployment + funding flow.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="label"
                                className="mb-2 block text-sm font-medium text-white/80"
                            >
                                Guard label
                            </label>
                            <input
                                id="label"
                                name="label"
                                type="text"
                                placeholder="Treasury Agent Guard"
                                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-white/25"
                            />
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-sm font-medium text-white/85">What this creates</p>
                            <ul className="mt-3 space-y-2 text-sm text-white/55">
                                <li>• Owner-controlled guard contract</li>
                                <li>• Contract-funded execution wallet</li>
                                <li>• Ready for approved targets and agent sessions</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                            <button
                                type="button"
                                className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:scale-[1.01] hover:bg-white/90"
                            >
                                Create Guard
                            </button>

                            <Link
                                href="/"
                                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white/80 transition hover:bg-white/10"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}