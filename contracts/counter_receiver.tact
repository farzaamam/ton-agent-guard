message Ping {
    note: Int;
}

contract CounterReceiver {
    id: Int;
    count: Int;

    init(id: Int) {
        self.id = id;
        self.count = 0;
    }

    receive() {}
   
    receive(msg: Ping) {
        self.count = self.count + msg.note;
    }

    get fun getCount(): Int {
        return self.count;
    }
}