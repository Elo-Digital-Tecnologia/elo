import { IsBoolean } from 'class-validator';

export class RefuseFeeDTO {
    @IsBoolean()
    public refuse: boolean;
}
