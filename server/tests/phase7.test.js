const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../src/server');
const kpiService = require('../src/services/kpi/kpiService');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const AuditLog = require('../src/models/AuditLog');
const PlatformFee = require('../src/models/PlatformFee');
const Payment = require('../src/models/Payment');

const generateTestToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET || 'default_access_secret_12345',
    { expiresIn: '1h' }
  );
};

describe('Phase 7: Admin Dashboard, KPI Engine, Reports & Operations Management', () => {
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  let isDbConnected = false;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 1) {
      isDbConnected = true;
    } else {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        isDbConnected = true;
      } catch {
        isDbConnected = false;
      }
    }

    if (isDbConnected) {
      adminUser = await User.findOne({ email: 'admin@dispatchly.com' });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'Operations Dispatcher',
          email: 'admin@dispatchly.com',
          passwordHash: 'password123',
          role: 'admin',
        });
      }
      adminToken = generateTestToken(adminUser);

      customerUser = await User.findOne({ email: 'customer@dispatchly.com' });
      if (!customerUser) {
        customerUser = await User.create({
          name: 'Alice Customer',
          email: 'customer@dispatchly.com',
          passwordHash: 'password123',
          role: 'customer',
        });
      }
      customerToken = generateTestToken(customerUser);
    }
  });

  describe('7.1 Formula Injection Neutralization in CSV Reports', () => {
    it('escapes cells starting with formula trigger symbols (=, +, -, @)', () => {
      expect(kpiService.escapeCsvCell('=CMD|/C calc!A0')).toBe(`"'=CMD|/C calc!A0"`);
      expect(kpiService.escapeCsvCell('+12345')).toBe(`"'+12345"`);
      expect(kpiService.escapeCsvCell('-SUM(A1:A10)')).toBe(`"'-SUM(A1:A10)"`);
      expect(kpiService.escapeCsvCell('@SUM(B1:B10)')).toBe(`"'@SUM(B1:B10)"`);
      expect(kpiService.escapeCsvCell('Standard Text')).toBe('Standard Text');
      expect(kpiService.escapeCsvCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(kpiService.escapeCsvCell(null)).toBe('');
    });
  });

  describe('7.2 KPI Aggregation Engine', () => {
    it('computes KPI summary and previous-period trend comparison gracefully', async () => {
      if (!isDbConnected) return;

      const summary = await kpiService.getKpiSummary({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      });

      expect(summary).toBeDefined();
      expect(summary.current).toBeDefined();
      expect(summary.previous).toBeDefined();
      expect(summary.trends).toBeDefined();
      expect(typeof summary.current.dispatchSuccessRate).toBe('number');
      expect(typeof summary.current.slaComplianceRate).toBe('number');
      expect(typeof summary.current.platformRevenue).toBe('number');
    });

    it('computes daily time-series and category breakdown', async () => {
      if (!isDbConnected) return;

      const timeseries = await kpiService.getTimeseries({
        from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      });

      expect(timeseries).toBeDefined();
      expect(Array.isArray(timeseries.series)).toBe(true);
      expect(Array.isArray(timeseries.categoryBreakdown)).toBe(true);
    });
  });

  describe('7.3 Admin Endpoints Security & Access Matrix', () => {
    it('rejects unauthenticated access to /api/admin/kpis with 401', async () => {
      const res = await request(app).get('/api/admin/kpis');
      expect(res.status).toBe(401);
    });

    it('rejects customer role access to /api/admin/kpis with 403', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/kpis')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('allows admin access to /api/admin/kpis with 200', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/kpis')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.current).toBeDefined();
    });

    it('returns operations panel snapshot at /api/admin/operations/panel', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/operations/panel')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeByState).toBeDefined();
      expect(res.body.data.queues).toBeDefined();
    });

    it('downloads CSV report safely at /api/admin/reports/:type', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/reports/bookings')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Booking ID');
    });
  });

  describe('7.4 User Lifecycle & Session Invalidation', () => {
    it('lists paginated users and filters by role', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/users?role=customer')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('deactivates a user, increments tokenVersion and records AuditLog', async () => {
      if (!isDbConnected) return;
      // Create temporary test user
      const tempUser = await User.create({
        name: 'Bad Actor Test',
        email: `badactor_${Date.now()}@test.com`,
        passwordHash: 'password123',
        role: 'customer',
      });

      const initialTokenVersion = tempUser.tokenVersion || 0;

      const res = await request(app)
        .put(`/api/admin/users/${tempUser._id}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false, reason: 'Fraudulent activity detected' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.isActive).toBe(false);

      const updated = await User.findById(tempUser._id);
      expect(updated.isActive).toBe(false);
      expect(updated.tokenVersion).toBe(initialTokenVersion + 1);

      // Verify AuditLog entry
      const audit = await AuditLog.findOne({
        targetEntity: 'User',
        entityId: tempUser._id,
        action: 'user_deactivated',
      });
      expect(audit).toBeDefined();
      expect(audit.details.reason).toBe('Fraudulent activity detected');

      // Cleanup
      await User.findByIdAndDelete(tempUser._id);
      await AuditLog.deleteMany({ entityId: tempUser._id });
    });
  });

  describe('7.5 Financial Ledger & Audit Trail Views', () => {
    it('lists payments ledger at /api/admin/payments/ledger', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/payments/ledger')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(Array.isArray(res.body.data.payments)).toBe(true);
    });

    it('lists audit logs with entity filters at /api/admin/audit-logs', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/audit-logs?entity=User')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
    });
  });
});
