import { loadEnv, productionProblems } from './env';

const base = {
  DATABASE_URL: 'postgres://localhost/elo',
  JWT_SECRET: 'j'.repeat(64),
  SUPERADMIN_KEY: 's'.repeat(64),
  PUBLIC_BASE_URL: 'https://elo.example.com',
  CORS_ORIGINS: 'https://elo.example.com',
};

describe('production environment check', () => {
  it('accepts https addresses and long secrets', () => {
    expect(productionProblems(base)).toEqual([]);
    const env = loadEnv({ ...base, NODE_ENV: 'production', PORT: '8080' });
    expect(env.API_PORT).toBe(8080);
    expect(env.API_DOCS).toBe(false);
    expect(loadEnv({ ...base, NODE_ENV: 'production', API_DOCS: 'true' }).API_DOCS).toBe(true);
  });

  it('refuses plain http, a missing origin list and short secrets', () => {
    const problems = productionProblems({
      ...base,
      PUBLIC_BASE_URL: 'http://elo.example.com',
      CORS_ORIGINS: 'https://elo.example.com, http://localhost:3000',
      JWT_SECRET: 'x'.repeat(20),
    });
    expect(problems).toHaveLength(3);
    expect(productionProblems({ ...base, CORS_ORIGINS: '' })).toHaveLength(1);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', SUPERADMIN_KEY: 'k'.repeat(24) })).toThrow(/SUPERADMIN_KEY/);
  });

  it('keeps development permissive, with the docs on', () => {
    const env = loadEnv({ ...base, PUBLIC_BASE_URL: 'http://localhost:3000', JWT_SECRET: 'j'.repeat(16), SUPERADMIN_KEY: 's'.repeat(24) });
    expect(env.API_DOCS).toBe(true);
    expect(env.API_PORT).toBe(3001);
  });
});
