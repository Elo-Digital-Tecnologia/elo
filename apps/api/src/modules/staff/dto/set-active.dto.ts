import { IsBoolean } from 'class-validator';

export class SetActiveDTO {
    @IsBoolean()
    public active: boolean;
}
