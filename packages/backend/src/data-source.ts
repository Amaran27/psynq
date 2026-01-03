import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CallEntity } from './entities/call.entity';
import { ChannelEntity } from './entities/channel.entity';
import { BridgeEntity } from './entities/bridge.entity';
import { CampaignEntity } from './entities/campaign.entity';
import { LeadEntity } from './entities/lead.entity';
import { UserEntity } from './entities/user.entity';
import { CallParticipantEntity } from './entities/call-participant.entity';
import { RecordingEntity } from './entities/recording.entity';
import { SettingEntity } from './entities/setting.entity';
import { OrganizationEntity } from './entities/organization.entity';
import { QueueEntity } from './entities/queue.entity';
import { FlowEntity } from './entities/flow.entity';
import { RateEntity } from './entities/rate.entity';
import { WalletEntity } from './entities/wallet.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from './entities/email-verification-token.entity';
import { FailedLoginEntity } from './entities/failed-login.entity';
import { SessionEntity } from './entities/session.entity';

// DataSource used by TypeORM CLI for migrations and by deployment scripts.
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'psynq_user',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  database: process.env.DB_DATABASE || 'psynq_db',
  entities: [
    CallEntity,
    ChannelEntity,
    BridgeEntity,
    CampaignEntity,
    LeadEntity,
    UserEntity,
    CallParticipantEntity,
    RecordingEntity,
    SettingEntity,
    OrganizationEntity,
    QueueEntity,
    FlowEntity,
    RateEntity,
    WalletEntity,
    PasswordResetTokenEntity,
    EmailVerificationTokenEntity,
    FailedLoginEntity,
    SessionEntity,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

export default AppDataSource;
