const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const User = require('../src/models/User');
const TechnicianProfile = require('../src/models/TechnicianProfile');
const TechnicianDocument = require('../src/models/TechnicianDocument');
const InventoryItem = require('../src/models/InventoryItem');
const { generateTokens } = require('../src/config/jwt');

describe('Phase 2 Business Rules & Technician Operations Tests', () => {
  jest.setTimeout(30000);
  let adminUser, adminToken;
  let customerUser, customerToken;
  let approvedTechUser, approvedTechToken, approvedTechProfile;
  let pendingTechUser, pendingTechToken, pendingTechProfile;
  let sampleDoc;

  beforeAll(async () => {
    // Ensure Mongoose is connected
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatchly';
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 1000 });
      } catch {
        console.warn('[Phase 2 Test] Skipping DB operations if MongoDB is not reachable');
      }
    }

    if (mongoose.connection.readyState === 1) {
      // Clean up test collections
      await User.deleteMany({ email: /test.*@dispatchly\.com/ });
      await TechnicianProfile.deleteMany({});
      await TechnicianDocument.deleteMany({});
      await InventoryItem.deleteMany({});

      // 1. Create Admin
      adminUser = await User.create({
        name: 'Test Admin',
        email: 'test.admin@dispatchly.com',
        passwordHash: 'password123',
        role: 'admin',
      });
      adminToken = generateTokens(adminUser).accessToken;

      // 2. Create Customer
      customerUser = await User.create({
        name: 'Test Customer',
        email: 'test.cust@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
      });
      customerToken = generateTokens(customerUser).accessToken;

      // 3. Create Approved Technician
      approvedTechUser = await User.create({
        name: 'Test Approved Tech',
        email: 'test.approved@dispatchly.com',
        passwordHash: 'password123',
        role: 'technician',
      });
      approvedTechToken = generateTokens(approvedTechUser).accessToken;
      approvedTechProfile = await TechnicianProfile.create({
        user: approvedTechUser._id,
        serviceCategories: ['plumbing'],
        verificationStatus: 'approved',
        isAvailable: false,
      });

      // 4. Create Pending Technician
      pendingTechUser = await User.create({
        name: 'Test Pending Tech',
        email: 'test.pending@dispatchly.com',
        passwordHash: 'password123',
        role: 'technician',
      });
      pendingTechToken = generateTokens(pendingTechUser).accessToken;
      pendingTechProfile = await TechnicianProfile.create({
        user: pendingTechUser._id,
        serviceCategories: ['plumbing'],
        verificationStatus: 'pending',
        isAvailable: false,
      });

      // 5. Create Document belonging to approved technician
      sampleDoc = await TechnicianDocument.create({
        technician: approvedTechProfile._id,
        docType: 'trade_license',
        filePath: 'documents/test_doc.pdf',
        originalName: 'license.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /test.*@dispatchly\.com/ });
      await TechnicianProfile.deleteMany({});
      await TechnicianDocument.deleteMany({});
      await InventoryItem.deleteMany({});
      await mongoose.disconnect();
    }
  });

  describe('Rule 1: Availability Toggle Restrictions (only approved can go online)', () => {
    it('should reject pending technician from setting isAvailable = true with 403', async () => {
      if (mongoose.connection.readyState === 0) return;

      const res = await request(app)
        .put('/api/technicians/me/availability')
        .set('Authorization', `Bearer ${pendingTechToken}`)
        .send({ isAvailable: true });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VERIFICATION_REQUIRED');
    });

    it('should allow approved technician to set isAvailable = true', async () => {
      if (mongoose.connection.readyState === 0) return;

      const res = await request(app)
        .put('/api/technicians/me/availability')
        .set('Authorization', `Bearer ${approvedTechToken}`)
        .send({ isAvailable: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAvailable).toBe(true);
    });
  });

  describe('Rule 2: Inventory Constraints Validation', () => {
    it('should enforce quantity >= 0 and reservedQuantity <= quantity in Zod validation', async () => {
      if (mongoose.connection.readyState === 0) return;

      // Negative quantity
      const negRes = await request(app)
        .post('/api/technicians/me/inventory')
        .set('Authorization', `Bearer ${approvedTechToken}`)
        .send({
          name: 'Pipe',
          category: 'Plumbing',
          partCode: 'PIPE_TEST_NEG',
          quantity: -5,
        });
      expect(negRes.status).toBe(400);

      // reservedQuantity > quantity
      const overReservedRes = await request(app)
        .post('/api/technicians/me/inventory')
        .set('Authorization', `Bearer ${approvedTechToken}`)
        .send({
          name: 'Pipe',
          category: 'Plumbing',
          partCode: 'PIPE_TEST_OVER',
          quantity: 10,
          reservedQuantity: 15,
        });
      expect(overReservedRes.status).toBe(400);
      expect(JSON.stringify(overReservedRes.body.error)).toContain('Reserved quantity cannot exceed total stock quantity');
    });

    it('should enforce unique partCode per technician', async () => {
      if (mongoose.connection.readyState === 0) return;

      const itemPayload = {
        name: 'Fitting 1/2',
        category: 'Plumbing',
        partCode: 'FIT_HALF_INCH',
        quantity: 20,
        reservedQuantity: 0,
        unitCost: 5,
      };

      const res1 = await request(app)
        .post('/api/technicians/me/inventory')
        .set('Authorization', `Bearer ${approvedTechToken}`)
        .send(itemPayload);
      expect(res1.status).toBe(201);

      // Attempt duplicate part code for same tech
      const res2 = await request(app)
        .post('/api/technicians/me/inventory')
        .set('Authorization', `Bearer ${approvedTechToken}`)
        .send(itemPayload);
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('DUPLICATE_PART_CODE');
    });
  });

  describe('Rule 3: Document Ownership & Access Controls', () => {
    it('should reject unauthorized customer from downloading technician document with 403', async () => {
      if (mongoose.connection.readyState === 0) return;

      const res = await request(app)
        .get(`/api/technicians/documents/${sampleDoc._id}/download`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Customer role is not in ['technician', 'admin']
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject another technician from downloading someone else’s document with 403', async () => {
      if (mongoose.connection.readyState === 0) return;

      const res = await request(app)
        .get(`/api/technicians/documents/${sampleDoc._id}/download`)
        .set('Authorization', `Bearer ${pendingTechToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Rule 4: Admin-Only Verification Routes', () => {
    it('should reject customer and technician from accessing /api/admin/technicians with 403', async () => {
      if (mongoose.connection.readyState === 0) return;

      const custRes = await request(app)
        .get('/api/admin/technicians')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(custRes.status).toBe(403);

      const techRes = await request(app)
        .get('/api/admin/technicians')
        .set('Authorization', `Bearer ${approvedTechToken}`);
      expect(techRes.status).toBe(403);
    });

    it('should allow admin to list technicians and approve/reject with reason', async () => {
      if (mongoose.connection.readyState === 0) return;

      const listRes = await request(app)
        .get('/api/admin/technicians')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data.technicians)).toBe(true);

      // Verify rejection requires reason
      const badRejectRes = await request(app)
        .put(`/api/admin/technicians/${pendingTechProfile._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'rejected', rejectionReason: '' });
      expect(badRejectRes.status).toBe(400);

      // Valid approval
      const approveRes = await request(app)
        .put(`/api/admin/technicians/${pendingTechProfile._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approved' });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.profile.verificationStatus).toBe('approved');
    });
  });
});
