struct Session {
    agent: Address;
    target: Address;
    allowedOp: Int;
    policyMode: Int;
    bodyHash: Int;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
    spentTotal: Int;
    nonceExpected: Int;
    revoked: Bool;
}

struct SessionView {
    agent: Address;
    target: Address;
    allowedOp: Int;
    policyMode: Int;
    bodyHash: Int;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
    spentTotal: Int;
    nonceExpected: Int;
    revoked: Bool;
    lockedAmount: Int;
}

message Execute {
    sessionId: Int;
    nonce: Int;
    value: Int;
    body: Cell;
}

message RevokeSession {
    sessionId: Int;
}

message(0x2169f4b3) CreateSession {
    agent: Address;
    target: Address;
    allowedOp: Int;
    policyMode: Int;
    bodyHash: Int;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
}

message Withdraw {
    amount: Int;
    to: Address;
}

const MIN_STORAGE_RESERVE: Int = ton("0.05");

contract AgentGuard {
    owner: Address;
    nextSessionId: Int = 1;
    sessions: map<Int, Session>;

    init(owner: Address) {
        self.owner = owner;
    }

    receive() {}

    fun onlyOwner() {
        require(sender() == self.owner, "NOT_OWNER");
    }

    fun validateSessionEndpoints(agent: Address, target: Address) {
        require(agent != myAddress(), "AGENT_CANNOT_BE_SELF");
        require(target != myAddress(), "TARGET_CANNOT_BE_SELF");
        require(agent != target, "AGENT_CANNOT_BE_TARGET");
    }

    fun bodyOpcode(body: Cell): Int {
        let bodySlice = body.beginParse();
        require(bodySlice.bits() >= 32, "BAD_OP");
        return bodySlice.preloadUint(32);
    }

    fun lockedAmountForSession(session: Session): Int {
        if (session.revoked) {
            return 0;
        }

        if (session.expiry <= now()) {
            return 0;
        }

        require(session.spentTotal <= session.maxTotal, "CORRUPT_SESSION");
        return session.maxTotal - session.spentTotal;
    }

    fun totalLockedFunds(): Int {
        let total = 0;

        foreach (_, session in self.sessions) {
            total += self.lockedAmountForSession(session);
        }

        return total;
    }

    // Free balance excludes session-locked funds and the permanent storage floor.
    fun availableContractBalanceWithIncomingValue(incomingValue: Int): Int {
        let available =
            myBalance() - incomingValue - self.totalLockedFunds() - MIN_STORAGE_RESERVE;
        if (available > 0) {
            return available;
        }

        return 0;
    }

    fun availableContractBalance(): Int {
        return self.availableContractBalanceWithIncomingValue(context().value);
    }

    // Outbound sends preserve both session-locked funds and MIN_STORAGE_RESERVE.
    fun outboundReserveTarget(): Int {
        return self.totalLockedFunds() + MIN_STORAGE_RESERVE;
    }

    receive(msg: CreateSession) {
        self.onlyOwner();

        self.validateSessionEndpoints(msg.agent, msg.target);

        require(msg.allowedOp >= 0, "BAD_ALLOWED_OP");
        require(msg.allowedOp <= 0xffffffff, "BAD_ALLOWED_OP");
        require(msg.policyMode == 0 || msg.policyMode == 1, "BAD_POLICY_MODE");
        if (msg.policyMode == 0) {
            require(msg.bodyHash == 0, "BODY_HASH_MUST_BE_ZERO");
        } else {
            require(msg.bodyHash != 0, "BODY_HASH_REQUIRED");
        }

        require(msg.maxTotal > 0, "BAD_MAX_TOTAL");
        require(msg.maxPerTx > 0, "BAD_MAX_PERTX");
        require(msg.maxPerTx <= msg.maxTotal, "PERTX_GT_TOTAL");
        require(msg.expiry > now(), "BAD_EXPIRY");
        require(self.availableContractBalance() >= msg.maxTotal, "INSUFFICIENT_AVAILABLE");

        let session = Session{
            agent: msg.agent,
            target: msg.target,
            allowedOp: msg.allowedOp,
            policyMode: msg.policyMode,
            bodyHash: msg.bodyHash,
            expiry: msg.expiry,
            maxTotal: msg.maxTotal,
            maxPerTx: msg.maxPerTx,
            spentTotal: 0,
            nonceExpected: 0,
            revoked: false
        };

        let sessionId = self.nextSessionId;
        self.sessions.set(sessionId, session);
        self.nextSessionId = sessionId + 1;
    }

    receive(msg: RevokeSession) {
        self.onlyOwner();

        let sOpt = self.sessions.get(msg.sessionId);
        require(sOpt != null, "NO_SESSION");

        let s = sOpt!!;
        require(!s.revoked, "ALREADY_REVOKED");

        s.revoked = true;
        self.sessions.set(msg.sessionId, s);
    }

    receive(msg: Withdraw) {
        self.onlyOwner();

        require(msg.to != myAddress(), "BAD_WITHDRAW_TO");

        require(msg.amount > 0, "BAD_AMOUNT");
        require(self.availableContractBalance() >= msg.amount, "INSUFFICIENT_AVAILABLE");

        nativeReserve(self.outboundReserveTarget(), ReserveExact);

        message(MessageParameters{to: msg.to, value: msg.amount, bounce: false});
    }

    receive(msg: Execute) {
        // Quota is consumed when execution is accepted and dispatched.
        // Downstream bounce/failure does not roll back spentTotal or nonceExpected.
        let sOpt = self.sessions.get(msg.sessionId);
        require(sOpt != null, "NO_SESSION");

        let s = sOpt!!;

        require(sender() == s.agent, "NOT_AGENT");
        require(!s.revoked, "REVOKED");
        require(now() < s.expiry, "EXPIRED");

        require(msg.nonce == s.nonceExpected, "BAD_NONCE");
        require(msg.value > 0, "BAD_VALUE");
        require(msg.value <= s.maxPerTx, "OVER_MAX_PERTX");
        require(s.spentTotal + msg.value <= s.maxTotal, "OVER_MAX_TOTAL");
        require(self.bodyOpcode(msg.body) == s.allowedOp, "BAD_OP");
        if (s.policyMode == 1) {
            let bodyHash = msg.body.hash();
            require(bodyHash == s.bodyHash, "BODY_HASH_MISMATCH");
        } else {
            require(s.policyMode == 0, "BAD_POLICY_MODE");
        }

        s.nonceExpected += 1;
        s.spentTotal += msg.value;
        self.sessions.set(msg.sessionId, s);

        nativeReserve(self.outboundReserveTarget(), ReserveExact);

        message(MessageParameters{
            to: s.target,
            value: msg.value,
            body: msg.body,
            bounce: true
        });
    }

    get fun getOwner(): Address {
        return self.owner;
    }

    get fun getNextSessionId(): Int {
        return self.nextSessionId;
    }

    // Reports session-locked funds only; MIN_STORAGE_RESERVE is protected separately.
    get fun getReservedTotal(): Int {
        return self.totalLockedFunds();
    }

    get fun getAvailableBalance(): Int {
        return self.availableContractBalanceWithIncomingValue(0);
    }

    get fun getSession(sessionId: Int): SessionView {
        let sOpt = self.sessions.get(sessionId);
        require(sOpt != null, "NO_SESSION");

        let s = sOpt!!;

        return SessionView{
            agent: s.agent,
            target: s.target,
            allowedOp: s.allowedOp,
            policyMode: s.policyMode,
            bodyHash: s.bodyHash,
            expiry: s.expiry,
            maxTotal: s.maxTotal,
            maxPerTx: s.maxPerTx,
            spentTotal: s.spentTotal,
            nonceExpected: s.nonceExpected,
            revoked: s.revoked,
            lockedAmount: self.lockedAmountForSession(s)
        };
    }
}
