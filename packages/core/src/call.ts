import { Expose, Type } from 'class-transformer';

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
	@Expose()
	id: string;

	@Expose()
	organizationId?: string;

	@Expose()
	state: CallState;

	@Expose()
	direction: CallDirection;

	@Expose()
	from: string;

	@Expose()
	to: string;

	@Expose()
	agentId?: string;

	@Expose()
	externalId?: string;

	@Expose()
	providerMetadata?: Record<string, any>;

	@Expose()
	externalParentId?: string;

	@Expose()
	@Type(() => Date)
	startedAt?: Date;

	@Expose()
	@Type(() => Date)
	answeredAt?: Date;

	@Expose()
	@Type(() => Date)
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