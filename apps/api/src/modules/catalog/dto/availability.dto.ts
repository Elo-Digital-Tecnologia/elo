import { IsBoolean } from 'class-validator';

export class AvailabilityDTO {
    @IsBoolean()
    public available: boolean;
}
