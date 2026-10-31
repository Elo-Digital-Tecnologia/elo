export const GRACE_DAYS = 7;

export const AccessState = {
  Active: 'active',
  Grace: 'grace',
  Suspended: 'suspended',
} as const;
export type AccessState = (typeof AccessState)[keyof typeof AccessState];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado de acesso do restaurante. `dueDate` é o vencimento; até `GRACE_DAYS`
 * dias depois o sistema funciona com aviso; após isso, suspenso.
 * `manuallySuspended` tem precedência.
 */
export function accessState(
  dueDate: Date,
  now: Date = new Date(),
  manuallySuspended = false,
): AccessState {
  if (manuallySuspended) return AccessState.Suspended;
  const overdueMs = now.getTime() - dueDate.getTime();
  if (overdueMs <= 0) return AccessState.Active;
  return overdueMs <= GRACE_DAYS * DAY_MS ? AccessState.Grace : AccessState.Suspended;
}

/**
 * End of the free trial while it still runs, else null. The trial ends at the first
 * due date set when the restaurant was created (or when the Elo team ended it early).
 */
export function trialEndsAt(initialDueDate: Date, now: Date = new Date()): Date | null {
  return initialDueDate.getTime() > now.getTime() ? initialDueDate : null;
}
