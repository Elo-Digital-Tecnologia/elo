import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto, SuperadminLoginDto } from './auth.dto';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('superadmin')
  superadmin(@Body() dto: SuperadminLoginDto) {
    return this.auth.superadminLogin(dto.key);
  }
}
