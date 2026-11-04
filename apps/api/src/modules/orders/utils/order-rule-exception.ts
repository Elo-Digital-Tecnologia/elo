import type { OrderRuleRefusal } from '@elo/core/orders/cancellation-rules';
import type { ApiHttpException } from '#/common/exceptions/api.exception.js';
import { AlreadyClosedException } from '../exceptions/already-closed.exception.js';
import { NotReadyException } from '../exceptions/not-ready.exception.js';
import { NotYourTableException } from '../exceptions/not-your-table.exception.js';
import { PreparationStartedException } from '../exceptions/preparation-started.exception.js';
import { RoleNotAllowedException } from '../exceptions/role-not-allowed.exception.js';
import { UseReturnException } from '../exceptions/use-return.exception.js';

const EXCEPTIONS: Record<OrderRuleRefusal, () => ApiHttpException> = {
    already_closed: () => new AlreadyClosedException(),
    use_return: () => new UseReturnException(),
    preparation_started: () => new PreparationStartedException(),
    not_your_table: () => new NotYourTableException(),
    role_not_allowed: () => new RoleNotAllowedException(),
    not_ready: () => new NotReadyException()
};

/** The exception for a refusal of the cancellation and return rules from `@elo/core`. */
export const orderRuleException = (why: OrderRuleRefusal): ApiHttpException =>
    EXCEPTIONS[why]();
