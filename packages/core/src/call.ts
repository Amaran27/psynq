export enum CallDirection {
	INBOUND = 'inbound',
	OUTBOUND = 'outbound',
}

export enum CallState {
	IDLE = 'idle',
	RINGING = 'ringing',
	ANSWERED = 'answered',
	ON_HOLD = 'on_hold',
	ENDED = 'ended',
}

export class Call {
	id: string;
	state: CallState;
	direction: CallDirection;
	from: string;
	to: string;
	agentId?: string;
	// External provider call ID (e.g., Twilio SID)
	twilioSid?: string;
	startedAt?: Date;
	answeredAt?: Date;
	endedAt?: Date;

	constructor(id: string, from: string, to: string, direction: CallDirection = CallDirection.INBOUND) {
		this.id = id;
		this.state = CallState.IDLE;
		this.direction = direction;
		this.from = from;
		this.to = to;
		this.startedAt = new Date();
	}
}