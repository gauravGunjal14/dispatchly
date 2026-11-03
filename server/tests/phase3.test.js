const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const User = require('../src/models/User');
const PlatformSettings = require('../src/models/PlatformSettings');
const ServiceCatalog = require('../src/models/ServiceCatalog');
const Booking = require('../src/models/Booking');
const { generateTokens } = require('../src/config/jwt');
const { calculateEstimate, calculateHaversineDistanceKm } = require('../src/services/booking/pricingEstimator');
const { extractBookingRequirements } = require('../src/services/booking/requirementAnalyzer');
const { canTransition, validateTransition } = require('../src/services/booking/stateMachine');

describe('Phase 3 Unit & Integration Tests', () => {
  jest.setTimeout(25000);
  let adminToken, customer1Token, customer2Token, techToken;
  let customer1User, customer2User, techUser;
  let activeService, inactiveService, quotationService, deliveryService;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dispatchly_test';
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
      } catch {
        console.warn('[Phase 3 Test] MongoDB not connected, skipping DB integration tests');
      }
    }

    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /p3.*@dispatchly\.com/ });
      await ServiceCatalog.deleteMany({ code: /TEST_/ });
      await Booking.deleteMany({ idempotencyKey: /test_idemp/ });

      // Users
      const admin = await User.create({
        name: 'Admin P3',
        email: 'p3.admin@dispatchly.com',
        passwordHash: 'password123',
        role: 'admin',
      });
      adminToken = generateTokens(admin).accessToken;

      customer1User = await User.create({
        name: 'Cust1 P3',
        email: 'p3.cust1@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
      });
      customer1Token = generateTokens(customer1User).accessToken;

      customer2User = await User.create({
        name: 'Cust2 P3',
        email: 'p3.cust2@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
      });
      customer2Token = generateTokens(customer2User).accessToken;

      techUser = await User.create({
        name: 'Tech P3',
        email: 'p3.tech@dispatchly.com',
        passwordHash: 'password123',
        role: 'technician',
      });
      techToken = generateTokens(techUser).accessToken;

      // Services
      activeService = await ServiceCatalog.create({
        category: 'plumbing',
        name: 'Active Leak Repair',
        code: 'TEST_PLUMB_LEAK',
        description: 'Test active leak repair description',
        pricingType: 'fixed',
        basePrice: 100,
        estimatedDurationMin: 60,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair', 'copper_soldering'],
          requiredParts: [{ partCode: 'COPPER_12', name: 'Fitting', quantity: 2 }],
        },
      });

      inactiveService = await ServiceCatalog.create({
        category: 'plumbing',
        name: 'Seasonal Winter Service',
        code: 'TEST_PLUMB_INACTIVE',
        description: 'Test inactive service',
        pricingType: 'fixed',
        basePrice: 150,
        isActive: false,
      });

      quotationService = await ServiceCatalog.create({
        category: 'hvac',
        name: 'Custom HVAC Overhaul',
        code: 'TEST_HVAC_QUOTE',
        description: 'Test quotation service',
        pricingType: 'quotation',
        basePrice: 0,
        isActive: true,
      });

      deliveryService = await ServiceCatalog.create({
        category: 'delivery',
        name: 'Express Parts Courier',
        code: 'TEST_DELIV_EXPRESS',
        description: 'Test delivery service',
        pricingType: 'fixed',
        basePrice: 40,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['van', 'pickup'],
          minPackageCapacityKg: 50,
        },
      });
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /p3.*@dispatchly\.com/ });
      await ServiceCatalog.deleteMany({ code: /TEST_/ });
      await Booking.deleteMany({ idempotencyKey: /test_idemp/ });
      await mongoose.disconnect();
    }
  });

  // 1. Pure Pricing Estimator Tests
  describe('1. Pricing Estimator Service (Pure function)', () => {
    const dummySettings = {
      currency: 'USD',
      pricingConfig: {
        urgentSurchargePercentage: 20,
        deliveryPricePerKm: 1.5,
      },
    };

    it('should compute standard fixed price for normal priority', () => {
      const estimate = calculateEstimate({
        service: { pricingType: 'fixed', basePrice: 100, category: 'plumbing' },
        priority: 'normal',
        platformSettings: dummySettings,
      });
      expect(estimate.baseAmount).toBe(100);
      expect(estimate.estimatedMin).toBe(100);
      expect(estimate.estimatedMax).toBe(100);
      expect(estimate.urgentSurcharge).toBe(0);
      expect(estimate.quotationRequired).toBe(false);
    });

    it('should apply 20% urgent surcharge for urgent priority', () => {
      const estimate = calculateEstimate({
        service: { pricingType: 'fixed', basePrice: 100, category: 'plumbing' },
        priority: 'urgent',
        platformSettings: dummySettings,
      });
      expect(estimate.urgentSurcharge).toBe(20);
      expect(estimate.baseAmount).toBe(120);
    });

    it('should compute price range for range-type service', () => {
      const estimate = calculateEstimate({
        service: { pricingType: 'range', minPrice: 80, maxPrice: 160, basePrice: 120, category: 'hvac' },
        priority: 'normal',
        platformSettings: dummySettings,
      });
      expect(estimate.estimatedMin).toBe(80);
      expect(estimate.estimatedMax).toBe(160);
      expect(estimate.type).toBe('range');
    });

    it('should flag quotationRequired for quotation-based services', () => {
      const estimate = calculateEstimate({
        service: { pricingType: 'quotation', category: 'hvac' },
        priority: 'normal',
        platformSettings: dummySettings,
      });
      expect(estimate.quotationRequired).toBe(true);
      expect(estimate.estimatedMin).toBe(0);
    });

    it('should calculate distance fee for delivery services', () => {
      const coordSF1 = [-122.4194, 37.7749]; // SF downtown
      const coordSF2 = [-122.3994, 37.7849]; // approx 2 km away
      const dist = calculateHaversineDistanceKm(coordSF1, coordSF2);
      expect(dist).toBeGreaterThan(1);
      expect(dist).toBeLessThan(5);

      const estimate = calculateEstimate({
        service: { pricingType: 'fixed', basePrice: 40, category: 'delivery' },
        priority: 'normal',
        pickupLocation: { coordinates: coordSF1 },
        dropoffLocation: { coordinates: coordSF2 },
        platformSettings: dummySettings,
      });
      expect(estimate.distanceKm).toBe(dist);
      expect(estimate.baseAmount).toBeCloseTo(40 + dist * 1.5, 1);
    });
  });

  // 2. Requirement Analysis Service Tests
  describe('2. Requirement Analysis Service (Pure function)', () => {
    it('should extract normalized requirements for Phase 4 engine', () => {
      const dummyBooking = {
        _id: '507f1f77bcf86cd799439011',
        ticketNumber: 'BK-TEST-001',
        category: 'plumbing',
        priority: 'urgent',
        location: { coordinates: [-122.4194, 37.7749] },
        requirementSnapshot: {
          requiredSkills: ['pipe_repair'],
          requiredParts: [{ partCode: 'COPPER_12', name: 'Fitting', quantity: 2 }],
          estimatedDurationMin: 60,
        },
      };

      const reqs = extractBookingRequirements(dummyBooking);
      expect(reqs.category).toBe('plumbing');
      expect(reqs.priority).toBe('urgent');
      expect(reqs.requiredSkills).toEqual(['pipe_repair']);
      expect(reqs.requiredParts).toEqual([{ partCode: 'COPPER_12', name: 'Fitting', quantity: 2 }]);
      expect(reqs.serviceCoordinates).toEqual([-122.4194, 37.7749]);
    });
  });

  // 3. State Machine Transitions Tests
  describe('3. Booking State Machine Transitions', () => {
    it('should allow valid transitions', () => {
      expect(canTransition('draft', 'searching')).toBe(true);
      expect(canTransition('searching', 'offered')).toBe(true);
      expect(canTransition('offered', 'assigned')).toBe(true);
      expect(canTransition('assigned', 'en_route')).toBe(true);
      expect(canTransition('en_route', 'arrived')).toBe(true);
      expect(canTransition('arrived', 'in_progress')).toBe(true);
      expect(canTransition('in_progress', 'completed')).toBe(true);
      expect(canTransition('searching', 'cancelled')).toBe(true);
    });

    it('should reject invalid transitions and throw error in validateTransition', () => {
      expect(canTransition('completed', 'searching')).toBe(false);
      expect(canTransition('cancelled', 'assigned')).toBe(false);
      expect(canTransition('draft', 'completed')).toBe(false);

      expect(() => validateTransition('completed', 'searching')).toThrow();
    });
  });

  // 4. Booking Creation & Idempotency Integration Tests
  describe('4. Booking Creation & Idempotency', () => {
    it('should reject booking an inactive service with 400', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          serviceId: inactiveService._id.toString(),
          description: 'Try to book inactive seasonal service',
          contactPhone: '+1 415-555-0101',
          location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
            address: 'Market St, SF',
          },
          idempotencyKey: 'test_idemp_inactive_01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SERVICE_INACTIVE');
    });

    it('should create booking and return original booking when duplicate idempotency key is submitted', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const bookingPayload = {
        serviceId: activeService._id.toString(),
        description: 'Urgent pipe leak under kitchen sink',
        priority: 'urgent',
        contactPhone: '+1 415-555-0101',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749],
          address: '750 Market Street, San Francisco, CA',
        },
        idempotencyKey: 'test_idemp_duplicate_check_01',
      };

      // First submit
      const res1 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send(bookingPayload);

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.booking.status).toBe('searching');
      const firstBookingId = res1.body.data.booking._id;

      // Duplicate submit with same idempotency key
      const res2 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send(bookingPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.booking._id).toBe(firstBookingId);
      expect(res2.body.idempotent).toBe(true);
    });

    it('should reject technician from creating bookings with 403', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          serviceId: activeService._id.toString(),
          description: 'Technician attempt to book',
          contactPhone: '+1 415-555-9999',
          location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          idempotencyKey: 'test_idemp_tech_block_01',
        });

      expect(res.status).toBe(403);
    });
  });

  // 5. Booking Ownership & Cancellation Checks
  describe('5. Ownership & Cancellation Access Controls', () => {
    let cust1Booking;

    beforeAll(async () => {
      if (mongoose.connection.readyState !== 0) {
        cust1Booking = await Booking.create({
          ticketNumber: 'BK-TEST-OWN-01',
          customer: customer1User._id,
          service: activeService._id,
          category: 'plumbing',
          description: 'Customer 1 private booking',
          contactPhone: '+1 415-555-0101',
          location: { type: 'Point', coordinates: [-122.4194, 37.7749], address: 'Market St' },
          idempotencyKey: 'test_idemp_own_01',
          status: 'searching',
        });
      }
    });

    it('should prevent Customer 2 from accessing Customer 1 booking detail with 404/403', async () => {
      if (mongoose.connection.readyState !== 1 || !cust1Booking) return;

      const res = await request(app)
        .get(`/api/bookings/${cust1Booking._id}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(404);
    });

    it('should allow Customer 1 to cancel their own searching booking', async () => {
      if (mongoose.connection.readyState !== 1 || !cust1Booking) return;

      const res = await request(app)
        .post(`/api/bookings/${cust1Booking._id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Issue resolved without technician' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('cancelled');
      expect(res.body.data.booking.cancellationReason).toBe('Issue resolved without technician');
    });
  });

  // 6. Platform Settings Weights Validation
  describe('6. Platform Settings Weights Validation', () => {
    it('should reject dispatch weights that do not sum to 100 with 400', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dispatchWeights: {
            sla: 40,
            location: 40,
            skills: 10,
            workload: 10,
            inventory: 10,
            reliability: 10, // Sum = 120 (Invalid)
          },
        });

      expect(res.status).toBe(400);
      const errString = JSON.stringify(res.body.error);
      expect(errString).toContain('100');
    });

    it('should accept valid weights summing to 100', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dispatchWeights: {
            sla: 30,
            location: 25,
            skills: 15,
            workload: 10,
            inventory: 10,
            reliability: 10, // Sum = 100 (Valid)
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.dispatchWeights.sla).toBe(30);
    });
  });
});
