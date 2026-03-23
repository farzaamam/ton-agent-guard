struct Session {
    agent: Address;
    target: Address;
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

message(0x1f7db621) CreateSession {
    agent: Address;
    target: Address;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
}

message Withdraw {
    amount: Int;
    to: Address;
}

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

    fun availableContractBalance(): Int {
        return myBalance() - context().value - self.totalLockedFunds();
    }

    receive(msg: CreateSession) {
        self.onlyOwner();

        self.validateSessionEndpoints(msg.agent, msg.target);

        require(msg.maxTotal > 0, "BAD_MAX_TOTAL");
        require(msg.maxPerTx > 0, "BAD_MAX_PERTX");
        require(msg.maxPerTx <= msg.maxTotal, "PERTX_GT_TOTAL");
        require(msg.expiry > now(), "BAD_EXPIRY");
        require(self.availableContractBalance() >= msg.maxTotal, "INSUFFICIENT_AVAILABLE");

        let session = Session{
            agent: msg.agent,
            target: msg.target,
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

        let lockedFunds = self.totalLockedFunds();
        if (lockedFunds > 0) {
            nativeReserve(lockedFunds, ReserveExact);
        }

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

        s.nonceExpected += 1;
        s.spentTotal += msg.value;
        self.sessions.set(msg.sessionId, s);

        let lockedFunds = self.totalLockedFunds();
        if (lockedFunds > 0) {
            nativeReserve(lockedFunds, ReserveExact);
        }

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

    get fun getReservedTotal(): Int {
        return self.totalLockedFunds();
    }

    get fun getAvailableBalance(): Int {
        return myBalance() - self.totalLockedFunds();
    }

    get fun getSession(sessionId: Int): SessionView {
        let sOpt = self.sessions.get(sessionId);
        require(sOpt != null, "NO_SESSION");

        let s = sOpt!!;

        return SessionView{
            agent: s.agent,
            target: s.target,
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