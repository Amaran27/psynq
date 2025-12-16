import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CallEntity } from './entities/call.entity';
import { UserEntity } from './entities/user.entity';

// DataSource used by TypeORM CLI for migrations and by deployment scripts.
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'psynq_user',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  database: process.env.DB_NAME || 'psynq_db',
  entities: [CallEntity, UserEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

export default AppDataSource;
