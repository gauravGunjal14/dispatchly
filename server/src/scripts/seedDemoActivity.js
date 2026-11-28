require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { redactSecrets } = require('../utils/redact');
const {
  validateEnvironment,
  parseResetArgs,
  assertDatabaseMatch,
} = require('./resetDemo');

const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const ServiceCatalog = require('../models/ServiceCatalog');
const PlatformSettings = require('../models/PlatformSettings');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const PlatformFee = require('../models/PlatformFee');
const Payout = require('../models/Payout');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');

function parseActivityArgs(argv = process.argv.slice(2)) {
  const { hasConfirm, dbName } = parseResetArgs(argv);
  const hasForce = argv.includes('--force');
  return { hasConfirm, dbName, hasForce };
}

function assertNoExistingActivity(existingBookingCount, hasForce) {
  if (existingBookingCount > 0 && !hasForce) {
    throw new Error(
      `[Seed Activity Blocked] Database already contains ${existingBookingCount} bookings. Pass --force to seed anyway.`
    );
  }
}

const MUMBAI_LOCATIONS = [
  { address: 'Andheri West, Link Road, Mumbai 400053', coordinates: [72.8295, 19.1364] },
  { address: 'Bandra West, Hill Road, Mumbai 400050', coordinates: [72.8300, 19.0596] },
  { address: 'Powai, Hiranandani Gardens, Mumbai 400076', coordinates: [72.9060, 19.1176] },
  { address: 'Dadar West, Shivaji Park, Mumbai 400028', coordinates: [72.8428, 19.0178] },
  { address: 'Lower Parel, Senapati Bapat Marg, Mumbai 400013', coordinates: [72.8302, 19.0048] },
  { address: 'Worli Sea Face, Mumbai 400018', coordinates: [72.8150, 19.0096] },
];

