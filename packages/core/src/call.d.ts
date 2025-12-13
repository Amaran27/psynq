export declare enum CallState {
    IDLE = "idle",
    RINGING = "ringing",
    ANSWERED = "answered",
    ON_HOLD = "on_hold",
    ENDED = "ended"
}
export declare class Call {
    id: string;
    state: CallState;
    from: string;
    to: string;
    agentId?: string;
    startedAt?: Date;
    endedAt?: Date;
    constructor(id: string, from: string, to: string);
}
//# sourceMappingURL=call.d.ts.map