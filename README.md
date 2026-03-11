# TON AgentGuard

**On-chain session-based execution guard for AI agents on TON.**

AgentGuard is a TON-native guard contract that lets an owner delegate **bounded, revocable, and time-limited execution authority** to an autonomous agent, while keeping enforcement fully on-chain.

It is designed for TON’s actor-based architecture and acts as a policy-enforcing execution layer between agents and target contracts.

---

## TON AI Agent Fast Grants Winner

AgentGuard was selected as a winner in the **TON AI Agent Fast Grants** round.

The project explores safe on-chain infrastructure for:

- agentic wallets
- autonomous execution
- bounded delegation
- policy-enforced agent interactions on TON

---

## Status

Current stage: **tested v0 primitive**

AgentGuard currently implements session-based bounded execution with:

- spend caps
- expiry
- revocation
- nonce protection
- target allowlists

---

## Why AgentGuard Exists

As AI agents become able to interact with TON wallets and smart contracts, the default model becomes dangerous:

- too much authority
- no bounded delegation
- no native execution guardrails
- high risk from agent mistakes or prompt abuse

AgentGuard introduces a safer model.

Instead of giving an agent direct wallet control, the owner funds a guard contract and creates a session with explicit constraints. The agent can then execute only within those constraints.

This means:

- the owner defines the execution envelope
- the agent receives limited authority
- all enforcement happens on-chain
- sessions can be revoked at any time

AgentGuard is infrastructure for safer autonomous execution on TON.

---

## What AgentGuard Enforces Today

Each session currently supports:

- **expiry** — time-bound authority
- **max per transaction** — cap on a single forwarded execution
- **max total spend** — cap across the whole session
- **nonce-based replay protection** — ordered execution and replay prevention
- **target allowlist** — agent can execute only against approved contracts
- **revocation** — owner can disable a session at any time

All execution flows through the guard contract.

The agent never receives unrestricted custody over guard-controlled funds.

---

## How It Works

High-level flow:

1. Owner deploys `AgentGuard`
2. Owner funds the contract
3. Owner creates a session for a specific agent
4. Agent sends an `Execute` request
5. AgentGuard checks session constraints
6. If valid, AgentGuard forwards the internal message to the approved target

Validation includes:

- session exists
- sender matches authorized agent
- session is not revoked
- session is not expired
- nonce matches expected value
- per-transaction spend is within limit
- total session spend remains within limit
- target contract is allowlisted

If any check fails, execution is rejected on-chain.

---

## Why This Fits TON

TON uses an actor-based execution model:

- contracts are independent actors
- communication happens through asynchronous messages
- execution is driven by internal messages
- there is no shared mutable global state

AgentGuard is designed to fit that model directly.

Instead of delegating wallet control to an autonomous system, AgentGuard acts as a **policy-enforcing actor** that mediates message flow between an agent and a target contract.

Execution pattern:

**Agent → AgentGuard → Target**

This makes AgentGuard a natural TON-native primitive for bounded agent execution.

---

## Current Contract Surface

### `AgentGuard`

The core contract.

Responsibilities:

- stores contract owner
- creates and revokes sessions
- tracks session spending
- tracks expected nonce
- enforces execution constraints
- manages target allowlists
- forwards validated internal messages
- supports owner withdrawal of guard-held funds

### `CounterReceiver`

A minimal target contract used in tests and demo flows.

It accepts `Ping` messages and updates an internal counter, making it useful for proving that execution through AgentGuard succeeds or fails as expected.

---

## Current Security Model

AgentGuard currently provides:

- session-scoped delegated authority
- replay protection via nonce
- bounded spending
- bounded target access
- owner-controlled revocation
- on-chain enforcement of session constraints

The trust model is intentionally simple:

- funds are held by the AgentGuard contract
- the owner controls session creation and revocation
- the agent can act only inside an active session’s limits

---

## Important Current Semantics

A few implementation details matter:

- Session budgets are **policy limits**, not reserved balances
- Multiple sessions may exist at once, but funds are not isolated per session
- Spend accounting is based on accepted guarded execution attempts
- Current permissions are **target-level**, not yet method-level or payload-level

That means AgentGuard today is best understood as a **session-scoped execution firewall**, not yet a full semantic policy engine.

---

## Testing

The repository includes unit and integration tests covering:

- deployment
- session creation
- successful guarded execution
- replay rejection
- unauthorized sender rejection
- target allowlist enforcement
- expiry and revocation
- spending cap enforcement
- allowlist mutation
- owner-only withdrawal

Run tests with:

```bash
npx blueprint test
```

---

## Demo

The demo flow shows:

- deploying `AgentGuard`
- deploying `CounterReceiver`
- funding the guard
- creating a session
- executing through the guard
- validating successful forwarding

Run:

```bash
npx blueprint run demo
```

---

## Roadmap Direction

AgentGuard currently focuses on **bounded session-based execution**.

Natural future extensions include:

- approval-based execution escalation
- richer policy expressions
- method- or payload-level restrictions
- more expressive agent-to-agent routing
- tooling for safer TON-native agent infrastructure

---

## Summary

AgentGuard is a TON-native primitive for safer autonomous execution.

It gives owners a way to delegate limited, revocable, and time-bound authority to agents while keeping policy enforcement fully on-chain.

Today, it already provides a concrete and tested base for:

- agentic wallets
- bounded automation
- guarded contract execution
- safe autonomous systems on TON
