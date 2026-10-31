import { FIELD_RULES as R, fieldError, fieldMessage, moneyError } from './fields';

const check = (rule: keyof typeof R, v: unknown) => R[rule].check(v);

describe('field rules', () => {
  it('trims, collapses spaces and refuses blank text', () => {
    expect(check('personName', '  Ana   Souza ')).toEqual({ ok: true, value: 'Ana Souza' });
    expect(check('personName', '   ')).toEqual({ ok: false, error: { code: 'required' } });
    expect(check('reason', '   a')).toEqual({ ok: false, error: { code: 'too_short', params: { min: 3 } } });
    expect(check('description', '  ')).toEqual({ ok: true, value: null });
  });
  it('gives one specific reason per field', () => {
    expect(fieldError(R.personName, 'Ana 123')).toEqual({ code: 'invalid_name' });
    expect(fieldError(R.username, 'Ana.Lima')).toBeNull();
    expect(check('username', 'Ana.Lima')).toEqual({ ok: true, value: 'ana.lima' });
    expect(fieldError(R.username, 'ana lima')).toEqual({ code: 'invalid_username' });
    expect(fieldError(R.username, 'an')).toEqual({ code: 'too_short', params: { min: 3 } });
    expect(fieldError(R.password, 'curta')).toEqual({ code: 'too_short', params: { min: 8 } });
    expect(check('password', ' com espaço ')).toEqual({ ok: true, value: ' com espaço ' });
    expect(fieldError(R.tableName, 'x'.repeat(41))).toEqual({ code: 'too_long', params: { max: 40 } });
    expect(fieldError(R.slug, 'Casa Verde')).toEqual({ code: 'invalid_slug' });
  });
  it('normalizes phones, contacts and instagram, and says what is wrong', () => {
    expect(check('phone', '11912345678')).toEqual({ ok: true, value: '(11) 91234-5678' });
    expect(fieldError(R.phone, '1234')).toEqual({ code: 'invalid_phone' });
    expect(check('contact', 'Rita@Exemplo.com')).toEqual({ ok: true, value: 'rita@exemplo.com' });
    expect(fieldError(R.contact, 'rita@')).toEqual({ code: 'invalid_contact' });
    expect(check('instagram', '@Casa.Verde')).toEqual({ ok: true, value: 'casa.verde' });
    expect(fieldError(R.imageUrl, 'javascript:alert(1)')).toEqual({ code: 'invalid_url' });
    expect(fieldError(R.imageUrl, '/api/media/0b3c1d2e-1111-4222-8333-944455556666.webp')).toBeNull();
  });
  it('bounds numbers and money', () => {
    expect(fieldError(R.priceCents, 1_000_001)).toEqual({ code: 'too_large', params: { max: 1_000_000, money: true } });
    expect(fieldError(R.priceCents, 10.5)).toEqual({ code: 'invalid_money' });
    expect(fieldError(R.adjustmentCents, 0)).toEqual({ code: 'not_zero' });
    expect(fieldError(R.position, -1)).toEqual({ code: 'too_small', params: { min: 0, money: undefined } });
    expect(moneyError(R.priceCents, '39,90')).toBeNull();
    expect(moneyError(R.priceCents, '39,9x')).toEqual({ code: 'invalid_money' });
    expect(moneyError(R.adjustmentCents, '-5')).toBeNull();
    expect(moneyError(R.priceCents, '')).toEqual({ code: 'required' });
  });
  it('writes the message in Portuguese', () => {
    expect(fieldMessage({ code: 'too_long', params: { max: 40 } })).toBe('Use no máximo 40 caracteres.');
    expect(fieldMessage({ code: 'too_large', params: { max: 1_000_000, money: true } })).toMatch(/^O máximo é R\$\s?10\.000,00\.$/);
  });
});
