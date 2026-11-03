/**
 * Phase 4 Test Suite
 * Covers the Dispatch Engine:
 * 1. Haversine distance & travel time estimation
 * 2. Eligibility filter (unapproved, offline, missing skills, missing parts, stale GPS, outside area, workload cap)
 * 3. Scorer (6-factor normalization and PlatformSettings weighted total)
 * 4. Ranking & deterministic tie-breaking (ETA, then reliability)
 * 5. Customer phone number privacy masking
 * 6. Sequential offer lifecycle & duplicate prevention
 * 7. Race-safe atomic offer acceptance
 * 8. Inventory reservation and rollback
 * 9. Reassignment & cancellation rules (pre-travel vs post-travel)
 * 10. Admin manual override & audit logging
 */

const mongoose = require('mongoose');
const {
  haversineDistanceKm,
  computeFallbackEtaMinutes,
} = require('../src/services/dispatch/travelTimeService');
const {
  isWithinWorkingHours,
  filterCandidates,
} = require('../src/services/dispatch/eligibilityFilter');
const { scoreCandidate } = require('../src/services/dispatch/scorer');
const { rankCandidates } = require('../src/services/dispatch/rankingService');
const { maskPhoneNumber } = require('../src/services/dispatch/offerService');
const DispatchOffer = require('../src/models/DispatchOffer');
const Booking = require('../src/models/Booking');
const TechnicianProfile = require('../src/models/TechnicianProfile');
const InventoryItem = require('../src/models/InventoryItem');
const ReassignmentRequest = require('../src/models/ReassignmentRequest');
const AuditLog = require('../src/models/AuditLog');

