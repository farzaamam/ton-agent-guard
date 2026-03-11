# AgentGuard Threat Model

## Purpose

AgentGuard reduces the risk of giving autonomous agents broad wallet or contract execution authority on TON.

It does this by enforcing bounded session policies on-chain before forwarding execution to target contracts.

---

## What AgentGuard Protects Against

### Excessive delegated authority
An agent cannot spend without limits. Each session enforces max per-transaction and max total spend.

### Replay and out-of-order execution
Each session tracks an expected nonce. Replayed or out-of-order `Execute` requests are rejected.

### Execution after intended validity window
Expired sessions cannot execute.

### Continued execution after owner cancellation
Revoked sessions cannot execute.

### Interaction with non-approved contracts
Execution is limited to session allowlisted targets.

### Unauthorized execution sender
Only the agent address assigned to the session can execute through that session.

---

## What AgentGuard Does Not Protect Against

### Malicious or vulnerable allowlisted targets
If a target contract is allowlisted, AgentGuard does not validate the safety of that target’s internal logic.

### Unsafe payload semantics
Current enforcement is target-level, not method-level or payload-level. An allowlisted target may still receive arbitrary allowed message bodies.

### Owner mistakes
If the owner creates an overly permissive session or allowlists the wrong target, AgentGuard will still enforce that incorrect policy exactly as configured.

### Liquidity isolation across sessions
Session budgets are not backed by reserved balances. Multiple sessions may depend on the same contract-held funds.

### Rich approval workflows
AgentGuard does not yet support “require approval” or multi-step escalation flows. The current outcomes are effectively allow or reject.

---

## Trust Assumptions

The current model assumes:

- the owner is trusted to create sensible session policies
- the owner is trusted to manage revocation and withdrawals
- allowlisted target contracts are trusted to behave as intended
- the agent may be fallible or partially untrusted, which is why bounded session constraints exist

---

## Important Current Semantics

### Session budget is a policy limit
`maxTotal` defines the maximum permitted spend for a session, not funds reserved exclusively for that session.

### Spend is consumed on accepted execution attempts
Once an execution request passes guard checks and is forwarded, session spend and nonce advance. This is true even if downstream behavior is not economically useful.

### Permissions are target-level
Current policy checks whether the destination contract is allowlisted. It does not yet restrict specific message schemas or method-level behavior.

---

## Known v0 Limitations

- no method-level restrictions
- no payload-level restrictions
- no approval escalation path
- no per-session reserved liquidity
- no richer risk scoring or policy composition

---

## Summary

AgentGuard v0 is a practical on-chain session guard for bounded autonomous execution.

It significantly reduces delegation risk compared with direct wallet authority, while remaining intentionally simple and TON-native.

Its current strongest form is a session-scoped execution firewall for agents.