import { isAllowedOrigin } from './cors';

describe('isAllowedOrigin', () => {
  const dev = { CORS_ORIGINS: 'https://app.exemplo.com' };
  const prod = { ...dev, NODE_ENV: 'production' };

  it('allows listed origins always', () => {
    expect(isAllowedOrigin('https://app.exemplo.com', prod)).toBe(true);
  });
  it('allows LAN origins outside production', () => {
    expect(isAllowedOrigin('http://192.168.0.19:3000', dev)).toBe(true);
    expect(isAllowedOrigin('http://10.1.2.3:3002', dev)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3003', dev)).toBe(true);
  });
  it('blocks LAN origins in production and public origins anywhere', () => {
    expect(isAllowedOrigin('http://192.168.0.19:3000', prod)).toBe(false);
    expect(isAllowedOrigin('https://evil.example', dev)).toBe(false);
    expect(isAllowedOrigin('http://192.168.0.19.evil.com', dev)).toBe(false);
  });
});