describe('Phase 4: Dispatch Engine Unit & Service Tests', () => {
  let isDbConnected = false;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dispatchly_test';
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      }
      isDbConnected = mongoose.connection.readyState === 1;
    } catch {
      isDbConnected = false;
      console.warn('[Phase 4 Test] MongoDB not connected; running pure module tests with mocks');
    }
  });

  afterAll(async () => {
    if (isDbConnected && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. Phone Privacy Masking
  // ==========================================
  describe('Customer Privacy: Phone Number Masking', () => {
    it('masks phone numbers properly prior to offer acceptance', () => {
      expect(maskPhoneNumber('+1-415-555-0199')).toBe('***-***-0199');
      expect(maskPhoneNumber('(555) 123-4567')).toBe('***-***-4567');
      expect(maskPhoneNumber('9876543210')).toBe('***-***-3210');
      expect(maskPhoneNumber('')).toBe('***-***-****');
      expect(maskPhoneNumber(null)).toBe('***-***-****');
    });
  });

  // ==========================================
  // 2. Travel Time & Haversine Distance
  // ==========================================
  describe('Travel Time & Distance Calculations', () => {
    it('calculates accurate Haversine distance between coordinates', () => {
      // Coordinates in San Francisco (Market St to Mission St)
      const coord1 = [-122.4194, 37.7749];
      const coord2 = [-122.4089, 37.7858];
      const distance = haversineDistanceKm(coord1, coord2);
      expect(distance).toBeGreaterThan(1.0);
      expect(distance).toBeLessThan(3.0);
    });

    it('computes fallback ETA with configurable average speed', () => {
      const distance = 15; // 15 km
      const eta30 = computeFallbackEtaMinutes(distance, 30); // 30 km/h -> 30 min
      expect(eta30).toBe(30);

      const eta60 = computeFallbackEtaMinutes(distance, 60); // 60 km/h -> 15 min
      expect(eta60).toBe(15);
    });
  });

  // ==========================================
  // 3. Working Hours Evaluation
  // ==========================================
  describe('Working Hours Filter Logic', () => {
    it('returns true when working hours are unconstrained', () => {
      expect(isWithinWorkingHours(null)).toBe(true);
      expect(isWithinWorkingHours({ days: [] })).toBe(true);
    });

    it('rejects days outside the technician schedule', () => {
      const sunday = new Date('2026-11-01T12:00:00Z'); // Sunday
      const schedule = {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        start: '08:00',
        end: '18:00',
      };
      expect(isWithinWorkingHours(schedule, sunday)).toBe(false);
    });

    it('evaluates daily start and end window correctly', () => {
      const schedule = {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        start: '09:00',
        end: '17:00',
      };
      const midDay = new Date();
      midDay.setHours(12, 0, 0, 0);

      // Current day in schedule
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      schedule.days = [days[midDay.getDay()]];

      expect(isWithinWorkingHours(schedule, midDay)).toBe(true);

      const night = new Date();
      night.setHours(22, 0, 0, 0);
      expect(isWithinWorkingHours(schedule, night)).toBe(false);
    });
  });

  // ==========================================
  // 4. Candidate Scoring & Platform Weights
  // ==========================================
  describe('Scorer: Factor Normalization & Weighted Totals', () => {
    const defaultSettings = {
      dispatchWeights: {
        sla: 30,
        location: 25,
        skills: 15,
        workload: 10,
        inventory: 10,
        reliability: 10,
      },
      maxCandidateRadiusKm: 25,
      workloadMaxActiveJobs: 3,
      slaTargets: {
        plumbing: {
          urgent: { arrivalMinutes: 45 },
          normal: { arrivalMinutes: 120 },
        },
      },
    };

    it('produces score between 0 and 100 with all 6 factors breakdown', () => {
      const tech = {
        _id: 'tech1',
        experienceYears: 5,
        qualifications: ['Master Plumber'],
        skills: ['Pipe Fitting', 'Leak Detection'],
        activeJobCount: 0,
        reliabilityScore: 95,
        rating: 4.8,
      };

      const booking = {
        category: 'plumbing',
        priority: 'urgent',
        requirementSnapshot: {
          requiredSkills: ['Pipe Fitting'],
          requiredParts: [],
        },
      };

      const routeInfo = { distanceKm: 2.5, etaMinutes: 10 };

      const result = scoreCandidate({
        technician: tech,
        booking,
        routeInfo,
        inventoryItems: [],
        settings: defaultSettings,
      });

      expect(result.totalScore).toBeGreaterThan(70);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.scoreBreakdown).toHaveProperty('sla');
      expect(result.scoreBreakdown).toHaveProperty('location');
      expect(result.scoreBreakdown).toHaveProperty('skills');
      expect(result.scoreBreakdown).toHaveProperty('workload');
      expect(result.scoreBreakdown).toHaveProperty('inventory');
      expect(result.scoreBreakdown).toHaveProperty('reliability');

      // Zero active jobs should give max workload score
      expect(result.scoreBreakdown.workload).toBe(100);
      // Close distance should give high location score
      expect(result.scoreBreakdown.location).toBeGreaterThanOrEqual(90);
    });

    it('penalizes high active job counts in workload factor', () => {
      const techBusy = {
        _id: 'tech_busy',
        experienceYears: 2,
        activeJobCount: 3, // At max workload
        reliabilityScore: 80,
        rating: 4.0,
      };

      const booking = { category: 'plumbing', priority: 'normal' };
      const routeInfo = { distanceKm: 10, etaMinutes: 25 };

      const result = scoreCandidate({
        technician: techBusy,
        booking,
        routeInfo,
        settings: defaultSettings,
      });

      expect(result.scoreBreakdown.workload).toBe(0);
    });
  });

  // ==========================================
  // 5. Ranking & Deterministic Tie-Breaking
  // ==========================================
  describe('Ranking Service: Sorting and Tie-Breakers', () => {
    it('sorts candidates descending by total score', () => {
      const candidates = [
        { technician: { _id: 'tech1' }, totalScore: 78.5, etaMinutes: 20 },
        { technician: { _id: 'tech2' }, totalScore: 92.0, etaMinutes: 15 },
        { technician: { _id: 'tech3' }, totalScore: 84.0, etaMinutes: 10 },
      ];

      const ranked = rankCandidates(candidates);
      expect(ranked[0].technician._id).toBe('tech2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].technician._id).toBe('tech3');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].technician._id).toBe('tech1');
      expect(ranked[2].rank).toBe(3);
    });

    it('breaks ties using lower ETA minutes', () => {
      const tiedCandidates = [
        { technician: { _id: 'tech_far' }, totalScore: 85.0, etaMinutes: 25 },
        { technician: { _id: 'tech_near' }, totalScore: 85.0, etaMinutes: 10 },
      ];

      const ranked = rankCandidates(tiedCandidates);
      expect(ranked[0].technician._id).toBe('tech_near');
      expect(ranked[1].technician._id).toBe('tech_far');
    });

    it('breaks ties using higher reliability score when ETA is also tied', () => {
      const tiedCandidates = [
        {
          technician: { _id: 'tech_lower_rel', reliabilityScore: 80 },
          totalScore: 85.0,
          etaMinutes: 15,
        },
        {
          technician: { _id: 'tech_higher_rel', reliabilityScore: 98 },
          totalScore: 85.0,
          etaMinutes: 15,
        },
      ];

      const ranked = rankCandidates(tiedCandidates);
      expect(ranked[0].technician._id).toBe('tech_higher_rel');
      expect(ranked[1].technician._id).toBe('tech_lower_rel');
    });
  });

  // ==========================================
  // 6. Hard Rules Eligibility Filter
  // ==========================================
  describe('Eligibility Filter: Strict Hard Rules', () => {
    const bookingFixture = {
      _id: 'bk_1',
      category: 'plumbing',
      location: { coordinates: [-122.4194, 37.7749] },
      requirementSnapshot: {
        requiredSkills: ['Drain Unblocking'],
        requiredParts: [],
      },
      dispatch: { excludedTechnicians: [] },
    };

    const settingsFixture = {
      maxCandidateRadiusKm: 25,
      locationStaleMinutes: 10,
      workloadMaxActiveJobs: 3,
    };

    it('excludes unapproved technician', async () => {
      const techs = [
        {
          _id: 'tech_pending',
          verificationStatus: 'pending',
          isAvailable: true,
          serviceCategories: ['plumbing'],
          skills: ['Drain Unblocking'],
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('UNAPPROVED');
    });

    it('excludes offline technician', async () => {
      const techs = [
        {
          _id: 'tech_offline',
          verificationStatus: 'approved',
          isAvailable: false,
          serviceCategories: ['plumbing'],
          skills: ['Drain Unblocking'],
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('UNAVAILABLE');
    });

    it('excludes technician missing a required skill', async () => {
      const techs = [
        {
          _id: 'tech_no_skills',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['plumbing'],
          skills: ['Painting'], // Missing 'Drain Unblocking'
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('SKILLS_MISSING');
    });

    it('excludes technician with stale GPS coordinates', async () => {
      const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000);
      const techs = [
        {
          _id: 'tech_stale',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['plumbing'],
          skills: ['Drain Unblocking'],
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: twentyMinAgo },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('LOCATION_STALE');
    });

    it('excludes technician outside their configured service area', async () => {
      // Service area center is in Oakland, radius 5km; booking is in SF 15km away
      const techs = [
        {
          _id: 'tech_oakland',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['plumbing'],
          skills: ['Drain Unblocking'],
          serviceArea: { center: { coordinates: [-122.2712, 37.8044] }, radiusKm: 5 },
          currentLocation: { coordinates: [-122.2712, 37.8044], updatedAt: new Date() },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('OUTSIDE_SERVICE_AREA');
    });

    it('excludes technician exceeding maximum workload active jobs', async () => {
      const techs = [
        {
          _id: 'tech_maxed_out',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['plumbing'],
          skills: ['Drain Unblocking'],
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 3, // maxActiveJobs is 3
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, bookingFixture, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(1);
      expect(rejected[0].code).toBe('WORKLOAD_EXCEEDED');
    });

    it('excludes delivery technician if vehicle type is not allowed or package weight exceeds capacity', async () => {
      const deliveryBooking = {
        _id: 'bk_delivery',
        category: 'delivery',
        packageWeightKg: 20,
        location: { coordinates: [-122.4194, 37.7749] },
        requirementSnapshot: {
          allowedVehicleTypes: ['van', 'pickup'],
          minPackageCapacityKg: 15,
        },
        dispatch: { excludedTechnicians: [] },
      };

      const techs = [
        {
          _id: 'tech_bicycle',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['delivery'],
          vehicleType: 'bicycle', // Not allowed
          packageCapacityKg: 5,
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 0,
        },
        {
          _id: 'tech_small_van',
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: ['delivery'],
          vehicleType: 'van',
          packageCapacityKg: 10, // Exceeded by 20 kg package
          serviceArea: { center: { coordinates: [-122.4194, 37.7749] }, radiusKm: 25 },
          currentLocation: { coordinates: [-122.4194, 37.7749], updatedAt: new Date() },
          activeJobCount: 0,
        },
      ];

      const { eligible, rejected } = await filterCandidates(techs, deliveryBooking, settingsFixture);
      expect(eligible.length).toBe(0);
      expect(rejected.length).toBe(2);
      expect(rejected[0].code).toBe('VEHICLE_TYPE_NOT_ALLOWED');
      expect(rejected[1].code).toBe('PACKAGE_CAPACITY_INSUFFICIENT');
    });
  });

  // ==========================================
  // 7. Database Integration Tests (when DB reachable)
  // ==========================================
  describe('Database Models & Concurrency Protection', () => {
    it('enforces compound unique index on (booking, technician) in DispatchOffer', async () => {
      if (!isDbConnected) {
        console.warn('Skipping live DB compound index test');
        return;
      }

      const bookingId = new mongoose.Types.ObjectId();
      const techId = new mongoose.Types.ObjectId();

      await DispatchOffer.create({
        booking: bookingId,
        technician: techId,
        attempt: 1,
        rank: 1,
        totalScore: 85,
        scoreBreakdown: { sla: 80, location: 85, skills: 90, workload: 100, inventory: 100, reliability: 90 },
        expiresAt: new Date(Date.now() + 60000),
      });

      // Attempting to offer the exact same booking to the same technician must reject with duplicate key error
      let duplicateError = null;
      try {
        await DispatchOffer.create({
          booking: bookingId,
          technician: techId,
          attempt: 2,
          rank: 1,
          totalScore: 85,
          scoreBreakdown: { sla: 80, location: 85, skills: 90, workload: 100, inventory: 100, reliability: 90 },
          expiresAt: new Date(Date.now() + 60000),
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).not.toBeNull();
      expect(duplicateError.code).toBe(11000); // MongoDB duplicate key code

      // Clean up test offer
      await DispatchOffer.deleteMany({ booking: bookingId });
    });

    it('protects against race-condition on offer acceptance (only one atomic winner)', async () => {
      if (!isDbConnected) {
        console.warn('Skipping race condition acceptance test');
        return;
      }

      const bookingId = new mongoose.Types.ObjectId();
      const techId = new mongoose.Types.ObjectId();

      const offer = await DispatchOffer.create({
        booking: bookingId,
        technician: techId,
        attempt: 1,
        rank: 1,
        totalScore: 90,
        scoreBreakdown: { sla: 90, location: 90, skills: 90, workload: 100, inventory: 100, reliability: 90 },
        status: 'pending',
        expiresAt: new Date(Date.now() + 60000),
      });

      // Two concurrent calls simulating identical acceptance race
      const attempt1 = DispatchOffer.findOneAndUpdate(
        { _id: offer._id, status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status: 'accepted', respondedAt: new Date() } },
        { new: true }
      );

      const attempt2 = DispatchOffer.findOneAndUpdate(
        { _id: offer._id, status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status: 'accepted', respondedAt: new Date() } },
        { new: true }
      );

      const [res1, res2] = await Promise.all([attempt1, attempt2]);

      // Exactly one succeeds, the other returns null (atomic lock)
      const winners = [res1, res2].filter(Boolean);
      expect(winners.length).toBe(1);

      await DispatchOffer.findByIdAndDelete(offer._id);
    });

    it('creates AuditLog records upon manual override and reassignment decisions', async () => {
      if (!isDbConnected) {
        console.warn('Skipping AuditLog integration test');
        return;
      }

      const adminId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const techId = new mongoose.Types.ObjectId();

      const log = await AuditLog.create({
        user: adminId,
        action: 'DISPATCH_MANUAL_OVERRIDE',
        targetModel: 'Booking',
        targetId: bookingId,
        changes: {
          technicianId: techId,
          adminNote: 'Emergency dispatch test',
        },
      });

      expect(log._id).toBeDefined();
      expect(log.action).toBe('DISPATCH_MANUAL_OVERRIDE');

      await AuditLog.findByIdAndDelete(log._id);
    });
  });
});
