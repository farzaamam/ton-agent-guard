# AgentGuard Architecture

## Overview

AgentGuard is a TON-native session guard for autonomous agents.

It sits between an owner-authorized agent and target contracts, enforcing bounded execution policies on-chain before forwarding internal messages.

Core execution pattern:

**Agent → AgentGuard → Target**

---

## Roles

### Owner
The owner deploys and funds `AgentGuard`, creates sessions, revokes sessions, and can withdraw guard-held funds.

### Agent
The agent is the address authorized to execute through a specific session.

The agent does not receive unrestricted custody over funds. It can only act within the limits defined by its session.

### AgentGuard
The core guard contract.

It stores session state, validates execution requests, and forwards internal messages only when all session constraints pass.

### Target Contract
A contract fixed for a given session.

If the configured target or body policy does not match the session, execution is rejected.

---

## Session Model

Each session contains:

- authorized agent address
- fixed target contract
- allowed body opcode
- `policyMode`
- `bodyHash` for exact-body-hash sessions
- expiry timestamp
- max total spend
- max per-transaction spend
- spent total so far
- expected nonce
- revoked status

A session defines the execution envelope for an autonomous agent.

---

## Execution Flow

1. Owner deploys `AgentGuard`
2. Owner funds the contract
3. Owner creates a session for an agent
4. Agent submits an `Execute` request
5. AgentGuard validates:
   - session exists
   - sender matches session agent
   - session is not revoked
   - session is not expired
   - nonce matches expected value
   - value is within per-tx limit
   - cumulative spend remains within session max
   - forwarded target is fixed by the session
   - body opcode matches the session
   - if `policyMode = 1`, body hash matches the session `bodyHash`
6. If valid, AgentGuard forwards the internal message to the target contract

If validation fails, execution is rejected on-chain.

---

## On-Chain Enforcement

AgentGuard currently enforces:

- time-bound authority
- bounded total session spending
- bounded per-transaction spending
- replay protection via nonce
- fixed target constraints
- `policyMode`-based body constraints:
  - opcode-only
  - exact-body-hash
- owner-controlled session revocation

All enforcement happens on-chain inside the guard contract.

---

## Balance Protection Model

- session budgets are policy limits, not isolated per-session balances
- active sessions still contribute to a session-locked total used to protect shared liquidity
- `MIN_STORAGE_RESERVE` is a separate permanent floor for contract survival
- available balance excludes both the session-locked total and `MIN_STORAGE_RESERVE`
- outbound sends explicitly preserve both the session-locked total and `MIN_STORAGE_RESERVE`
- `getReservedTotal()` reports only the session-locked total

---

## Why This Fits TON

TON uses an actor-based architecture where contracts communicate through asynchronous internal messages.

AgentGuard fits this model naturally by acting as a policy-enforcing actor between an autonomous agent and a target contract.

Instead of handing wallet authority directly to an agent, execution is mediated through a constrained routing layer.

---

## Current Limitations

AgentGuard currently provides two body policy modes:

- opcode-only
- exact-body-hash

Opcode-only mode is broad if the target method accepts flexible arguments.

Exact-body-hash mode narrows this by allowing only one exact pre-approved payload, but it still does not provide general semantic policy enforcement.

Other important limitations:

- session budgets are policy limits, not isolated per-session balances
- multiple sessions may exist simultaneously without isolated liquidity
- accepted execution attempts consume session quota
- approval-based escalation is not yet implemented
- no arbitrary field-level predicates such as recipient allowlists or amount ranges

This makes the current design a session-scoped execution firewall rather than a full semantic policy engine.
