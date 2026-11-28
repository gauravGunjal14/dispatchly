require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const { redactSecrets } = require('../utils/redact');
const Booking = require('../models/Booking');
const TechnicianProfile = require('../models/TechnicianProfile');
const { processLocationUpdate } = require('../services/tracking/locationService');
const { calculateEta } = require('../services/tracking/etaService');
const { getRoute } = require('../services/tracking/routeService');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateHeading([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);

  return (toDeg(theta) + 360) % 360;
}

function parseSimArgs(argv = process.argv.slice(2)) {
  let bookingId = '';
  let speed = 1;

  for (const arg of argv) {
    if (arg.startsWith('--booking=')) {
      bookingId = arg.slice('--booking='.length).trim();
    } else if (arg.startsWith('--speed=')) {
      const parsed = Number(arg.slice('--speed='.length).trim());
      if ([1, 5, 10].includes(parsed)) speed = parsed;
    } else if (!arg.startsWith('--') && !bookingId) {
      bookingId = arg.trim();
    }
  }

  return { bookingId, speed };
}

/**
 * Samples evenly spaced waypoints along a GeoJSON LineString coordinate array.
 */
function sampleWaypoints(coords, maxSteps = 10) {
  if (!Array.isArray(coords) || coords.length <= 1) return coords || [];
  if (coords.length <= maxSteps) return coords;

  const sampled = [];
  for (let i = 0; i < maxSteps - 1; i++) {
    const idx = Math.floor((i * (coords.length - 1)) / (maxSteps - 1));
    sampled.push(coords[idx]);
  }
  sampled.push(coords[coords.length - 1]);
  return sampled;
}

async function simulate() {
  if (process.env.DEMO_MODE !== 'true') {
    console.error('[Simulation Blocked] Travel simulation is disabled when DEMO_MODE is not true.');
    process.exit(1);
  }

  const { bookingId: bookingIdArg, speed } = parseSimArgs();
  await connectDB();

  let booking;
  if (bookingIdArg) {
    booking = await Booking.findById(bookingIdArg).populate('assignedTechnician');
  } else {
    booking = await Booking.findOne({
      status: { $in: ['en_route', 'assigned'] },
      assignedTechnician: { $ne: null },
    }).populate('assignedTechnician');
  }

  if (!booking) {
    console.log('[Simulation] No active en_route or assigned booking found.');
    await disconnectDB();
    process.exit(0);
  }

  const techProfile = await TechnicianProfile.findById(booking.assignedTechnician);
  if (!techProfile) {
    console.error('[Simulation] Assigned technician profile not found');
    await disconnectDB();
    process.exit(1);
  }

  const destCoords = booking.location?.coordinates;
  const startCoords = techProfile.currentLocation?.coordinates || techProfile.serviceArea?.center?.coordinates;
  if (!startCoords || !destCoords) {
    console.error('[Simulation] Origin or destination coordinates missing on booking/technician.');
    await disconnectDB();
    process.exit(1);
  }

  const route = await getRoute({ origin: startCoords, destination: destCoords });
  const waypoints = sampleWaypoints(route.geometry?.coordinates || [startCoords, destCoords], 10);

  console.log('========================================================');
  console.log(`[Simulation] Moving along ${route.source.toUpperCase()} route for Booking #${booking.ticketNumber || booking._id.toString().slice(-6)}`);
  console.log(`Waypoints: ${waypoints.length} | Speed: ${speed}x | Distance: ${(route.distanceMeters / 1000).toFixed(2)} km`);
  console.log('========================================================\n');

  if (booking.status !== 'en_route') {
    booking.status = 'en_route';
    booking.enRouteAt = new Date();
    await booking.save();
    console.log('[Simulation] Booking transitioned to en_route');
  }

  // Respect 3s minimum throttle interval in locationService
  const stepDelayMs = Math.max(3100, Math.round(10000 / speed));

  for (let i = 0; i < waypoints.length; i++) {
    const coordinates = waypoints[i];
    const prev = i > 0 ? waypoints[i - 1] : startCoords;
    const heading = calculateHeading(prev, coordinates);

    await processLocationUpdate({
      technicianProfileId: techProfile._id,
      coordinates,
      heading: Math.round(heading),
      speed: 35,
      timestamp: new Date().toISOString(),
    });

    const eta = await calculateEta(coordinates, destCoords);
    console.log(
      `[Step ${(i + 1).toString().padStart(2, ' ')}/${waypoints.length}] ` +
        `Pos: [${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}] | ` +
        `Heading: ${Math.round(heading)}° | ETA: ${eta.minutes} mins (${eta.distanceKm} km)`
    );

    if (i < waypoints.length - 1) {
      await sleep(stepDelayMs);
    }
  }

  booking.status = 'arrived';
  booking.arrivedAt = new Date();
  await booking.save();
  console.log('\n[Simulation] Technician arrived at destination. Booking updated to "arrived".\n');

  await disconnectDB();
  process.exit(0);
}

if (require.main === module) {
  simulate().catch(async (err) => {
    console.error('[Simulation Error]', redactSecrets(err));
    await disconnectDB();
    process.exit(1);
  });
}

module.exports = {
  parseSimArgs,
  sampleWaypoints,
  calculateHeading,
};
