export interface ReviewView {
    id: string;
    stars: number;
    comment: string | null;
    tableName: string;
    createdAt: string;
}

export interface ReviewSummaryView {
    count: number;
    /** Average from 1 to 5 with one decimal; 0 without reviews. */
    average: number;
    reviews: ReviewView[];
}
