# TON AgentGuard

**On-chain execution guard for TON agents.**

AgentGuard is an on-chain execution guard for TON agents. It gives an owner bounded delegation through fixed target, opcode, spend, expiry, and nonce controls, with revocable enforcement fully on-chain. In strict mode (`policyMode = 1`), exact-body-hash enforcement enables **deterministic action authorization** for one exact pre-approved payload.

In `opcode-only` mode, AgentGuard is best understood as an on-chain **execution firewall**. In `exact-body-hash` mode, it narrows that authorization to one exact message body via `bodyHash` matching.

## What It Does

- The owner deploys and funds an `AgentGuard` contract.
- The owner creates a bounded session for one agent with fixed target routing, opcode permissioning, spend limits, expiry, and nonce progression.
- The agent can execute only inside that on-chain session envelope.
- The owner can revoke the session at any time.
- Strict mode can pin an exact `bodyHash`, so only the exact pre-approved payload is accepted.

All execution flows through the guard contract. The agent never receives ambient wallet authority over guard-controlled funds.

## Why This Matters

Agents should not receive ambient wallet authority.

Delegation should be bounded, revocable, and enforced on-chain.

`opcode-only` mode provides a practical execution firewall for one target and one method family. `exact-body-hash` mode narrows that broad method authorization into deterministic action authorization for one exact pre-approved action.

## Status

Current stage: **tested v0.1 primitive**

AgentGuard currently implements:

- bounded session-based execution
- spend caps
- expiry
- revocation
- nonce protection
- fixed target routing
- `policyMode`-based body checks:
  - `opcode-only`
  - `exact-body-hash`

## Build, Test, and Demo

From the repository root:

```bash
npm install
npm run build
npm test
npx blueprint run demo
```

`npm run build` uses the repo's root Blueprint build script. If you want a contract-specific compile command, `npx blueprint build AgentGuard` remains available.

## Recommended Demo Flow

Use this flow for a concise demo:

- deploy and fund the guard
- create an `opcode-only` session
- execute an allowed call
- create a strict `exact-body-hash` session
- execute the matching payload
- try the same opcode with a different payload
- observe the strict rejection

The demo output is phase-based so it can be followed live from the console.

## Session Policy Modes

AgentGuard supports two `policyMode` values:

- `policyMode = 0` — **opcode-only**
  - pins `agent`, `target`, `allowedOp`, spend limits, expiry, and nonce
  - accepts any body whose first 32 bits match the configured opcode

- `policyMode = 1` — **exact-body-hash**
  - pins the same session envelope plus an exact `bodyHash`
  - accepts only a body whose opcode matches and whose full hash matches the stored `bodyHash`

Strict mode is not "body hash instead of opcode". It is **opcode + exact payload**.

That is the core distinction:

- `opcode-only` is an **execution firewall**
- `exact-body-hash` enables **deterministic action authorization**

## Current Boundary

AgentGuard does **not** currently provide:

- generic semantic parsing
- arbitrary field-level predicates
- amount ranges
- recipient allowlists
- general policy DSL behavior

AgentGuard **does** currently provide:

- bounded delegation through fixed target, opcode, spend, expiry, and nonce controls
- exact payload authorization in strict mode through exact `bodyHash` matching

Strict mode materially narrows broad method authorization, but AgentGuard should still be described as bounded execution infrastructure rather than a general semantic policy engine.

## How It Works

High-level flow:

1. Owner deploys `AgentGuard`.
2. Owner funds the contract.
3. Owner creates a session for a specific agent.
4. Agent sends an `Execute` request.
5. AgentGuard validates the session envelope.
6. If valid, AgentGuard forwards the internal message to the configured target.

Validation includes:

- session exists
- sender matches the authorized agent
- session is not revoked
- session is not expired
- nonce matches the expected value
- per-transaction spend is within limit
- total session spend remains within limit
- forwarded target is fixed by the session
- message body opcode matches the session
- if `policyMode = 1`, message `bodyHash` matches the stored `bodyHash`

If any check fails, execution is rejected on-chain.

## Current Security Model

AgentGuard currently provides:

- session-scoped delegated authority
- replay protection via nonce
- bounded spending
- bounded target access
- bounded message action via `opcode-only` or `exact-body-hash` policy
- owner-controlled revocation
- on-chain enforcement of session constraints

The trust model is intentionally simple:

- funds are held by the `AgentGuard` contract
- the owner controls session creation and revocation
- the agent can act only inside an active session's limits

## Important Current Semantics

A few implementation details matter:

- session budgets are policy limits, not isolated per-session balances
- `getReservedTotal()` reports the current session-locked total only
- `MIN_STORAGE_RESERVE` is a separate permanent floor for contract survival
- `getAvailableBalance()` excludes both session-locked funds and `MIN_STORAGE_RESERVE`
- outbound sends preserve both the session-locked total and `MIN_STORAGE_RESERVE`
- multiple sessions may exist at once, but funds are not isolated per session
- spend accounting is based on accepted guarded execution attempts
- `policyMode = 0` is target + opcode permissioning
- `policyMode = 1` is target + opcode + exact `bodyHash` permissioning

`opcode-only` mode is intentionally broad if the target method accepts flexible arguments. Strict `exact-body-hash` mode narrows this materially by pinning one exact payload.

## Why This Fits TON

TON uses an actor-based execution model:

- contracts are independent actors
- communication happens through asynchronous messages
- execution is driven by internal messages
- there is no shared mutable global state

AgentGuard is designed to fit that model directly.

Instead of delegating wallet control to an autonomous system, AgentGuard acts as a policy-enforcing actor between an agent and a target contract:

**Agent → AgentGuard → Target**

That makes it a TON-native primitive for bounded autonomous execution.

## Current Contract Surface

### `AgentGuard`

The core contract.

Responsibilities:

- stores contract owner
- creates and revokes sessions
- tracks session spending
- tracks expected nonce
- enforces execution constraints
- pins each session to one target contract, one allowed opcode, and a `policyMode`
- optionally pins each `exact-body-hash` session to one exact `bodyHash`
- forwards validated internal messages
- supports owner withdrawal of guard-held funds

### `CounterReceiver`

A minimal target contract used in tests and demo flows.

It accepts `Ping` messages and updates an internal counter, which makes it useful for proving that execution through `AgentGuard` succeeds or fails as expected.

## Testing

The repository includes unit and integration tests covering:

- deployment
- session creation
- successful guarded execution
- opcode mismatch rejection
- exact-body-hash success and mismatch paths
- replay rejection
- unauthorized sender rejection
- target and opcode enforcement
- expiry and revocation
- spending cap enforcement
- owner-only withdrawal

Run the test suite with:

```bash
npm test
```

## TON AI Agent Fast Grants Winner

AgentGuard was selected as a winner in the **TON AI Agent Fast Grants** round.

The project explores safe on-chain infrastructure for:

- agentic wallets
- autonomous execution
- bounded delegation
- policy-enforced agent interactions on TON

## Roadmap Direction

AgentGuard currently focuses on bounded session-based execution.

Natural future extensions include:

- approval-based execution escalation
- richer semantic policy expressions
- argument-level restrictions beyond exact payload hashes
- more expressive agent-to-agent routing
- tooling for safer TON-native agent infrastructure

## Summary

AgentGuard gives owners a way to delegate bounded, revocable, time-limited execution authority to TON agents while keeping enforcement fully on-chain.

Today, that means:

- **execution firewall** behavior in `opcode-only` mode
- **deterministic action authorization** in strict `exact-body-hash` mode
