import type { ReviewSummaryView, ReviewView } from '@elo/core/api/views/review.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ReviewSummaryResponseDTO implements ReviewSummaryView {
    @Expose()
    public count: number;

    @Expose()
    public average: number;

    @Expose()
    public reviews: Array<ReviewView>;

    public static from(source: ReviewSummaryResponseDTO): ReviewSummaryResponseDTO {
        return plainToInstance(ReviewSummaryResponseDTO, source);
    }
}
