# TON Agent Guard

On-chain session-based spending guard for AI agents on TON.

Enables constrained, revocable, and time-bound execution authority for autonomous agents while preserving full owner custody.

---

## Overview

`AgentGuard` is a smart contract that allows an owner to grant controlled execution power to an agent address through configurable “sessions”.

Each session defines strict on-chain policy rules such as:

- Expiry (time-bound authority)
- Per-transaction spending limit
- Total session spending limit
- Nonce-based replay protection
- Target allowlist (restricted contract interaction)

All policy enforcement happens fully on-chain.

The agent never receives custody of funds directly — all execution flows through the guard.

---

## Architecture

### AgentGuard

Core contract responsible for:

- Storing the owner
- Creating and revoking sessions
- Holding funds
- Enforcing session policy
- Forwarding validated internal messages to target contracts

### CounterReceiver

Minimal target contract used for development and testing.
Receives `Ping` messages and increments an internal counter.

---

## Execution Model

1. Owner deploys `AgentGuard`
2. Owner funds the guard contract
3. Owner creates a session for an agent address
4. Agent submits an `Execute` message
5. Guard validates:
   - Session exists
   - Not revoked
   - Not expired
   - Nonce matches
   - Spending limits respected
   - Target is allowed
6. Guard forwards the internal message with bounded TON value

This design follows TON’s actor-based message model and avoids direct fund delegation.

---

## Development

### Install
```bash
npm install