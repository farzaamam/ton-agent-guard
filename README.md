# AgentGuard

**On-chain execution guard for TON agents.**

AgentGuard is a TON-native primitive for bounded delegation. It allows an owner to authorize a narrowly scoped execution session for an agent with fixed target, opcode, spend, expiry, nonce, and optional exact-body-hash controls.

Instead of giving an agent broad wallet authority, AgentGuard lets the owner define exactly what kind of on-chain action is allowed.

This repository includes:

- **Tact smart contracts** for the on-chain guard
- **TypeScript tests and scripts** for validation and demo flows
- **A minimal Next.js demo UI** for presenting the model more clearly

Together, these pieces make AgentGuard not just a contract experiment, but a more complete TON execution-guard prototype with both protocol and interface layers.

## Recognition

AgentGuard was selected as one of the winners of the **TON AI Agent Tooling Fast Grants**.

In the official winners announcement, AgentGuard was listed under **Infrastructure & Security** as:

> **AgentGuard by Farzam — on-chain wallet guardrails for agents (spend limits, sessions, whitelists)**

Official announcement: [TON AI Agent Tooling Fast Grants Winners](https://t.me/toncoin/2298)

## Why this matters

AI agents and automation systems should not receive unrestricted wallet authority.

AgentGuard introduces a safer execution model on TON by allowing owners to create tightly bounded sessions with constraints such as:

- fixed destination contract
- fixed opcode authorization
- per-transaction and total spend limits
- expiry
- nonce-based replay protection
- optional exact action authorization via body hash

This shifts control from **“the agent can use the wallet”** to **“the agent can perform only this bounded on-chain action.”**

## Tech stack

AgentGuard is built with a focused TON-native stack:

- **Tact** for smart contract development
- **TON Blueprint** for build, deployment, and scripting workflows
- **TypeScript** for tests, deployment scripts, and integration logic
- **Next.js** for the current demo UI
- **Jest / integration testing** for validating contract behavior and flows

This stack keeps the project close to production reality: contract logic, test coverage, scripting, documentation, and a presentable interface all live in the same repo.

## What the repository currently includes

The current repository includes:

- **AgentGuard contract** in Tact
- **CounterReceiver demo contract** as a minimal target for allowed / blocked execution flows
- **Automated tests** covering core contract behavior
- **Deployment and demo scripts** for local and testnet workflows
- **A minimal Next.js UI** to present the guard flow and make the project easier to understand visually
- **Architecture and threat model docs** to explain the design and security assumptions

The web UI is currently intended as a lightweight **demo surface**, not a full production application.

## Core model

AgentGuard is designed around **bounded execution sessions**.

A session can restrict execution through:

- a fixed **agent**
- a fixed **target** contract
- a fixed **allowed opcode**
- **policy mode** selection
- an optional **exact body hash**
- **expiry**
- **max total spend**
- **max per-transaction spend**
- **nonce-based replay protection**
- **owner revocation**

This creates a very explicit authorization model: an agent can only perform the narrowly approved action, within the approved limits.

## Policy modes

AgentGuard currently supports two policy styles:

### `policyMode = 0`
Opcode-level authorization.

This allows execution only when the outbound message matches the configured target and opcode.

### `policyMode = 1`
Opcode + exact body hash authorization.

This is the stricter mode. In addition to matching target and opcode, the message body must match the exact approved payload hash.

This turns broad method authorization into **deterministic action authorization**.

## Implemented today

Current AgentGuard capabilities include:

- bounded session creation
- fixed target authorization
- opcode-level execution restriction
- optional exact-body-hash enforcement
- total and per-transaction spend limits
- expiry enforcement
- nonce-based replay protection
- owner revocation
- reserved balance protection

## Demo UI

AgentGuard also includes a minimal **Next.js demo UI** in `apps/web`.

The UI is there to make the project easier to understand and present by showing the execution-guard concept in a more accessible form. It complements the contract and script-based flows by giving the repository a visible application layer.

The current UI is intended to support demos, walkthroughs, and visual presentation of the bounded session and execution model.

At this stage, the UI should be understood as a **demo and presentation layer** for the protocol primitive — not yet the final end-user product.

## Repository structure

```text
contracts/      Tact smart contracts for AgentGuard and demo receivers
tests/          Unit and integration tests
scripts/        Deployment and demo scripts
docs/           Architecture and threat model notes
apps/web/       Minimal Next.js demo UI
```

## Recommended demo story

The current repo is best presented through a simple end-to-end story:

1. The owner creates a bounded session for an agent.
2. The session is tied to a fixed target and allowed opcode.
3. In strict mode, the session can also pin an exact payload hash.
4. A matching execution is accepted.
5. A mismatched execution is blocked.
6. The owner can revoke the session at any time.

This demonstrates the core idea clearly: **restricted on-chain execution without broad wallet delegation**.

## Build, test, and run

### Install dependencies

```bash
npm install
```

### Build contracts

```bash
npx blueprint build
```

### Run tests

```bash
npm test
```

### Run the demo UI

```bash
cd apps/web
npm install
npm run dev
```

Then open the local Next.js app in your browser. The UI is currently intended as a minimal demo surface for presenting the AgentGuard flow.

## Security notes

AgentGuard is intended to reduce delegation risk, not eliminate all system risk.

Important semantics:

- authorization is bounded by session policy
- replay is limited via nonce progression
- session usage is bounded by spend controls and expiry
- accepted execution represents **approved dispatch**, not guaranteed downstream success

That distinction matters: once a valid execution is accepted and sent, downstream failure does not necessarily undo the session accounting decision.

For deeper design notes, refer to:

- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`

## Current project status

AgentGuard is currently best understood as a **clean v0.1 execution-guard primitive** with:

- a focused on-chain contract model
- test coverage
- demo tooling
- a minimal web UI for presentation

It is intentionally narrower than a full policy engine. That simplicity is part of the design.

## Vision

AgentGuard is aimed at a future where AI agents and automated operators can interact with TON under explicit, enforceable, on-chain limits.

The goal is not to trust agents with wallets.
The goal is to let them operate under **bounded authority**.
