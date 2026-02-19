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

    get fun getCount(): Int {
        return self.count;
    }

}