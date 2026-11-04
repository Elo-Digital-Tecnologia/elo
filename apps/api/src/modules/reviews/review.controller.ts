import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core/roles/roles';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { ReviewSummaryResponseDTO } from './dto/review-summary-response.dto.js';
import { ReviewService } from './review.service.js';

/** Reviews received, for the restaurant admin. */
@ApiTags('reviews')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviews: ReviewService) {}

    @Get()
    public async summary(@TenantId() rid: string) {
        return ReviewSummaryResponseDTO.from(await this.reviews.summary(rid));
    }
}
