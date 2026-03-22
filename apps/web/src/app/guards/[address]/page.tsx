import Link from "next/link";
import { notFound } from "next/navigation";
import { Address } from "@ton/core";
import { GuardDashboard } from "@/components/agent-guard/guard-dashboard";

export default async function GuardPage({
    params,
}: {
    params: Promise<{ address: string }>;
}) {
    const { address } = await params;

    let parsedAddress: string;

    try {
        parsedAddress = Address.parse(address).toString();
    } catch {
        notFound();
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
                <div className="mb-10 flex items-center justify-between gap-4">
                    <Link
                        href="/create-guard"
                        className="text-sm text-white/60 transition hover:text-white"
                    >
                        ← Back
                    </Link>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Guard Dashboard
                    </div>
                </div>

                <div className="mb-8">
                    <p className="mb-3 text-sm uppercase tracking-[0.2em] text-white/40">
                        Guard
                    </p>
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                        AgentGuard
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                        Review guard status, fund the guard, and operate the
                        deterministic AgentGuard for the connected owner wallet.
                    </p>
                </div>

                <GuardDashboard address={parsedAddress} />
            </div>
        </main>
    );
}
