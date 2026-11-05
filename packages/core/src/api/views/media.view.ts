/** Image from the restaurant's library, as the API sends it. */
export interface MediaView {
    id: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    bytes: number;
    name: string;
    /** Used by a product, the logo or the banner, so it cannot be deleted. */
    inUse: boolean;
}
