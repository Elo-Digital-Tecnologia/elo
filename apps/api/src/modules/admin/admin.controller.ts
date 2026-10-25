// Admin Controller — Elo Digital API

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { JwtAuthGuard, RequireRole } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireRole('superadmin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter estatísticas do dashboard admin' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('team')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar membros da equipe Elo Digital' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getTeam(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20
  ) {
    return this.adminService.getTeamMembers(page, pageSize);
  }

  @Post('team')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar membro da equipe Elo Digital' })
  async createTeamMember(@Body() input: any, @CurrentUser() user: any) {
    return this.adminService.createTeamMember(input, user);
  }

  @Put('team/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar membro da equipe' })
  async updateTeamMember(@Param('id') id: string, @Body() input: any) {
    return this.adminService.updateTeamMember(id, input);
  }

  @Delete('team/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro da equipe' })
  async deleteTeamMember(@Param('id') id: string) {
    return this.adminService.deleteTeamMember(id);
  }

  @Put('restaurants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender restaurante' })
  async suspendRestaurant(@Param('id') id: string) {
    return this.adminService.suspendRestaurant(id);
  }

  @Put('restaurants/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reativar restaurante' })
  async reactivateRestaurant(@Param('id') id: string) {
    return this.adminService.reactivateRestaurant(id);
  }

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter configurações do sistema' })
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }
}