// Auth Controller — Elo Digital API

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  UserAgent
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, CurrentRestaurant } from '../../common/decorators';

import {
  LoginInput,
  RegisterInput,
  CreateUserInput
} from '@elo-digital/core/validation';

import { User } from '@elo-digital/database/entities/User';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // Internal Auth (Dashboard)
  // ============================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário interno (dashboard)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() input: LoginInput, @Ip() ip: string, @UserAgent() ua: string) {
    return this.authService.login(input);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de novo usuário (primeiro admin do restaurante)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(@Body() input: RegisterInput) {
    return this.authService.register(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário logado' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string
  ) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async getProfile(
    @CurrentUser() user: User,
    @CurrentRestaurant() restaurantId: string
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt
      }
    };
  }

  // ============================================
  // User Management (Admin)
  // ============================================

  @Post('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo usuário (admin do restaurante)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Sem permissão' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async createUser(
    @Request() req: any,
    @Body() input: CreateUserInput
  ) {
    return this.authService.createUser(input, req.user);
  }

  // ============================================
  // Table Session (Public Menu)
  // ============================================

  @Post('table/session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar sessão de mesa via token NFC/QR' })
  @ApiResponse({ status: 201, description: 'Sessão criada com sucesso' })
  @ApiResponse({ status: 401, description: 'Token de mesa inválido ou mesa indisponível' })
  async createTableSession(@Body('tableToken') tableToken: string) {
    return this.authService.createTableSession(tableToken);
  }

  @Post('table/session/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar sessão de mesa existente' })
  @ApiResponse({ status: 200, description: 'Sessão válida' })
  @ApiResponse({ status: 401, description: 'Sessão inválida ou expirada' })
  async validateTableSession(@Body('sessionToken') sessionToken: string) {
    return this.authService.validateTableSession(sessionToken);
  }

  @Post('table/session/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar sessão de mesa (pelo garçom)' })
  @ApiResponse({ status: 200, description: 'Sessão encerrada' })
  async closeTableSession(@Body('sessionToken') sessionToken: string) {
    return this.authService.closeTableSession(sessionToken);
  }
}