require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Booking = require('../models/Booking');
const TechnicianProfile = require('../models/TechnicianProfile');
const { processLocationUpdate } = require('../services/tracking/locationService');
const { calculateEta } = require('../services/tracking/etaService');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calculate bearing between two [lng, lat] points in degrees
function calculateHeading([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
}

async function simulate() {
  await connectDB();
  console.log('[Simulation] Connected to MongoDB');

  const bookingIdArg = process.argv[2];
  let booking;

  if (bookingIdArg) {
    booking = await Booking.findById(bookingIdArg).populate('assignedTechnician');
  } else {
    // Find any booking that is en_route or assigned
    booking = await Booking.findOne({
      status: { $in: ['en_route', 'assigned'] },
      assignedTechnician: { $ne: null },
    }).populate('assignedTechnician');
  }

  if (!booking) {
    console.log('[Simulation] No active en_route or assigned booking found.');
    console.log('[Simulation] Tip: Run `npm run seed` first or pass a booking ID: `node simulateTechMovement.js <bookingId>`');
    process.exit(0);
  }

  const techProfile = await TechnicianProfile.findById(booking.assignedTechnician);
  if (!techProfile) {
    console.error('[Simulation] Assigned technician profile not found');
    process.exit(1);
  }

  const destCoords = booking.location?.coordinates || [-122.4194, 37.7749];
  const startCoords = techProfile.currentLocation?.coordinates || [-122.435, 37.765];

  console.log('========================================================');
  console.log(`[Simulation] Simulating Technician Movement for Booking #${booking.ticketNumber || booking._id.toString().slice(-6)}`);
  console.log(`Technician Profile ID: ${techProfile._id}`);
  console.log(`Origin:      [${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}]`);
  console.log(`Destination: [${destCoords[0].toFixed(4)}, ${destCoords[1].toFixed(4)}]`);
  console.log('========================================================\n');

  // Transition booking to en_route if not already
  if (booking.status !== 'en_route') {
    booking.status = 'en_route';
    booking.enRouteAt = new Date();
    await booking.save();
    console.log('[Simulation] Booking transitioned to en_route');
  }

  const TOTAL_STEPS = 10;
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const fraction = i / TOTAL_STEPS;
    const currentLng = startCoords[0] + (destCoords[0] - startCoords[0]) * fraction;
    const currentLat = startCoords[1] + (destCoords[1] - startCoords[1]) * fraction;
    const coordinates = [currentLng, currentLat];

    const heading = calculateHeading(startCoords, destCoords);
    const speed = 35 + Math.random() * 5; // ~35-40 km/h

    // Process update through real location service (with throttling & socket broadcast)
    await processLocationUpdate({
      technicianProfileId: techProfile._id,
      coordinates,
      heading: Math.round(heading),
      speed: Math.round(speed),
      timestamp: new Date().toISOString(),
    });

    const eta = await calculateEta(coordinates, destCoords);

    console.log(
      `[Step ${i.toString().padStart(2, ' ')}/${TOTAL_STEPS}] ` +
      `Pos: [${currentLng.toFixed(4)}, ${currentLat.toFixed(4)}] | ` +
      `Speed: ${speed.toFixed(1)} km/h | Heading: ${heading.toFixed(0)}° | ` +
      `ETA: ${eta.minutes} mins (${eta.distanceKm} km)`
    );

    if (i < TOTAL_STEPS) {
      await sleep(2000); // 2 second delay between ticks
    }
  }

  console.log('\n[Simulation] Technician arrived at customer destination!');
  booking.status = 'arrived';
  booking.arrivedAt = new Date();
  await booking.save();
  console.log('[Simulation] Booking updated to "arrived". Simulation complete.\n');

  process.exit(0);
}

simulate().catch((err) => {
  console.error('[Simulation Error]', err);
  process.exit(1);
});
