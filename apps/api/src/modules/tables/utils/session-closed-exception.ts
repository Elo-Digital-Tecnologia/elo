import type { ApiHttpException } from '#/common/exceptions/api.exception.js';
import type { SessionClosedReason } from '../types/session-closed-reason.type.js';
import { SessionClosedException } from '../exceptions/session-closed.exception.js';
import { SessionRejectedException } from '../exceptions/session-rejected.exception.js';
import { SessionTakenOverException } from '../exceptions/session-taken-over.exception.js';

const EXCEPTIONS: Record<SessionClosedReason, () => ApiHttpException> = {
    closed: () => new SessionClosedException(),
    rejected: () => new SessionRejectedException(),
    taken_over: () => new SessionTakenOverException()
};

/** Each reason has its own code, so the guest is told what happened instead of just "ended". */
export const sessionClosedException = (
    reason: SessionClosedReason | null
): ApiHttpException => EXCEPTIONS[reason ?? 'closed']();
