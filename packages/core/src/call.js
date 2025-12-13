export var CallState;
(function (CallState) {
    CallState["IDLE"] = "idle";
    CallState["RINGING"] = "ringing";
    CallState["ANSWERED"] = "answered";
    CallState["ON_HOLD"] = "on_hold";
    CallState["ENDED"] = "ended";
})(CallState || (CallState = {}));
export class Call {
    id;
    state;
    from;
    to;
    agentId;
    startedAt;
    endedAt;
    constructor(id, from, to) {
        this.id = id;
        this.state = CallState.IDLE;
        this.from = from;
        this.to = to;
    }
}
//# sourceMappingURL=call.js.map