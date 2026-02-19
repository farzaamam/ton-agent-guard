// Since v1.6.0, Tact has a contract parameters syntax that can supersede
// lazy initialization by init() for all contracts that do not require specific on-chain
// deployment logic that must be run only once in the `init()` function.
//
// Note that the empty parameter list above is still a parameter list,
// meaning that the contract won't have an implicit or explicit `init(){:tact}` function
// and will enjoy storage write optimizations and use less gas overall.
//
// See: https://docs.tact-lang.org/book/contracts/#parameters
struct Session {
    owner: Address;
    agent: Address;
    expiry: Int;
    maxTotal: Int;
    maxPerTx: Int;
    spentTotal: Int;
    nonceExpected: Int;
    revoked: Bool;
    allowedTarget: Address;
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

    receive() {
       
    }

    receive(msg: CreateSession) {
        self.onlyOwner();

        require(msg.maxTotal > 0, "BAD_MAX_TOTAL");
        require(msg.maxPerTx > 0, "BAD_MAX_PERTX");
        require(msg.maxPerTx <= msg.maxTotal, "PERTX_GT_TOTAL");
        require(msg.expiry > now(), "BAD_EXPIRY");

        let id = self.nextSessionId;
        self.nextSessionId = id + 1;

        let session: Session = Session{
            owner: self.owner,
            agent: msg.agent,
            expiry: msg.expiry,
            maxTotal: msg.maxTotal,
            maxPerTx: msg.maxPerTx,
            spentTotal: 0,
            nonceExpected: 0,
            revoked: false,
            allowedTarget: msg.allowedTarget,
        };

        self.sessions.set(id, session);

        // Optional for later: cashback(sender());  (but we usually keep value in contract)
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

        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            bounce: false
        });
    }    

    receive(msg: Execute) {
        // Load session (your map.get returns nullable in your setup)
        let s = self.sessions.get(msg.sessionId);
        require(s != null, "NO_SESSION");
        let ss = s!!;

        // Only the agent can execute
        require(sender() == ss.agent, "NOT_AGENT");

        require(msg.target == ss.allowedTarget, "TARGET_NOT_ALLOWED"); 
        // Session must be active
        require(!ss.revoked, "REVOKED");
        require(now() < ss.expiry, "EXPIRED");

        require(msg.nonce == ss.nonceExpected, "BAD_NONCE");
        require(msg.value > 0, "BAD_VALUE");
        require(msg.value <= ss.maxPerTx, "OVER_MAX_PERTX");
        require(ss.spentTotal + msg.value <= ss.maxTotal, "OVER_MAX_TOTAL");

        // Update accounting BEFORE sending
        ss.nonceExpected = ss.nonceExpected + 1;
        ss.spentTotal = ss.spentTotal + msg.value;

        self.sessions.set(msg.sessionId, ss);

        send(SendParameters{
            to: msg.target,
            value: msg.value,
            body: msg.body,
            bounce: true
        });
    }
}
