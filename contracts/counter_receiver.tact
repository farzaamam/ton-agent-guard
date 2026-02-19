// Since v1.6.0, Tact has a contract parameters syntax that can supersede
// lazy initialization by init() for all contracts that do not require specific on-chain
// deployment logic that must be run only once in the `init()` function.
//
// Note that the empty parameter list above is still a parameter list,
// meaning that the contract won't have an implicit or explicit `init(){:tact}` function
// and will enjoy storage write optimizations and use less gas overall.
//
// See: https://docs.tact-lang.org/book/contracts/#parameters
message Ping {
    note: Int;
}

contract CounterReceiver {
    count: Int;

    init() {
        self.count = 0;
    }
    receive() {
        // allow deploy with empty body
    }
   
    receive(msg: Ping) {
        self.count = self.count + msg.note;
    }
}