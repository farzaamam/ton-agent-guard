import Link from "next/link";
import { CreateGuardCard } from "@/components/agent-guard/create-guard-card";

export default function CreateGuardPage() {
    return (
        <main className="app-shell">
            <div className="page-frame page-frame--narrow">
                <div className="page-nav">
                    <Link href="/" className="back-link text-sm">
                        ← Back
                    </Link>
                    <div className="page-badge">Guard Setup</div>
                </div>

                <section className="hero-panel p-8 sm:p-10">
                    <p className="theme-kicker">Create Guard</p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Deploy a new AgentGuard
                    </h1>
                    <p className="theme-copy mt-4 max-w-2xl text-base leading-8">
                        Connect a TON wallet and deploy a guard with that wallet as
                        owner.
                    </p>
                </section>

                <CreateGuardCard />
            </div>
        </main>
    );
}
