const {
  validateEnvironment,
  parseResetArgs,
  validateSeedPasswords,
  assertDatabaseMatch,
} = require('../src/scripts/resetDemo');

describe('Demo Reset Script Safety Guards', () => {
  const validEnv = {
    NODE_ENV: 'development',
    SEED_ADMIN_PASSWORD: 'valid_admin_password_123',
    SEED_CUSTOMER_PASSWORD: 'valid_customer_password_123',
    SEED_TECH_PASSWORD: 'valid_tech_password_123',
  };

  it('refuses to run when NODE_ENV=production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(/NODE_ENV=production/i);
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('requires --confirm flag', () => {
    expect(() => parseResetArgs(['--db=dispatchly_demo'])).toThrow(/--confirm/i);
  });

  it('requires --db=<databaseName> flag', () => {
    expect(() => parseResetArgs(['--confirm'])).toThrow(/--db=/i);
    expect(() => parseResetArgs(['--confirm', '--db='])).toThrow(/--db=/i);
  });

  it('parses valid --confirm and --db flags', () => {
    const parsed = parseResetArgs(['--confirm', '--db=dispatchly_demo']);
    expect(parsed).toEqual({ hasConfirm: true, dbName: 'dispatchly_demo' });
  });

  it('rejects when --db name does not match connected database', () => {
    expect(() => assertDatabaseMatch('dispatchly_demo', 'dispatchly_prod')).toThrow(/does not match/i);
    expect(() => assertDatabaseMatch('dispatchly_demo', '')).toThrow(/does not match/i);
    expect(() => assertDatabaseMatch('dispatchly_demo', 'dispatchly_demo')).not.toThrow();
  });

  it('rejects missing or short (<12 chars) password env vars', () => {
    expect(() =>
      validateSeedPasswords({
        ...validEnv,
        SEED_ADMIN_PASSWORD: '',
      })
    ).toThrow(/SEED_ADMIN_PASSWORD/);

    expect(() =>
      validateSeedPasswords({
        ...validEnv,
        SEED_CUSTOMER_PASSWORD: 'short_pass',
      })
    ).toThrow(/SEED_CUSTOMER_PASSWORD/);

    expect(() =>
      validateSeedPasswords({
        ...validEnv,
        SEED_TECH_PASSWORD: '11_char_pwd',
      })
    ).toThrow(/SEED_TECH_PASSWORD/);

    expect(() => validateSeedPasswords(validEnv)).not.toThrow();
  });
});
