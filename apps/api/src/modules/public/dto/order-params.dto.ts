import { IsUUID } from 'class-validator';

export class OrderParamsDTO {
    @IsUUID()
    public id: string;
}
