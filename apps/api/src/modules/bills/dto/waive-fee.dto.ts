import { IsBoolean } from 'class-validator';

export class WaiveFeeDTO {
    @IsBoolean()
    public waived: boolean;
}
