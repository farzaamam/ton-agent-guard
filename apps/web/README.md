# AgentGuard Web App

Next.js dashboard for deploying, funding, and operating `AgentGuard` contracts.

The app is operator-facing:

- open or create the deterministic guard for a wallet
- inspect onchain guard status
- fund and withdraw guard balances
- create opcode-only or exact-body-hash sessions
- review and revoke recent sessions

## Local Setup

From the repository root:

```bash
npm install
cd apps/web
```

Set the environment variables you need in `apps/web/.env.local`.

Run the app:

```bash
npm run dev
```

The dashboard is available at [http://localhost:3000](http://localhost:3000).

## Environment

`apps/web/.env.local` currently uses these variables:

```bash
TONCENTER_API_KEY=
TONCENTER_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
```

Notes:

- `TONCENTER_API_KEY` is optional, but recommended. Without it, guard status reads are more likely to hit RPC rate limits.
- `TONCENTER_RPC_ENDPOINT` defaults to the testnet Toncenter JSON-RPC endpoint if omitted.
- These variables are used on the server side for dashboard reads in `src/lib/ton/get-ton-client.ts`.

## Useful Scripts

Run from `apps/web`:

```bash
npm run dev
npm run lint
npm run build
```

## Current UI Scope

The web app matches the current contract surface. Session creation supports:

- `policyMode = 0` for opcode-only sessions
- `policyMode = 1` for exact-body-hash sessions

The dashboard shows a bounded recent session window instead of reading every historical session on each refresh.

## Notes

- This is an operations UI, not a generic TON explorer.
- Session reads depend on RPC availability and may degrade under provider rate limiting.
- The default RPC endpoint is testnet-oriented. Point `TONCENTER_RPC_ENDPOINT` elsewhere if you are targeting a different network.
