import Link from "next/link";
import { CreateGuardCard } from "@/components/agent-guard/create-guard-card";

export default function CreateGuardPage() {
    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
                <div className="mb-10 flex items-center justify-between">
                    <Link href="/" className="text-sm text-white/60 hover:text-white">
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
                        Connect a TON wallet and deploy a guard with that wallet as owner.
                    </p>
                </div>

                <CreateGuardCard />
            </div>
        </main>
    );
}