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

### Interaction with non-approved contracts or actions
Execution is limited to the session's configured target and body policy.

For opcode-only sessions, this means target + allowed opcode are fixed.

For exact-body-hash sessions, this means target + allowed opcode + exact `bodyHash` are fixed.

### Unauthorized execution sender
Only the agent address assigned to the session can execute through that session.

### Payload mutation in strict sessions
Exact-body-hash sessions additionally reject execution if the forwarded body differs from the pre-approved body, even when the opcode still matches.

---

## What AgentGuard Does Not Protect Against

### Malicious or vulnerable target contracts
If a target contract is configured for a session, AgentGuard does not validate the safety of that target’s internal logic.

### Unsafe payload semantics in opcode-only sessions
Opcode-only sessions do not constrain arbitrary arguments inside a target method. A target may still receive bodies whose leading 32-bit opcode is correct but whose remaining fields are not what the owner intended.

### General semantic policy enforcement
Exact-body-hash sessions materially narrow payload risk by pinning one exact body, but AgentGuard still does not provide general-purpose semantic policy logic.

It does not currently express rules such as:

- any amount up to X
- any recipient from allowlist Y
- field-level predicates over arbitrary payloads

### Owner mistakes
If the owner configures the wrong target, opcode, or strict `bodyHash`, AgentGuard will still enforce that incorrect policy exactly as configured.

### Liquidity isolation across sessions
Session budgets are not backed by reserved balances. Multiple sessions may depend on the same contract-held funds.

### Rich approval workflows
AgentGuard does not yet support “require approval” or multi-step escalation flows. The current outcomes are effectively allow or reject.

---

## Trust Assumptions

The current model assumes:

- the owner is trusted to create sensible session policies
- the owner is trusted to manage revocation and withdrawals
- configured target contracts are trusted to behave as intended
- the agent may be fallible or partially untrusted, which is why bounded session constraints exist

---

## Important Current Semantics

### Session budget is a policy limit
`maxTotal` defines the maximum permitted spend for a session, not funds reserved exclusively for that session.

### Spend is consumed on accepted execution attempts
Once an execution request passes guard checks and is forwarded, session spend and nonce advance. This is true even if downstream behavior is not economically useful.

### Permissions depend on `policyMode`
`policyMode = 0` enforces target, opcode, budget, expiry, and nonce, but does not restrict the rest of the payload.

`policyMode = 1` adds exact `bodyHash` enforcement. This protects against payload mutation and allows exact pre-approved payload execution, but it is still not a general semantic policy engine.

---

## Known v0 Limitations

- no argument-level rules beyond exact `bodyHash` matching
- no approval escalation path
- no per-session reserved liquidity
- no richer risk scoring or policy composition

---

## Summary

AgentGuard v0 is a practical on-chain session guard for bounded autonomous execution.

It significantly reduces delegation risk compared with direct wallet authority, while remaining intentionally simple and TON-native.

Its default form is a session-scoped execution firewall for agents.

Its stricter form is deterministic action authorization for one exact pre-approved payload.
