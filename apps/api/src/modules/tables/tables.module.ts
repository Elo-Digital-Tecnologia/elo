// Tables Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Table } from '@elo-digital/database/entities/Table';
import { TableToken } from '@elo-digital/database/entities/TableToken';
import { TableSession } from '@elo-digital/database/entities/TableSession';

import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Table, TableToken, TableSession])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService]
})
export class TablesModule {}