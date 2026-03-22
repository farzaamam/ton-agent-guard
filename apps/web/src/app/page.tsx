import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur">
          AgentGuard v1 · TON execution guard
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Bounded execution
          <span className="block bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            for TON agents
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
          AgentGuard lets you create revocable, time-limited sessions for AI agents
          with spend caps, expiry, nonce protection, and approved targets.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/create-guard"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:scale-[1.02] hover:bg-white/90"
          >
            Create Guard
          </Link>

          <a
            href="https://github.com"
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            View Docs
          </a>
        </div>

        <div className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm text-white/50">Sessions</p>
            <h2 className="mt-2 text-xl font-medium">Delegated access</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Create agent sessions with expiry, per-tx caps, and total budget
              limits.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm text-white/50">Policy</p>
            <h2 className="mt-2 text-xl font-medium">Approved targets only</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Restrict execution to explicitly allowlisted contracts for safer
              automation.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm text-white/50">Control</p>
            <h2 className="mt-2 text-xl font-medium">Revoke anytime</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Kill sessions instantly and keep owner control over the funded guard.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}