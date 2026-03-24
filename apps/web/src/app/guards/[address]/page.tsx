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
        <main className="app-shell">
            <div className="page-frame">
                <div className="page-nav">
                    <Link href="/create-guard" className="back-link text-sm">
                        ← Back
                    </Link>
                    <div className="page-badge">Guard Dashboard</div>
                </div>

                <section className="hero-panel p-8 sm:p-10">
                    <p className="theme-kicker">Guard</p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                        AgentGuard
                    </h1>
                    <p className="theme-copy mt-4 max-w-3xl text-base leading-8">
                        Review guard status, fund the guard, withdraw unlocked
                        balance, create sessions, and operate the deterministic
                        AgentGuard for the connected owner wallet.
                    </p>
                </section>

                <GuardDashboard address={parsedAddress} />
            </div>
        </main>
    );
}
