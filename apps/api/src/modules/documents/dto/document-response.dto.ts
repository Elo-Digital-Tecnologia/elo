import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class DocumentResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public kind: 'receipt' | 'contract';

    @Expose()
    public name: string;

    @Expose()
    public mime: string;

    @Expose()
    public bytes: number;

    @Expose()
    public createdAt: string;

    public static from(source: DocumentResponseDTO): DocumentResponseDTO {
        return plainToInstance(DocumentResponseDTO, source);
    }
}
