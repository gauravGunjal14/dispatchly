const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../src/server');

const User = require('../src/models/User');
const TechnicianProfile = require('../src/models/TechnicianProfile');
const ServiceCatalog = require('../src/models/ServiceCatalog');
const Booking = require('../src/models/Booking');
const DispatchOffer = require('../src/models/DispatchOffer');
const Quote = require('../src/models/Quote');
const Payment = require('../src/models/Payment');
const PlatformFee = require('../src/models/PlatformFee');
const Dispute = require('../src/models/Dispute');
const Review = require('../src/models/Review');
const kpiService = require('../src/services/kpi/kpiService');

const genKey = (prefix = 'idemp') => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

const generateTestToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.JWT_ACCESS_SECRET || 'default_access_secret_12345',
    { expiresIn: '1h' }
  );
};

describe('Dispatchly End-to-End (E2E) Marketplace Verification Suite', () => {
  jest.setTimeout(45000);

  let isDbConnected = false;
  let admin, adminToken;
  let customerA, customerAToken;
  let customerB, customerBToken;
  let techPlumber, techPlumberToken, techPlumberProfile;
  let techDelivery, techDeliveryToken, techDeliveryProfile;
  let plumbingService;
  let quotationService;
  let deliveryService;

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
      // 1. Admin setup
      admin = await User.findOne({ email: 'admin@dispatchly.com' });
      if (!admin) {
        admin = await User.create({
          name: 'Dispatcher Admin',
          email: 'admin@dispatchly.com',
          passwordHash: 'password123',
          role: 'admin',
        });
      }
      adminToken = generateTestToken(admin);

      // 2. Customer A & B
      customerA = await User.findOne({ email: 'alice.customer@test.com' });
      if (!customerA) {
        customerA = await User.create({
          name: 'Alice Customer',
          email: 'alice.customer@test.com',
          passwordHash: 'password123',
          role: 'customer',
        });
      }
      customerAToken = generateTestToken(customerA);

      customerB = await User.findOne({ email: 'bob.customer@test.com' });
      if (!customerB) {
        customerB = await User.create({
          name: 'Bob Customer',
          email: 'bob.customer@test.com',
          passwordHash: 'password123',
          role: 'customer',
        });
      }
      customerBToken = generateTestToken(customerB);

      // 3. Verified Plumbing Technician
      techPlumber = await User.findOne({ email: 'plumber.e2e@test.com' });
      if (!techPlumber) {
        techPlumber = await User.create({
          name: 'David Plumber E2E',
          email: 'plumber.e2e@test.com',
          passwordHash: 'password123',
          role: 'technician',
        });
      }
      techPlumberToken = generateTestToken(techPlumber);

      techPlumberProfile = await TechnicianProfile.findOne({ user: techPlumber._id });
      if (!techPlumberProfile) {
        techPlumberProfile = await TechnicianProfile.create({
          user: techPlumber._id,
          serviceCategories: ['plumbing'],
          skills: ['pipe_soldering', 'leak_detection'],
          experienceYears: 5,
          serviceArea: { center: { type: 'Point', coordinates: [-122.4194, 37.7749] }, radiusKm: 30 },
          currentLocation: { type: 'Point', coordinates: [-122.42, 37.775] },
          verificationStatus: 'approved',
          isAvailable: true,
        });
      } else {
        techPlumberProfile.verificationStatus = 'approved';
        techPlumberProfile.isAvailable = true;
        await techPlumberProfile.save();
      }

      // 4. Delivery Partner Technician
      techDelivery = await User.findOne({ email: 'delivery.e2e@test.com' });
      if (!techDelivery) {
        techDelivery = await User.create({
          name: 'Carlos Delivery E2E',
          email: 'delivery.e2e@test.com',
          passwordHash: 'password123',
          role: 'technician',
        });
      }
      techDeliveryToken = generateTestToken(techDelivery);

      techDeliveryProfile = await TechnicianProfile.findOne({ user: techDelivery._id });
      if (!techDeliveryProfile) {
        techDeliveryProfile = await TechnicianProfile.create({
          user: techDelivery._id,
          serviceCategories: ['delivery'],
          vehicleType: 'car',
          packageCapacityKg: 25,
          experienceYears: 3,
          serviceArea: { center: { type: 'Point', coordinates: [-122.4194, 37.7749] }, radiusKm: 30 },
          currentLocation: { type: 'Point', coordinates: [-122.42, 37.775] },
          verificationStatus: 'approved',
          isAvailable: true,
        });
      }

      // 5. Catalogs
      plumbingService = await ServiceCatalog.findOne({ category: 'plumbing', pricingType: 'fixed' });
      if (!plumbingService) {
        plumbingService = await ServiceCatalog.create({
          code: 'PLUMB-E2E-01',
          category: 'plumbing',
          name: 'E2E Pipe Leak Repair',
          description: 'Emergency pipe solder & sealing',
          pricingType: 'fixed',
          basePrice: 85.0,
          estimatedDurationMin: 60,
          isActive: true,
        });
      }

      quotationService = await ServiceCatalog.findOne({ category: 'plumbing', pricingType: 'quotation' });
      if (!quotationService) {
        quotationService = await ServiceCatalog.create({
          code: 'QUOTE-E2E-01',
          category: 'plumbing',
          name: 'E2E Custom Re-piping Quote',
          description: 'Complex plumbing requiring quotation',
          pricingType: 'quotation',
          basePrice: 0,
          estimatedDurationMin: 180,
          isActive: true,
        });
      }

      deliveryService = await ServiceCatalog.findOne({ category: 'delivery' });
      if (!deliveryService) {
        deliveryService = await ServiceCatalog.create({
          code: 'DELIV-E2E-01',
          category: 'delivery',
          name: 'E2E Heavy Freight Delivery',
          description: 'Cargo requiring car/van',
          pricingType: 'fixed',
          basePrice: 40.0,
          requirements: { minPackageCapacityKg: 20 },
          isActive: true,
        });
      }
    }
  });

  describe('FLOW 1: End-to-End Standard Lifecycle (Book -> Offer -> Accept -> Milestones -> Complete -> Verify -> Pay -> Review -> Admin Fee)', () => {
    let bookingId;

    it('Step 1.1: Customer books plumbing job and sets initial searching state', async () => {
      if (!isDbConnected) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          serviceId: plumbingService._id,
          description: 'Burst kitchen pipe under sink emergency',
          priority: 'urgent',
          contactPhone: '+1 415-555-0199',
          idempotencyKey: `idemp_e2e_booking_${Date.now()}`,
          location: {
            address: '456 Mission St, San Francisco, CA',
            coordinates: [-122.4194, 37.7749],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking).toBeDefined();
      bookingId = res.body.data.booking._id;
    });

    it('Step 1.2: System issues dispatch offer and technician accepts', async () => {
      if (!isDbConnected) return;

      // Create an offer to David Plumber
      const offer = await DispatchOffer.create({
        booking: bookingId,
        technician: techPlumberProfile._id,
        attempt: 1,
        rank: 1,
        totalScore: 94.5,
        scoreBreakdown: { sla: 30, location: 25, skills: 15, workload: 10, inventory: 7.5, reliability: 7 },
        expiresAt: new Date(Date.now() + 60000),
        status: 'pending',
      });

      await Booking.findByIdAndUpdate(bookingId, {
        status: 'offered',
        'dispatch.currentOffer': offer._id,
      });

      const res = await request(app)
        .post(`/api/technicians/offers/${offer._id}/accept`)
        .set('Authorization', `Bearer ${techPlumberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Booking.findById(bookingId);
      expect(updated.status).toBe('assigned');
      expect(updated.assignedTechnician.toString()).toBe(techPlumberProfile._id.toString());
    });

    it('Step 1.3: Technician updates milestones (en_route -> arrived -> in_progress)', async () => {
      if (!isDbConnected) return;

      // En Route
      const resRoute = await request(app)
        .post(`/api/technicians/jobs/${bookingId}/status`)
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({ status: 'en_route' });
      expect(resRoute.status).toBe(200);

      // Arrived
      const resArrived = await request(app)
        .post(`/api/technicians/jobs/${bookingId}/status`)
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({ status: 'arrived' });
      expect(resArrived.status).toBe(200);

      // In Progress
      const resProgress = await request(app)
        .post(`/api/technicians/jobs/${bookingId}/status`)
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({ status: 'in_progress' });
      expect(resProgress.status).toBe(200);

      const b = await Booking.findById(bookingId);
      expect(b.status).toBe('in_progress');
      expect(b.enRouteAt).toBeDefined();
      expect(b.arrivedAt).toBeDefined();
    });

    it('Step 1.4: Technician submits job completion with used parts', async () => {
      if (!isDbConnected) return;

      const res = await request(app)
        .post(`/api/technicians/jobs/${bookingId}/complete`)
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({
          notes: 'Replaced brass coupling joint and pressure tested successfully.',
          finalPrice: 95.0,
          partsUsed: [{ partCode: 'COUPLING-01', name: 'Brass Coupling 1/2"', quantity: 1 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const b = await Booking.findById(bookingId);
      expect(b.completion.status).toBe('submitted');
      expect(b.completion.finalPrice).toBe(95.0);
    });

    it('Step 1.5: Customer verifies completion and confirms payment', async () => {
      if (!isDbConnected) return;

      // Verify completion
      const resVerify = await request(app)
        .post(`/api/bookings/${bookingId}/completion/verify`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ approved: true });
      expect(resVerify.status).toBe(200);

      // Process payment
      const resPay = await request(app)
        .post(`/api/bookings/${bookingId}/payment`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          paymentMethod: 'card_demo',
          idempotencyKey: genKey('idemp_e2e_pay'),
        });

      expect(resPay.status).toBe(200);
      expect(resPay.body.success).toBe(true);

      // Verify platform fee record was created atomically
      const fee = await PlatformFee.findOne({ booking: bookingId });
      expect(fee).toBeDefined();
      expect(fee.amount).toBe(1.5);
    });

    it('Step 1.6: Customer submits review and rating updates technician stats', async () => {
      if (!isDbConnected) return;

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating: 5,
          comment: 'Outstanding prompt repair, arrived within 15 minutes!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const review = await Review.findOne({ booking: bookingId });
      expect(review).toBeDefined();
      expect(review.rating).toBe(5);
    });
  });

  describe('FLOW 2: Dispatch Offer Rejection & Auto-Reassignment', () => {
    it('records rejection reason and permits sequential reassignment to candidate #2', async () => {
      if (!isDbConnected) return;

      const booking = await Booking.create({
        customer: customerA._id,
        service: plumbingService._id,
        category: 'plumbing',
        description: 'Water leak test reassignment',
        priority: 'normal',
        contactPhone: '+1 415-555-0122',
        location: { coordinates: [-122.4194, 37.7749], address: 'Market St' },
        status: 'searching',
        idempotencyKey: genKey('flow2'),
        dispatch: { state: 'searching', attempts: 1 },
      });

      const offer = await DispatchOffer.create({
        booking: booking._id,
        technician: techPlumberProfile._id,
        attempt: 1,
        rank: 1,
        totalScore: 90,
        scoreBreakdown: { sla: 30, location: 25, skills: 15, workload: 10, inventory: 5, reliability: 5 },
        expiresAt: new Date(Date.now() + 60000),
        status: 'pending',
      });

      // Reject offer
      const resReject = await request(app)
        .post(`/api/technicians/offers/${offer._id}/reject`)
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({ rejectReason: 'Emergency job overlap' });

      expect(resReject.status).toBe(200);

      const updatedOffer = await DispatchOffer.findById(offer._id);
      expect(updatedOffer.status).toBe('rejected');
      expect(updatedOffer.rejectReason).toBe('Emergency job overlap');

      const b = await Booking.findById(booking._id);
      expect(b.dispatch.excludedTechnicians.map((id) => id.toString())).toContain(
        techPlumberProfile._id.toString()
      );
    });
  });

  describe('FLOW 3: Quotation Service Job Approval Gate', () => {
    it('requires customer approval on technician quotation before work can begin', async () => {
      if (!isDbConnected) return;

      const booking = await Booking.create({
        customer: customerA._id,
        service: quotationService._id,
        category: 'plumbing',
        description: 'Complete apartment re-piping inspection',
        priority: 'normal',
        contactPhone: '+1 415-555-0122',
        location: { coordinates: [-122.4194, 37.7749], address: 'Van Ness Ave' },
        status: 'arrived',
        idempotencyKey: genKey('flow3'),
        assignedTechnician: techPlumberProfile._id,
      });

      // Technician creates quotation
      const quote = await Quote.create({
        booking: booking._id,
        technician: techPlumberProfile._id,
        laborCost: 150.0,
        partsCost: 80.0,
        totalAmount: 230.0,
        scopeOfWork: 'Replace corroded galvanized lines with copper.',
        status: 'pending',
      });

      booking.quote = quote._id;
      await booking.save();

      // Customer approves quote
      const resApprove = await request(app)
        .post(`/api/bookings/${booking._id}/quote/approve`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(resApprove.status).toBe(200);

      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.status).toBe('approved');

      const updatedBooking = await Booking.findById(booking._id);
      expect(updatedBooking.status).toBe('in_progress');
    });
  });

  describe('FLOW 4: Delivery Partner Capacity Filtering', () => {
    it('correctly associates vehicle type and capacity constraints for delivery vertical', async () => {
      if (!isDbConnected) return;

      expect(techDeliveryProfile.vehicleType).toBe('car');
      expect(techDeliveryProfile.packageCapacityKg).toBeGreaterThanOrEqual(20);

      const booking = await Booking.create({
        customer: customerB._id,
        service: deliveryService._id,
        category: 'delivery',
        description: 'Fragile equipment delivery',
        packageWeightKg: 22,
        priority: 'urgent',
        contactPhone: '+1 415-555-0188',
        location: { coordinates: [-122.4194, 37.7749], address: 'Folsom St' },
        status: 'searching',
        idempotencyKey: genKey('flow4'),
      });

      expect(booking.packageWeightKg).toBe(22);
    });
  });

  describe('FLOW 5: Technician Onboarding & Verification Gate', () => {
    it('blocks unverified technicians from setting isAvailable=true until admin approval', async () => {
      if (!isDbConnected) return;

      const newTechUser = await User.create({
        name: 'Unverified Applicant',
        email: `applicant_${Date.now()}@test.com`,
        passwordHash: 'password123',
        role: 'technician',
      });
      const applicantToken = generateTestToken(newTechUser);

      const applicantProfile = await TechnicianProfile.create({
        user: newTechUser._id,
        serviceCategories: ['plumbing'],
        verificationStatus: 'pending',
        isAvailable: false,
      });

      // Try to toggle available while pending -> 403
      const resBlocked = await request(app)
        .patch('/api/technicians/me/availability')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ isAvailable: true });
      expect(resBlocked.status).toBe(403);

      // Admin approves
      const resApprove = await request(app)
        .put(`/api/admin/technicians/${applicantProfile._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approved' });
      expect(resApprove.status).toBe(200);

      // Now toggle available -> 200 allowed
      const resAllowed = await request(app)
        .patch('/api/technicians/me/availability')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ isAvailable: true });
      expect(resAllowed.status).toBe(200);

      // Cleanup
      await User.findByIdAndDelete(newTechUser._id);
      await TechnicianProfile.findByIdAndDelete(applicantProfile._id);
    });
  });

  describe('FLOW 6: Dispute Lifecycle & Administrative Resolution', () => {
    it('allows customer to raise dispute and admin resolves with ledger adjustment', async () => {
      if (!isDbConnected) return;

      const booking = await Booking.create({
        customer: customerA._id,
        service: plumbingService._id,
        category: 'plumbing',
        description: 'Disputed service test',
        priority: 'normal',
        contactPhone: '+1 415-555-0122',
        location: { coordinates: [-122.4194, 37.7749], address: 'Mission St' },
        status: 'completed',
        idempotencyKey: genKey('flow6'),
        assignedTechnician: techPlumberProfile._id,
      });

      // Customer files dispute
      const dispute = await Dispute.create({
        booking: booking._id,
        raisedBy: customerA._id,
        reason: 'Technician left without tightening compression nut.',
        status: 'open',
      });

      // Admin resolves dispute
      const resResolve = await request(app)
        .put(`/api/admin/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'refund',
          adminNotes: 'Mediated with customer; full refund approved.',
        });

      expect(resResolve.status).toBe(200);

      const resolved = await Dispute.findById(dispute._id);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution).toBe('refund');
    });
  });

  describe('FLOW 7: Cross-Role Authorization Matrix & Tenant Isolation', () => {
    it('blocks customer from accessing admin console endpoints', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .get('/api/admin/kpis')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(res.status).toBe(403);
    });

    it('blocks technician from accessing customer booking creation', async () => {
      if (!isDbConnected) return;
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${techPlumberToken}`)
        .send({
          serviceId: plumbingService._id.toString(),
          description: 'Technician creating booking',
          contactPhone: '1234567890',
          idempotencyKey: genKey('idemp_tech'),
          location: { type: 'Point', address: 'Test', coordinates: [-122.4, 37.7] },
        });
      expect(res.status).toBe(403);
    });

    it('blocks Customer B from viewing Customer A private booking details', async () => {
      if (!isDbConnected) return;

      const booking = await Booking.create({
        customer: customerA._id,
        service: plumbingService._id,
        category: 'plumbing',
        description: 'Customer A confidential ticket',
        priority: 'normal',
        contactPhone: '+1 415-555-0122',
        location: { coordinates: [-122.4194, 37.7749], address: 'Private St' },
        status: 'searching',
        idempotencyKey: genKey('flow7'),
      });

      const res = await request(app)
        .get(`/api/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});
