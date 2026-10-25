// Tables Service — Elo Digital API

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as qrcode from 'qrcode';

import { Table, TableStatus, TableToken, TableSession } from '@elo-digital/database/entities';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(TableToken)
    private readonly tokenRepository: Repository<TableToken>,
    @InjectRepository(TableSession)
    private readonly sessionRepository: Repository<TableSession>
  ) {}

  async create(restaurantId: string, input: any) {
    const table = this.tableRepository.create({ ...input, restaurantId, status: TableStatus.FREE });
    const saved = await this.tableRepository.save(table);

    // Generate permanent token
    const token = this.generateToken();
    const tableToken = this.tokenRepository.create({ tableId: saved.id, token, isActive: true });
    await this.tokenRepository.save(tableToken);

    // Generate QR Code
    const qrCodeUrl = `${process.env.WEB_MENU_URL || 'http://localhost:3003'}/${saved.restaurant?.slug || ''}/${token}`;
    const qrCode = await qrcode.toDataURL(qrCodeUrl);

    return { ...saved, token, qrCode };
  }

  async getAll(restaurantId: string) {
    return this.tableRepository.find({
      where: { restaurantId },
      relations: ['token', 'session'],
      order: { name: 'ASC' }
    });
  }

  async getOne(restaurantId: string, id: string) {
    const table = await this.tableRepository.findOne({
      where: { id, restaurantId },
      relations: ['token', 'session', 'session.table']
    });
    if (!table) throw new Error('Mesa não encontrada');
    return table;
  }

  async update(restaurantId: string, id: string, input: any) {
    const table = await this.getOne(restaurantId, id);
    Object.assign(table, input);
    return this.tableRepository.save(table);
  }

  async updateStatus(restaurantId: string, id: string, status: TableStatus) {
    const table = await this.getOne(restaurantId, id);
    table.status = status;
    return this.tableRepository.save(table);
  }

  async regenerateToken(restaurantId: string, id: string) {
    const table = await this.getOne(restaurantId, id);

    // Deactivate old token
    if (table.token) {
      table.token.isActive = false;
      await this.tokenRepository.save(table.token);
    }

    // Create new token
    const token = this.generateToken();
    const newToken = this.tokenRepository.create({ tableId: table.id, token, isActive: true });
    await this.tokenRepository.save(newToken);

    const qrCodeUrl = `${process.env.WEB_MENU_URL || 'http://localhost:3003'}/${table.restaurant?.slug || ''}/${token}`;
    const qrCode = await qrcode.toDataURL(qrCodeUrl);

    return { token, qrCode };
  }

  async getQRCode(restaurantId: string, id: string) {
    const table = await this.getOne(restaurantId, id);
    if (!table.token) throw new Error('Token não encontrado');

    const qrCodeUrl = `${process.env.WEB_MENU_URL || 'http://localhost:3003'}/${table.restaurant?.slug || ''}/${table.token.token}`;
    const qrCode = await qrcode.toDataURL(qrCodeUrl);

    return { qrCode, url: qrCodeUrl };
  }

  async delete(restaurantId: string, id: string) {
    const table = await this.getOne(restaurantId, id);

    // Deactivate token
    if (table.token) {
      table.token.isActive = false;
      await this.tokenRepository.save(table.token);
    }

    await this.tableRepository.remove(table);
    return { success: true };
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}