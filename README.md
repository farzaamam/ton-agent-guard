# TON Agent Guard

**Pure on-chain session-based execution guard for AI agents on TON.**

AgentGuard enables constrained, revocable, and time-bound execution authority for autonomous agents — while preserving full owner custody of funds.

---

## Why This Exists

AI agents can now operate natively on TON.

But giving an agent full wallet custody is dangerous.

**AgentGuard introduces programmable, on-chain execution policies:**

- The owner keeps custody
- The agent receives bounded authority
- All enforcement happens fully on-chain
- No off-chain signatures
- No trusted relayers

This is infrastructure for secure agent wallets.

---

## Core Features

Each session defines strict policy constraints:

- ⏳ Expiry (time-bound authority)
- 💰 Max per-transaction spending
- 💎 Max total session spending
- 🔁 Nonce-based replay protection
- 🎯 Target allowlist (restricted contract interaction)
- 🛑 Revocable at any time by owner

The agent never directly controls funds.

All execution flows through the guard contract.

---

## Contracts

### AgentGuard

Core policy enforcement contract.

Responsibilities:
- Stores owner
- Creates & revokes sessions
- Tracks spending + nonce
- Enforces policy rules
- Forwards validated internal messages

### CounterReceiver

Minimal contract used for testing.

Accepts `Ping` and increments a counter.  
Used to demonstrate constrained execution through AgentGuard.

---

## Execution Flow

1. Owner deploys `AgentGuard`
2. Owner funds the guard
3. Owner creates session for agent
4. Agent sends `Execute`
5. Guard validates:
   - Session exists
   - Not revoked
   - Not expired
   - Nonce matches
   - Spending limits respected
   - Target allowed
6. Guard forwards internal message

All policy enforcement happens inside the contract.

---

## TON MCP Compatibility

AgentGuard is designed to be compatible with TON MCP-powered agents.

When using TON MCP (Model Context Protocol), an AI agent can interact with the blockchain via wallet operations. Instead of granting the agent full wallet control, the owner can set AgentGuard as the execution layer. The agent submits transactions through MCP, but all execution is routed through AgentGuard, which enforces on-chain policy constraints before forwarding value or contract calls.

This enables:
- Agent wallets with bounded authority
- Safe DeFi interactions
- Controlled jetton transfers
- Secure NFT operations
- Revocable and time-limited agent autonomy

AgentGuard can act as the policy firewall for TON-native AI agents.

---

## Security Model

- Funds are held by AgentGuard
- Agent cannot bypass constraints
- Replay attacks prevented via nonce
- Target is restricted per session
- Owner can revoke anytime

This design leverages TON’s actor-based asynchronous model.

---

## Testing

Full integration tests included.

```bash
npx blueprint test