import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core';
import { Roles, TenantId } from '../common/decorators';
import { ReviewsService } from './reviews.service';

/** Avaliações recebidas, para o administrador do restaurante. */
@ApiTags('reviews')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  summary(@TenantId() rid: string) {
    return this.reviews.summary(rid);
  }
}
