import type { SuspensionReason } from '@elo/core/billing/billing';
import type {
    BillingPlan,
    ContractKind,
    ContractState,
    TrialStatus
} from '@elo/core/contracts/contracts';
import type { AccessState, RestaurantStatus } from '@elo/core/subscription/subscription';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class SubscriptionResponseDTO {
    @Expose()
    public state: AccessState;

    @Expose()
    public dueDate: Date;

    @Expose()
    public graceEndsAt: Date;

    @Expose()
    public warning: boolean;

    @Expose()
    public reasons: Array<SuspensionReason>;

    @Expose()
    public plan: BillingPlan | null;

    @Expose()
    public status: RestaurantStatus;

    @Expose()
    public trial: TrialStatus;

    @Expose()
    public contract: {
        state: ContractState;
        endsOn: string | null;
        daysLeft: number | null;
        nextStartsOn: string | null;
        voided: { kind: ContractKind | null; at: string } | null;
    };

    public static from(source: SubscriptionResponseDTO): SubscriptionResponseDTO {
        return plainToInstance(SubscriptionResponseDTO, source);
    }
}
