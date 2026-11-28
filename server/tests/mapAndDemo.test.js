const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const { getRoute, clearRouteCache } = require('../src/services/tracking/routeService');
const { filterCandidates } = require('../src/services/dispatch/eligibilityFilter');
const { parseSimArgs, sampleWaypoints } = require('../src/scripts/simulateTechMovement');
const { parseActivityArgs, assertNoExistingActivity } = require('../src/scripts/seedDemoActivity');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const { generateTokens } = require('../src/config/jwt');

describe('MapLibre Routing, Demo Simulation, Freshness Flag & Activity Seed Guards', () => {
  const originalFetch = global.fetch;
  const originalDemoMode = process.env.DEMO_MODE;
  const originalFreshLoc = process.env.DEMO_FRESH_LOCATIONS;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.DEMO_MODE = originalDemoMode;
    process.env.DEMO_FRESH_LOCATIONS = originalFreshLoc;
    clearRouteCache();
    jest.restoreAllMocks();
  });

  describe('1. Route Service (OSRM + Timeout Fallback + Cache)', () => {
    it('returns OSRM route geometry, distance, duration, and source="osrm" on success', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 4250.4,
              duration: 612.8,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [72.8479, 19.1197],
                  [72.8390, 19.1280],
                  [72.8295, 19.1364],
                ],
              },
            },
          ],
        }),
      });

      const route = await getRoute({
        origin: [72.8479, 19.1197],
        destination: [72.8295, 19.1364],
      });

      expect(route.source).toBe('osrm');
      expect(route.distanceMeters).toBe(4250);
      expect(route.durationSeconds).toBe(613);
      expect(route.geometry.type).toBe('LineString');
      expect(route.geometry.coordinates.length).toBe(3);

      // Second call with identical coords uses in-memory cache (fetch not called again)
      const cached = await getRoute({
        origin: [72.8479, 19.1197],
        destination: [72.8295, 19.1364],
      });
      expect(cached).toEqual(route);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries once and falls back to Haversine straight-line estimate when OSRM times out or fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Request aborted due to timeout'));

      const route = await getRoute({
        origin: [72.8479, 19.1197],
        destination: [72.8362, 19.0596],
      });

      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
      expect(route.source).toBe('estimate');
      expect(route.geometry.type).toBe('LineString');
      expect(route.geometry.coordinates).toEqual([
        [72.8479, 19.1197],
        [72.8362, 19.0596],
      ]);
      expect(route.distanceMeters).toBeGreaterThan(5000);
      expect(route.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe('2. Route Endpoint Authorization (GET /api/bookings/:id/route)', () => {
    it('denies access (403) to a user who is neither the customer, assigned technician, nor admin', async () => {
      const bookingId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const strangerId = new mongoose.Types.ObjectId();

      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: strangerId,
        role: 'customer',
        isActive: true,
        tokenVersion: 0,
      });

      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          _id: bookingId,
          customer: ownerId,
          assignedTechnician: { user: new mongoose.Types.ObjectId() },
          location: { coordinates: [72.8295, 19.1364] },
        }),
      });

      const { accessToken } = generateTokens({ _id: strangerId, role: 'customer', tokenVersion: 0 });

      const res = await request(app)
        .get(`/api/bookings/${bookingId}/route`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Simulation Guard (DEMO_MODE=false)', () => {
    it('blocks POST /api/technicians/jobs/:bookingId/simulate-travel when DEMO_MODE is false', async () => {
      process.env.DEMO_MODE = 'false';
      const techUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: techUserId,
        role: 'technician',
        isActive: true,
        tokenVersion: 0,
      });
      const { accessToken } = generateTokens({ _id: techUserId, role: 'technician', tokenVersion: 0 });

      const res = await request(app)
        .post(`/api/technicians/jobs/${bookingId}/simulate-travel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ coordinates: [72.8479, 19.1197] });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DEMO_MODE_DISABLED');
    });

    it('parses CLI --booking and --speed flags and samples route waypoints', () => {
      expect(parseSimArgs(['--booking=abc123', '--speed=10'])).toEqual({
        bookingId: 'abc123',
        speed: 10,
      });
      const sampled = sampleWaypoints(
        [
          [72.81, 19.01],
          [72.82, 19.02],
          [72.83, 19.03],
          [72.84, 19.04],
          [72.85, 19.05],
        ],
        3
      );
      expect(sampled.length).toBe(3);
      expect(sampled[0]).toEqual([72.81, 19.01]);
      expect(sampled[2]).toEqual([72.85, 19.05]);
    });
  });

  describe('4. DEMO_FRESH_LOCATIONS Eligibility Flag', () => {
    const staleDate = new Date(Date.now() - 120 * 60 * 1000); // 2 hours old
    const baseBooking = {
      _id: new mongoose.Types.ObjectId(),
      category: 'plumbing',
      location: { coordinates: [72.8479, 19.1197] },
      requirementSnapshot: { requiredSkills: ['pipe_repair'], requiredParts: [] },
      dispatch: { excludedTechnicians: [] },
    };
    const settings = {
      maxCandidateRadiusKm: 25,
      locationStaleMinutes: 10,
      workloadMaxActiveJobs: 3,
    };

    const onlineApprovedTech = {
      _id: new mongoose.Types.ObjectId(),
      verificationStatus: 'approved',
      isAvailable: true,
      serviceCategories: ['plumbing'],
      skills: ['pipe_repair'],
      serviceArea: { center: { coordinates: [72.8479, 19.1197] }, radiusKm: 10 },
      currentLocation: { coordinates: [72.8479, 19.1197], updatedAt: staleDate },
      activeJobCount: 0,
    };

    it('rejects stale technician when DEMO_FRESH_LOCATIONS is false', async () => {
      process.env.DEMO_FRESH_LOCATIONS = 'false';
      const { eligible, rejected } = await filterCandidates([onlineApprovedTech], baseBooking, settings);
      expect(eligible.length).toBe(0);
      expect(rejected[0].code).toBe('LOCATION_STALE');
    });

    it('treats online, approved technician as fresh when DEMO_FRESH_LOCATIONS=true while keeping other rules', async () => {
      process.env.DEMO_FRESH_LOCATIONS = 'true';
      const offlineTech = {
        ...onlineApprovedTech,
        _id: new mongoose.Types.ObjectId(),
        isAvailable: false,
      };
      const { eligible, rejected } = await filterCandidates(
        [onlineApprovedTech, offlineTech],
        baseBooking,
        settings
      );
      expect(eligible.length).toBe(1);
      expect(eligible[0]._id).toEqual(onlineApprovedTech._id);
      expect(rejected[0].code).toBe('UNAVAILABLE');
    });
  });

  describe('5. Activity Seed Safety Guards', () => {
    it('requires --confirm and --db and refuses existing activity without --force', () => {
      expect(() => parseActivityArgs(['--db=dispatchly_demo'])).toThrow(/--confirm/i);
      expect(() => parseActivityArgs(['--confirm'])).toThrow(/--db=/i);
      expect(parseActivityArgs(['--confirm', '--db=dispatchly_demo', '--force'])).toEqual({
        hasConfirm: true,
        dbName: 'dispatchly_demo',
        hasForce: true,
      });
      expect(() => assertNoExistingActivity(5, false)).toThrow(/--force/i);
      expect(() => assertNoExistingActivity(5, true)).not.toThrow();
    });
  });
});
