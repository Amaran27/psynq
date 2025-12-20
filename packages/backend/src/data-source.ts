import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CallEntity } from './entities/call.entity';
import { UserEntity } from './entities/user.entity';
import { CallParticipantEntity } from './entities/call-participant.entity';
import { RecordingEntity } from './entities/recording.entity';
import { SettingEntity } from './entities/setting.entity';

// DataSource used by TypeORM CLI for migrations and by deployment scripts.
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'psynq_user',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  database: process.env.DB_DATABASE || 'psynq_db',
  entities: [CallEntity, UserEntity, CallParticipantEntity, RecordingEntity, SettingEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

export default AppDataSource;
