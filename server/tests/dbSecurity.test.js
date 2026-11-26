const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { redactSecrets, parseSafeDbTarget } = require('../src/utils/redact');

describe('DB Connection Logging & Credential Redaction Security', () => {
  const originalEnvUri = process.env.MONGODB_URI;

  afterEach(() => {
    if (originalEnvUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalEnvUri;
    }
    jest.restoreAllMocks();
  });

  it('never logs the password or full URI when connecting with a URI containing credentials', async () => {
    const fakeSecretPassword = 'SuperSecretTestPassword_998877';
    const fakeUri = `mongodb+srv://demo_user:${fakeSecretPassword}@cluster0.example.mongodb.net/dispatchly_test?retryWrites=true`;
    process.env.MONGODB_URI = fakeUri;

    const capturedLogs = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => capturedLogs.push(args.join(' ')));
    jest.spyOn(console, 'warn').mockImplementation((...args) => capturedLogs.push(args.join(' ')));
    jest.spyOn(console, 'error').mockImplementation((...args) => capturedLogs.push(args.join(' ')));

    // Simulate MongoDB driver throwing an error that includes the full URI with password
    jest
      .spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error(`querySrv ENOTFOUND ${fakeUri}`));

    await connectDB();

    const combinedOutput = capturedLogs.join('\n');
    expect(combinedOutput).toContain('cluster0.example.mongodb.net');
    expect(combinedOutput).toContain('dispatchly_test');
    expect(combinedOutput).not.toContain(fakeSecretPassword);
    expect(combinedOutput).not.toContain('demo_user:');
    expect(combinedOutput).toContain('***@');
  });

  it('redacts user:password@ from arbitrary error strings and parses safe DB target', () => {
    const leaked = 'MongoServerSelectionError: connection failed for mongodb+srv://alice:myS3cret!@prod.db.net/app';
    const redacted = redactSecrets(leaked);
    expect(redacted).not.toContain('alice');
    expect(redacted).not.toContain('myS3cret!');
    expect(redacted).toContain('mongodb+srv://***@prod.db.net/app');

    expect(parseSafeDbTarget('mongodb+srv://alice:myS3cret!@prod.db.net/app?w=majority')).toEqual({
      host: 'prod.db.net',
      database: 'app',
    });
  });
});
