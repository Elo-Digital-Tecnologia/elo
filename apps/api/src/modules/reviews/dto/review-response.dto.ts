import type { ReviewView } from '@elo/core/api/views/review.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ReviewResponseDTO implements ReviewView {
    @Expose()
    public id: string;

    @Expose()
    public stars: number;

    @Expose()
    public comment: string | null;

    @Expose()
    public tableName: string;

    @Expose()
    public createdAt: string;

    public static from(source: ReviewResponseDTO): ReviewResponseDTO {
        return plainToInstance(ReviewResponseDTO, source);
    }
}
