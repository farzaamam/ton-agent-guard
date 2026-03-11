# AgentGuard Architecture

## Overview

AgentGuard is a TON-native session guard for autonomous agents.

It sits between an owner-authorized agent and target contracts, enforcing bounded execution policies on-chain before forwarding internal messages.

Core execution pattern:

**Agent → AgentGuard → Target**

---

## Roles

### Owner
The owner deploys and funds `AgentGuard`, creates sessions, manages target allowlists, revokes sessions, and can withdraw guard-held funds.

### Agent
The agent is the address authorized to execute through a specific session.

The agent does not receive unrestricted custody over funds. It can only act within the limits defined by its session.

### AgentGuard
The core guard contract.

It stores session state, validates execution requests, and forwards internal messages only when all session constraints pass.

### Target Contract
A contract allowlisted for a given session.

If the target is not allowlisted, execution is rejected.

---

## Session Model

Each session contains:

- authorized agent address
- expiry timestamp
- max total spend
- max per-transaction spend
- spent total so far
- expected nonce
- revoked status
- allowlisted target set

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
   - target is allowlisted
6. If valid, AgentGuard forwards the internal message to the target contract

If validation fails, execution is rejected on-chain.

---

## On-Chain Enforcement

AgentGuard currently enforces:

- time-bound authority
- bounded total session spending
- bounded per-transaction spending
- replay protection via nonce
- target-level allowlist constraints
- owner-controlled session revocation

All enforcement happens on-chain inside the guard contract.

---

## Why This Fits TON

TON uses an actor-based architecture where contracts communicate through asynchronous internal messages.

AgentGuard fits this model naturally by acting as a policy-enforcing actor between an autonomous agent and a target contract.

Instead of handing wallet authority directly to an agent, execution is mediated through a constrained routing layer.

---

## Current Limitations

AgentGuard currently provides target-level execution constraints, not method-level or payload-level restrictions.

Other important limitations:

- session budgets are policy limits, not reserved balances
- multiple sessions may exist simultaneously without isolated liquidity
- accepted execution attempts consume session quota
- approval-based escalation is not yet implemented

This makes the current design a session-scoped execution firewall rather than a full semantic policy engine.