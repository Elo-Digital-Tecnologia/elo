import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './naming';

/** Usado pelo CLI do TypeORM (migrations). */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*.js'],
  namingStrategy: new SnakeNamingStrategy(),
});
