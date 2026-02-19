# TON Agent Guard

**On-chain session-based execution guard for AI agents on TON.**

AgentGuard enables constrained, revocable, and time-bound execution authority for autonomous agents — while preserving full owner custody of funds.

Built natively for TON’s actor-based execution model.

---

## Why This Exists

With TON MCP (Model Context Protocol), AI agents can now:

- Operate wallets  
- Transfer jettons & NFTs  
- Execute DeFi trades  
- Resolve `.ton` domains  
- Interact with smart contracts  

But granting an autonomous agent full wallet custody introduces systemic risk.

**AgentGuard introduces programmable, on-chain execution policies:**

- The owner keeps custody  
- The agent receives bounded authority  
- All enforcement happens fully on-chain  
- No off-chain signatures  
- No trusted relayers  

This is infrastructure for secure Agentic Wallets.

---

## TON Actor Model Alignment

TON follows an actor-based execution model:

- Each contract is an independent actor  
- Communication happens via asynchronous message passing  
- There is no shared mutable state  
- Internal messages drive execution  

AgentGuard is designed explicitly for this model.

Instead of delegating wallet control, AgentGuard acts as a **policy-enforcing actor** that mediates message flow between autonomous agents and target contracts.

Execution flow:

1. Agent sends `Execute` message to AgentGuard  
2. AgentGuard validates session constraints  
3. AgentGuard forwards a bounded internal message  
4. Target contract processes it independently  

AgentGuard extends TON’s actor model with programmable policy constraints for autonomous actors.

---

## Core Features

Each session defines strict policy constraints:

- ⏳ Expiry (time-bound authority)  
- 💰 Max per-transaction spending  
- 💎 Max total session spending  
- 🔁 Nonce-based replay protection  
- 🎯 Multi-target allowlist (controlled contract interaction)  
- 🛑 Revocable at any time by owner  

The agent never directly controls funds.

All execution flows through the guard contract.

---

## Agent-to-Agent Execution Routing

Sessions support a **multi-target allowlist**.

This enables structured agent-to-agent or agent-to-tool interactions:

Agent A → AgentGuard → Agent B

Instead of unrestricted calls, autonomous agents communicate through policy-enforced session channels.

This enables:

- Secure multi-agent systems  
- Bounded DeFi automation  
- Controlled NFT operations  
- Jetton transfer agents  
- Policy-routed AI workflows  

AgentGuard acts as a programmable execution router between autonomous actors.

---

## Contracts

### AgentGuard

Core policy enforcement contract.

Responsibilities:

- Stores owner  
- Creates & revokes sessions  
- Tracks spending and nonce  
- Enforces execution constraints  
- Routes validated internal messages  

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

All policy enforcement happens on-chain before forwarding.

---

## TON MCP Compatibility

AgentGuard is compatible with TON MCP-powered agents.

When an AI agent interacts with TON via MCP, AgentGuard can serve as the execution layer instead of a direct wallet.

The agent submits transactions through MCP, but all value transfers and contract calls are routed through AgentGuard, which enforces session constraints on-chain.

This enables:

- Bounded agent wallets  
- Safe DeFi interactions  
- Controlled jetton transfers  
- Secure NFT operations  
- Revocable and time-limited delegated autonomy  
- Structured multi-agent coordination  

AgentGuard acts as a policy firewall for TON-native AI agents.

---

## Security Model

- Funds are held by AgentGuard  
- Agent authority is session-scoped  
- Replay attacks prevented via nonce  
- Spending limits enforced on-chain  
- Target access restricted per session  
- Sessions revocable  
- Expiry enforced  

No off-chain trust assumptions.

---

## Testing

Full integration tests included.

```bash
npx blueprint test

```
---

## Demo (Testnet)

- Deploy AgentGuard
- Deploy CounterReceiver
- Fund guard
- Create session
- Execute Ping through guard
- Validate successful execution

```bash
npx blueprint run demo