// Users Controller — Elo Digital API

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

import { UsersService } from './users.service';
import { JwtAuthGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

import { CreateUserInput, UpdateUserInput } from '@elo-digital/core/validation';
import { UserRole } from '@elo-digital/core/types';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async create(@Body() input: CreateUserInput, @CurrentUser() user: any) {
    return this.usersService.create(input, user);
  }

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Listar usuários do restaurante' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @CurrentRestaurant() restaurantId: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20
  ) {
    return this.usersService.findAll(restaurantId, page, pageSize);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateUserInput,
    @CurrentUser() user: any
  ) {
    return this.usersService.update(id, input, user);
  }

  @Put(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar papel do usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async changeRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser() user: any
  ) {
    return this.usersService.changeRole(id, role, user);
  }

  @Put(':id/toggle-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar/desativar usuário' })
  async toggleActive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.toggleActive(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.delete(id, user);
  }
}