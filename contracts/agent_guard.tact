struct Session {
    agent: Address;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
    spentTotal: Int;
    nonceExpected: Int;
    revoked: Bool;
    allowedTargets: map<Address, Bool>;
}

struct SessionView {
    agent: Address;
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
    target: Address;
    value: Int;
    body: Cell;
}
message RevokeSession {
    sessionId: Int;
}
message(0x5de19e8) CreateSession {
    agent: Address;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
    allowedTarget: Address;
}
message Withdraw {
    amount: Int;
    to: Address;
}

message AddAllowedTarget {
    sessionId: Int;
    target: Address;
}

message RemoveAllowedTarget {
    sessionId: Int;
    target: Address;
}

contract AgentGuard {

    owner: Address;
    nextSessionId: Int;
    sessions: map<Int, Session>;

    init(owner: Address) {
        self.owner = owner;
        self.nextSessionId = 1;
    }

    fun onlyOwner() {
        require(sender() == self.owner, "NOT_OWNER");
    }

    fun lockedAmountForSession(session: Session): Int {
        if (session.revoked) {
            return 0;
        }

        if (session.expiry <= now()) {
            return 0;
        }

        return session.maxTotal - session.spentTotal;
    }

    fun totalLockedFunds(): Int {
        let total = 0;

        foreach (sessionId, session in self.sessions) {
            total = total + self.lockedAmountForSession(session);
        }

        return total;
    }

    fun availableContractBalance(): Int {
        return myBalance() - context().value - self.totalLockedFunds();
    }

    receive() {}

    receive(msg: CreateSession) {
        self.onlyOwner();

        require(msg.maxTotal > 0, "BAD_MAX_TOTAL");
        require(msg.maxPerTx > 0, "BAD_MAX_PERTX");
        require(msg.maxPerTx <= msg.maxTotal, "PERTX_GT_TOTAL");
        require(msg.expiry > now(), "BAD_EXPIRY");
        require(self.availableContractBalance() >= msg.maxTotal, "INSUFFICIENT_AVAILABLE");

        let id = self.nextSessionId;
        self.nextSessionId = id + 1;

        let allow: map<Address, Bool> = emptyMap();
        allow.set(msg.allowedTarget, true);

        let session: Session = Session{
            agent: msg.agent,
            expiry: msg.expiry,
            maxTotal: msg.maxTotal,
            maxPerTx: msg.maxPerTx,
            spentTotal: 0,
            nonceExpected: 0,
            revoked: false,
            allowedTargets: allow,
        };

        self.sessions.set(id, session);
    }  

    receive(msg: RevokeSession) {
        self.onlyOwner();

        // Try to load session
        let s = self.sessions.get(msg.sessionId);

        // If get() returns nullable, this check is needed:
        require(s != null, "NO_SESSION");

        let ss = s!!; // unwrap nullable Session?

        require(!ss.revoked, "ALREADY_REVOKED");

        ss.revoked = true;
        self.sessions.set(msg.sessionId, ss);
    }

    receive(msg: Withdraw) {
        self.onlyOwner();
        require(msg.amount > 0, "BAD_AMOUNT");
        require(self.availableContractBalance() >= msg.amount, "INSUFFICIENT_AVAILABLE");

        let lockedFunds = self.totalLockedFunds();
        if (lockedFunds > 0) {
            nativeReserve(lockedFunds, ReserveExact);
        }

        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            bounce: false
        });
    }    

    receive(msg: Execute) {
        let s = self.sessions.get(msg.sessionId);
        require(s != null, "NO_SESSION");
        let ss = s!!;

        require(sender() == ss.agent, "NOT_AGENT");

        require(ss.allowedTargets.exists(msg.target), "TARGET_NOT_ALLOWED");
        require(!ss.revoked, "REVOKED");
        require(now() < ss.expiry, "EXPIRED");

        require(msg.nonce == ss.nonceExpected, "BAD_NONCE");
        require(msg.value > 0, "BAD_VALUE");
        require(msg.value <= ss.maxPerTx, "OVER_MAX_PERTX");
        require(ss.spentTotal + msg.value <= ss.maxTotal, "OVER_MAX_TOTAL");

        ss.nonceExpected = ss.nonceExpected + 1;
        ss.spentTotal = ss.spentTotal + msg.value;
        self.sessions.set(msg.sessionId, ss);

        let lockedFunds = self.totalLockedFunds();
        if (lockedFunds > 0) {
            nativeReserve(lockedFunds, ReserveExact);
        }

        send(SendParameters{
            to: msg.target,
            value: msg.value,
            body: msg.body,
            bounce: true
        });
    }

    receive(msg: AddAllowedTarget) {
        self.onlyOwner();

        let sOpt = self.sessions.get(msg.sessionId);
        require(sOpt != null, "NO_SESSION");
        let s = sOpt!!;

        require(!s.revoked, "REVOKED");
        require(s.expiry > now(), "EXPIRED");

        s.allowedTargets.set(msg.target, true);
        self.sessions.set(msg.sessionId, s);
    }

    receive(msg: RemoveAllowedTarget) {
        self.onlyOwner();

        let sOpt = self.sessions.get(msg.sessionId);
        require(sOpt != null, "NO_SESSION");
        let s = sOpt!!;

        s.allowedTargets.del(msg.target);
        self.sessions.set(msg.sessionId, s);
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
            expiry: s.expiry,
            maxTotal: s.maxTotal,
            maxPerTx: s.maxPerTx,
            spentTotal: s.spentTotal,
            nonceExpected: s.nonceExpected,
            revoked: s.revoked,
            lockedAmount: self.lockedAmountForSession(s),
        };
    }

    get fun isTargetAllowed(sessionId: Int, target: Address): Bool {
        let sOpt = self.sessions.get(sessionId);
        require(sOpt != null, "NO_SESSION");
        let s = sOpt!!;

        return s.allowedTargets.exists(target);
    }
}
