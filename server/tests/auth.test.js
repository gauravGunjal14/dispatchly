const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const User = require('../src/models/User');

describe('Auth & API Scaffolding Tests (Phase 1)', () => {
  beforeAll(async () => {
    // Connect to test database or memory DB
    const testUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/dispatchly_test';
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
      }
    } catch {
      console.warn('[Test DB] MongoDB not reachable, skipping live DB writes in test');
    }
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        if (mongoose.connection.db) {
          await mongoose.connection.db.dropDatabase().catch(() => {});
        }
        await mongoose.disconnect();
      }
    } catch {
      // ignore
    }
  });

  it('GET /api/health should return 200 OK and status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('dispatchly-server');
  });

  it('GET /api/auth/me should reject request without token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/register should validate request payload format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
