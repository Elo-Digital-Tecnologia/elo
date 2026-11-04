import type { DocumentView } from '@elo/core/billing/billing';
import type {
    BillingPlan,
    ContractKind,
    ContractOrigin,
    TrialEndReason
} from '@elo/core/contracts/contracts';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ContractResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public plan: BillingPlan | null;

    @Expose()
    public kind: ContractKind;

    @Expose()
    public origin: ContractOrigin;

    @Expose()
    public previousId: string | null;

    @Expose()
    public signedOn: string;

    @Expose()
    public startsOn: string;

    @Expose()
    public endsOn: string;

    @Expose()
    public effectiveEndsOn: string;

    @Expose()
    public trialDays: number;

    @Expose()
    public trialEndedOn: string | null;

    @Expose()
    public trialEndReason: TrialEndReason | null;

    @Expose()
    public signatory: { name: string; role: string; contact: string };

    @Expose()
    public document: DocumentView;

    @Expose()
    public createdByName: string | null;

    @Expose()
    public createdAt: string;

    @Expose()
    public voided: { at: string; byName: string; reason: string } | null;

    public static from(source: ContractResponseDTO): ContractResponseDTO {
        return plainToInstance(ContractResponseDTO, source);
    }
}