async function seedDemoActivity({ argv = process.argv.slice(2), env = process.env } = {}) {
  validateEnvironment(env);
  const { dbName: expectedDbName, hasForce } = parseActivityArgs(argv);

  await connectDB();

  try {
    const connectedDbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
    console.log(`[Seed Activity] Connected target database: ${connectedDbName}`);
    assertDatabaseMatch(expectedDbName, connectedDbName);

    const existingCount = await Booking.countDocuments({});
    assertNoExistingActivity(existingCount, hasForce);

    const [customer, admin, settings, services, technicians] = await Promise.all([
      User.findOne({ role: 'customer' }),
      User.findOne({ role: 'admin' }),
      PlatformSettings.getSettings(),
      ServiceCatalog.find({ isActive: true }),
      TechnicianProfile.find({ verificationStatus: 'approved' }).populate('user', 'name email'),
    ]);

    if (!customer || services.length === 0 || technicians.length === 0) {
      throw new Error('[Seed Activity Blocked] Run npm run reset:demo first so base accounts and catalogue exist.');
    }

    const feePerTicket = settings.platformFeePerTicket ?? 50;
    const feePayer = settings.feePayer || 'technician';
    const currency = settings.currency || 'INR';

    const plumbingTechs = technicians.filter((t) => t.serviceCategories.includes('plumbing'));
    const hvacTechs = technicians.filter((t) => t.serviceCategories.includes('hvac'));
    const deliveryTechs = technicians.filter((t) => t.serviceCategories.includes('delivery'));

    const pickTechForCategory = (cat, idx) => {
      const pool = cat === 'plumbing' ? plumbingTechs : cat === 'hvac' ? hvacTechs : deliveryTechs;
      return (pool.length > 0 ? pool : technicians)[idx % (pool.length > 0 ? pool.length : technicians.length)];
    };

    const nonQuoteServices = services.filter((s) => s.pricingType !== 'quotation');
    const nowMs = Date.now();
    let createdCount = 0;

    // 1. Create 31 completed bookings over the last 30 days (with Payment, PlatformFee, Payout, Review; 2 SLA-breached; 1 resolved dispute)
    for (let i = 0; i < 31; i++) {
      const svc = nonQuoteServices[i % nonQuoteServices.length];
      const tech = pickTechForCategory(svc.category, i);
      const loc = MUMBAI_LOCATIONS[i % MUMBAI_LOCATIONS.length];
      const daysAgo = 1 + (i % 29);
      const createdAt = new Date(nowMs - daysAgo * 86400000);
      const completedAt = new Date(createdAt.getTime() + 90 * 60000);
      const amount = svc.basePrice || 800;
      const isSlaBreached = i === 4 || i === 18; // 2 SLA-breached bookings

      const booking = await Booking.create({
        customer: customer._id,
        service: svc._id,
        category: svc.category,
        description: `Completed ${svc.name} request at ${loc.address}`,
        priority: i % 5 === 0 ? 'urgent' : 'normal',
        contactPhone: customer.phone || '90000 00002',
        location: { type: 'Point', coordinates: loc.coordinates, address: loc.address },
        assignedTechnician: tech._id,
        status: 'completed',
        pricing: { type: svc.pricingType, baseAmount: amount, currency },
        completion: {
          status: 'verified',
          finalPrice: amount,
          notes: 'Work completed and tested cleanly.',
          submittedAt: completedAt,
          verifiedAt: completedAt,
        },
        sla: {
          responseDeadline: new Date(createdAt.getTime() + 30 * 60000),
          arrivalDeadline: new Date(createdAt.getTime() + 120 * 60000),
          completionDeadline: new Date(createdAt.getTime() + 240 * 60000),
          breached: isSlaBreached,
          breachReason: isSlaBreached ? 'Heavy monsoon traffic delay' : undefined,
        },
        createdAt,
        updatedAt: completedAt,
        completedAt,
        idempotencyKey: `demo_act_comp_${i}_${Date.now()}`,
      });

      await Payment.create({
        booking: booking._id,
        customer: customer._id,
        technician: tech._id,
        amount,
        currency,
        status: 'captured',
        gatewayRef: `txn_demo_act_${i}_${Date.now()}`,
        idempotencyKey: `demo_pay_${i}_${Date.now()}`,
        attempts: 1,
        createdAt: completedAt,
      });

      await PlatformFee.create({
        booking: booking._id,
        amount: feePerTicket,
        currency,
        feePayer,
        capturedAt: completedAt,
      });

      const feeDeducted = feePayer === 'technician' ? feePerTicket : feePayer === 'split' ? feePerTicket / 2 : 0;
      const payoutAmount = Math.max(0, amount - feeDeducted);

      await Payout.create({
        technician: tech._id,
        booking: booking._id,
        amount: payoutAmount,
        feeDeducted,
        currency,
        status: 'paid',
        paidAt: completedAt,
      });

      const rating = i % 7 === 0 ? 4 : 5;
      await Review.create({
        booking: booking._id,
        customer: customer._id,
        technician: tech._id,
        rating,
        comment: rating === 5 ? 'Prompt arrival and clean work.' : 'Good service.',
      });

      await TechnicianProfile.findByIdAndUpdate(tech._id, {
        $inc: {
          totalEarnings: payoutAmount,
          ratingCount: 1,
          ratingSum: rating,
        },
      });

      // 1 resolved dispute on i === 10
      if (i === 10) {
        await Dispute.create({
          booking: booking._id,
          customer: customer._id,
          technician: tech._id,
          reason: 'Customer questioned replacement valve charge.',
          status: 'resolved',
          resolution: 'partial_refund',
          resolutionNotes: 'Operations desk verified part receipt and issued goodwill credit.',
          resolvedBy: admin?._id,
          resolvedAt: completedAt,
        });
      }

      createdCount++;
    }

    // Recompute technician rating average from ratingSum / ratingCount
    for (const t of technicians) {
      const refreshed = await TechnicianProfile.findById(t._id);
      if (refreshed && refreshed.ratingCount > 0) {
        refreshed.rating = Number((refreshed.ratingSum / refreshed.ratingCount).toFixed(2));
        await refreshed.save();
      }
    }

    // 2. Create 3 cancelled bookings
    for (let i = 0; i < 3; i++) {
      const svc = nonQuoteServices[i % nonQuoteServices.length];
      const loc = MUMBAI_LOCATIONS[i % MUMBAI_LOCATIONS.length];
      await Booking.create({
        customer: customer._id,
        service: svc._id,
        category: svc.category,
        description: `Cancelled ${svc.name} request`,
        priority: 'normal',
        contactPhone: customer.phone || '90000 00002',
        location: { type: 'Point', coordinates: loc.coordinates, address: loc.address },
        status: 'cancelled',
        cancellationReason: 'Customer rescheduled',
        pricing: { type: svc.pricingType, baseAmount: svc.basePrice || 700, currency },
        idempotencyKey: `demo_act_canc_${i}_${Date.now()}`,
      });
      createdCount++;
    }

    // 3. Create 1 open dispute booking
    {
      const svc = nonQuoteServices[0];
      const tech = pickTechForCategory(svc.category, 0);
      const loc = MUMBAI_LOCATIONS[0];
      const disputedBooking = await Booking.create({
        customer: customer._id,
        service: svc._id,
        category: svc.category,
        description: `Disputed ${svc.name} at ${loc.address}`,
        priority: 'normal',
        contactPhone: customer.phone || '90000 00002',
        location: { type: 'Point', coordinates: loc.coordinates, address: loc.address },
        assignedTechnician: tech._id,
        status: 'disputed',
        pricing: { type: svc.pricingType, baseAmount: svc.basePrice || 1000, currency },
        completion: { status: 'disputed', finalPrice: svc.basePrice || 1000, notes: 'Completed repair' },
        idempotencyKey: `demo_act_disp_${Date.now()}`,
      });
      await Dispute.create({
        booking: disputedBooking._id,
        customer: customer._id,
        technician: tech._id,
        reason: 'Minor seepage noticed after repair.',
        status: 'open',
      });
      createdCount++;
    }

    // 4. Create 3 active jobs in assigned, en_route, and in_progress states
    const activeStatuses = ['assigned', 'en_route', 'in_progress'];
    for (let i = 0; i < activeStatuses.length; i++) {
      const svc = nonQuoteServices[i % nonQuoteServices.length];
      const tech = pickTechForCategory(svc.category, i);
      const loc = MUMBAI_LOCATIONS[(i + 2) % MUMBAI_LOCATIONS.length];
      await Booking.create({
        customer: customer._id,
        service: svc._id,
        category: svc.category,
        description: `Active ${svc.name} (${activeStatuses[i]}) at ${loc.address}`,
        priority: i === 1 ? 'urgent' : 'normal',
        contactPhone: customer.phone || '90000 00002',
        location: { type: 'Point', coordinates: loc.coordinates, address: loc.address },
        assignedTechnician: tech._id,
        status: activeStatuses[i],
        pricing: { type: svc.pricingType, baseAmount: svc.basePrice || 800, currency },
        idempotencyKey: `demo_act_active_${i}_${Date.now()}`,
      });
      createdCount++;
    }

    console.log(`[Seed Activity] Created ${createdCount} Mumbai INR demo bookings (completed, cancelled, 2 disputes, 2 SLA-breached, 3 active).`);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seedDemoActivity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(redactSecrets(err));
      process.exit(1);
    });
}

module.exports = {
  parseActivityArgs,
  assertNoExistingActivity,
  seedDemoActivity,
};
