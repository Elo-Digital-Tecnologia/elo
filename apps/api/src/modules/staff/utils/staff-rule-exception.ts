import type { StaffRuleRefusal } from '@elo/core/roles/staff-rules';
import type { ApiHttpException } from '#/common/exceptions/api.exception.js';
import { TargetIsOwnerException } from '../exceptions/target-is-owner.exception.js';
import { TargetIsSelfException } from '../exceptions/target-is-self.exception.js';
import { TargetNotBelowException } from '../exceptions/target-not-below.exception.js';

const EXCEPTIONS: Record<StaffRuleRefusal, () => ApiHttpException> = {
    owner: () => new TargetIsOwnerException(),
    not_above: () => new TargetNotBelowException(),
    self: () => new TargetIsSelfException()
};

/** The exception for a refusal of `staffRule` from `@elo/core`. */
export const staffRuleException = (why: StaffRuleRefusal): ApiHttpException =>
    EXCEPTIONS[why]();
