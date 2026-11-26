require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { redactSecrets } = require('../utils/redact');

const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');
const InventoryItem = require('../models/InventoryItem');
const PlatformSettings = require('../models/PlatformSettings');
const ServiceCatalog = require('../models/ServiceCatalog');
const Booking = require('../models/Booking');
const DispatchOffer = require('../models/DispatchOffer');
const ReassignmentRequest = require('../models/ReassignmentRequest');
const AuditLog = require('../models/AuditLog');
const Quote = require('../models/Quote');
const Payment = require('../models/Payment');
const PlatformFee = require('../models/PlatformFee');
const Payout = require('../models/Payout');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');

const MIN_PASSWORD_LENGTH = 12;

/**
 * Safety guard: validates environment, CLI flags (--confirm and --db=<name>),
 * and required seed password environment variables.
 */
function validateEnvironment(env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error('[Reset Demo Blocked] Cannot run demo reset when NODE_ENV=production.');
  }
}

function parseResetArgs(argv = process.argv.slice(2)) {
  const hasConfirm = argv.includes('--confirm');
  const dbArg = argv.find((arg) => arg.startsWith('--db='));
  const dbName = dbArg ? dbArg.slice('--db='.length).trim() : '';

  if (!hasConfirm) {
    throw new Error('[Reset Demo Blocked] Missing required --confirm flag.');
  }
  if (!dbName) {
    throw new Error('[Reset Demo Blocked] Missing required --db=<databaseName> flag.');
  }

  return { hasConfirm, dbName };
}

function validateSeedPasswords(env = process.env) {
  const requiredVars = [
    'SEED_ADMIN_PASSWORD',
    'SEED_CUSTOMER_PASSWORD',
    'SEED_TECH_PASSWORD',
  ];

  for (const key of requiredVars) {
    const val = env[key];
    if (!val || typeof val !== 'string' || val.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `[Reset Demo Blocked] Environment variable ${key} must be set and at least ${MIN_PASSWORD_LENGTH} characters long.`
      );
    }
  }

  return {
    adminPassword: env.SEED_ADMIN_PASSWORD,
    customerPassword: env.SEED_CUSTOMER_PASSWORD,
    techPassword: env.SEED_TECH_PASSWORD,
  };
}

function assertDatabaseMatch(expectedDbName, connectedDbName) {
  if (!connectedDbName || expectedDbName !== connectedDbName) {
    throw new Error(
      `[Reset Demo Blocked] --db="${expectedDbName}" does not match connected database "${connectedDbName || 'unknown'}".`
    );
  }
}

async function resetDemoDatabase({ argv = process.argv.slice(2), env = process.env } = {}) {
  validateEnvironment(env);
  const { dbName: expectedDbName } = parseResetArgs(argv);
  const passwords = validateSeedPasswords(env);

  await connectDB();

  try {
    const connectedDbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
    console.log(`[Reset Demo] Connected target database: ${connectedDbName}`);
    assertDatabaseMatch(expectedDbName, connectedDbName);

    console.log('[Reset Demo] Wiping all collections...');
    await Promise.all([
      User.deleteMany({}),
      TechnicianProfile.deleteMany({}),
      TechnicianDocument.deleteMany({}),
      InventoryItem.deleteMany({}),
      Booking.deleteMany({}),
      DispatchOffer.deleteMany({}),
      Quote.deleteMany({}),
      Payment.deleteMany({}),
      PlatformFee.deleteMany({}),
      Payout.deleteMany({}),
      Review.deleteMany({}),
      Dispute.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      ReassignmentRequest.deleteMany({}),
      PlatformSettings.deleteMany({}),
      ServiceCatalog.deleteMany({}),
    ]);

    console.log('[Reset Demo] Creating PlatformSettings (INR)...');
    await PlatformSettings.create({
      // PLACEHOLDER: default 50 INR pending operations team's final fee decision
      platformFeePerTicket: 50,
      currency: 'INR',
      offerExpirySeconds: 60,
      dispatchWeights: {
        sla: 30,
        location: 25,
        skills: 15,
        workload: 10,
        inventory: 10,
        reliability: 10,
      },
      slaTargets: {
        plumbing: {
          normal: { responseMinutes: 30, arrivalMinutes: 120, completionMinutes: 240 },
          urgent: { responseMinutes: 10, arrivalMinutes: 45, completionMinutes: 120 },
        },
        hvac: {
          normal: { responseMinutes: 45, arrivalMinutes: 180, completionMinutes: 360 },
          urgent: { responseMinutes: 15, arrivalMinutes: 60, completionMinutes: 180 },
        },
        delivery: {
          normal: { responseMinutes: 15, arrivalMinutes: 45, completionMinutes: 90 },
          urgent: { responseMinutes: 5, arrivalMinutes: 20, completionMinutes: 45 },
        },
      },
      pricingConfig: {
        urgentSurchargePercentage: 20,
        deliveryPricePerKm: 12,
      },
    });

    console.log('[Reset Demo] Creating ServiceCatalog (INR)...');
    await ServiceCatalog.create([
      // Plumbing
      {
        category: 'plumbing',
        name: 'Emergency Pipe Leak Repair',
        code: 'PLUMB_PIPE_LEAK',
        description: 'Rapid diagnosis and sealing of active water pipe leaks and burst joints.',
        pricingType: 'range',
        minPrice: 500,
        maxPrice: 1500,
        basePrice: 1000,
        estimatedDurationMin: 60,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair'],
          requiredParts: [
            { partCode: 'VALVE_BALL_34', name: 'Brass Ball Valve 3/4"', quantity: 1 },
            { partCode: 'TAPE_TEFLON_1', name: 'Teflon Thread Sealant Tape', quantity: 1 },
          ],
        },
      },
      {
        category: 'plumbing',
        name: 'Drain Cleaning',
        code: 'PLUMB_DRAIN_CLEAN',
        description: 'Mechanical drain unblocking and line clearing for kitchen and bathroom drains.',
        pricingType: 'fixed',
        basePrice: 700,
        estimatedDurationMin: 45,
        isActive: true,
        requirements: {
          requiredSkills: ['drain_cleaning'],
        },
      },
      {
        category: 'plumbing',
        name: 'Main Shutoff Valve Replacement',
        code: 'PLUMB_VALVE_REPLACE',
        description: 'Replacement of seized or corroded main water shutoff valve.',
        pricingType: 'fixed',
        basePrice: 1200,
        estimatedDurationMin: 90,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair'],
          requiredParts: [
            { partCode: 'VALVE_BALL_34', name: 'Brass Ball Valve 3/4"', quantity: 1 },
            { partCode: 'TAPE_TEFLON_1', name: 'Teflon Thread Sealant Tape', quantity: 1 },
          ],
        },
      },
      {
        category: 'plumbing',
        name: 'Bathroom Remodel',
        code: 'PLUMB_COMPLEX_REMODEL',
        description: 'Multi-point fixture installation and concealed line work assessed on site.',
        pricingType: 'quotation',
        basePrice: 0,
        estimatedDurationMin: 180,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair', 'copper_soldering'],
        },
      },
      // AC and HVAC
      {
        category: 'hvac',
        name: 'AC Seasonal Service',
        code: 'HVAC_AC_SEASONAL',
        description: 'Coil wash, filter cleaning, airflow check, and electrical inspection.',
        pricingType: 'fixed',
        basePrice: 800,
        estimatedDurationMin: 60,
        isActive: true,
        requirements: {
          requiredSkills: ['ac_diagnostics'],
        },
      },
      {
        category: 'hvac',
        name: 'Refrigerant Recharge',
        code: 'HVAC_REFRIG_REFILL',
        description: 'Pressure check, leak inspection, and refrigerant top-up.',
        pricingType: 'range',
        minPrice: 2200,
        maxPrice: 3500,
        basePrice: 2800,
        estimatedDurationMin: 75,
        isActive: true,
        requirements: {
          requiredSkills: ['refrigerant_recharge', 'ac_diagnostics'],
          requiredParts: [{ partCode: 'REF_R410A_25', name: 'R-410A Refrigerant Cylinder', quantity: 1 }],
        },
      },
      {
        category: 'hvac',
        name: 'Capacitor Replacement',
        code: 'HVAC_CAPACITOR_REPLACE',
        description: 'Replacement of faulty condenser run capacitor and dual relay.',
        pricingType: 'fixed',
        basePrice: 1500,
        estimatedDurationMin: 45,
        isActive: true,
        requirements: {
          requiredSkills: ['compressor_repair'],
          requiredParts: [
            { partCode: 'CAP_RUN_455', name: 'Run Capacitor 45/5 uF', quantity: 1 },
            { partCode: 'RELAY_CONT_30A', name: 'Contactor Relay 30A 24V', quantity: 1 },
          ],
        },
      },
      {
        category: 'hvac',
        name: 'Split AC Installation',
        code: 'HVAC_SPLIT_AC_INSTALL',
        description: 'Indoor and outdoor unit mounting, copper piping, and vacuum testing by quote.',
        pricingType: 'quotation',
        basePrice: 0,
        estimatedDurationMin: 240,
        isActive: true,
        requirements: {
          requiredSkills: ['compressor_repair', 'ac_diagnostics'],
        },
      },
      // Delivery
      {
        category: 'delivery',
        name: 'Document Courier',
        code: 'DELIV_EXPRESS_DOC',
        description: 'Point-to-point urgent courier for contracts, keys, and envelopes.',
        pricingType: 'fixed',
        basePrice: 150,
        estimatedDurationMin: 30,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['motorcycle', 'car', 'bicycle'],
          minPackageCapacityKg: 2,
        },
      },
      {
        category: 'delivery',
        name: 'Parcel Delivery',
        code: 'DELIV_PARCEL_MEDIUM',
        description: 'Same-day urgent parcel delivery across Mumbai.',
        pricingType: 'fixed',
        basePrice: 250,
        estimatedDurationMin: 45,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['motorcycle', 'car', 'van', 'pickup'],
          minPackageCapacityKg: 15,
        },
      },
      {
        category: 'delivery',
        name: 'Cargo Freight',
        code: 'DELIV_CARGO_FREIGHT',
        description: 'Heavy hardware and commercial cargo transport via van or pickup.',
        pricingType: 'range',
        minPrice: 1500,
        maxPrice: 4000,
        basePrice: 2500,
        estimatedDurationMin: 90,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['van', 'pickup'],
          minPackageCapacityKg: 250,
        },
      },
      {
        category: 'delivery',
        name: 'Cold-Chain Delivery',
        code: 'DELIV_CUSTOM_LOGISTICS',
        description: 'Temperature-monitored urgent transit assessed by route and load.',
        pricingType: 'quotation',
        basePrice: 0,
        estimatedDurationMin: 120,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['van', 'pickup'],
          minPackageCapacityKg: 500,
        },
      },
    ]);

    console.log('[Reset Demo] Creating Admin & Customer accounts...');
    const adminUser = await User.create({
      name: 'Rohan Deshmukh',
      email: 'admin@dispatchly.com',
      passwordHash: passwords.adminPassword,
      role: 'admin',
      phone: '90000 00001',
    });

    const customerUser = await User.create({
      name: 'Aarav Mehta',
      email: 'customer@dispatchly.com',
      passwordHash: passwords.customerPassword,
      role: 'customer',
      phone: '90000 00002',
    });

    const now = new Date();
    const techSpecs = [
      {
        email: 'technician@dispatchly.com',
        name: 'Ramesh Patil',
        phone: '90000 00011',
        categories: ['plumbing'],
        skills: ['pipe_repair', 'drain_cleaning', 'copper_soldering'],
        experienceYears: 8,
        coords: [72.8479, 19.1197], // Andheri
        radiusKm: 10,
        vehicleType: 'motorcycle',
        packageCapacityKg: 15,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'plumbing_full',
      },
      {
        email: 'sandeep.yadav@dispatchly.com',
        name: 'Sandeep Yadav',
        phone: '90000 00012',
        categories: ['plumbing'],
        skills: ['pipe_repair', 'drain_cleaning'],
        experienceYears: 6,
        coords: [72.8362, 19.0596], // Bandra
        radiusKm: 10,
        vehicleType: 'motorcycle',
        packageCapacityKg: 15,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'plumbing_full',
      },
      {
        email: 'vikas.shinde@dispatchly.com',
        name: 'Vikas Shinde',
        phone: '90000 00013',
        categories: ['plumbing'],
        skills: ['pipe_repair', 'drain_cleaning'],
        experienceYears: 5,
        coords: [72.8428, 19.0178], // Dadar
        radiusKm: 9,
        vehicleType: 'motorcycle',
        packageCapacityKg: 10,
        verificationStatus: 'approved',
        isAvailable: false,
        stockMode: 'plumbing_partial',
      },
      {
        email: 'imran.shaikh@dispatchly.com',
        name: 'Imran Shaikh',
        phone: '90000 00014',
        categories: ['plumbing'],
        skills: ['pipe_repair'],
        experienceYears: 3,
        coords: [72.9781, 19.2183], // Thane
        radiusKm: 12,
        vehicleType: 'none',
        packageCapacityKg: 0,
        verificationStatus: 'pending',
        isAvailable: false,
        stockMode: 'none',
      },
      {
        email: 'anil.kulkarni@dispatchly.com',
        name: 'Anil Kulkarni',
        phone: '90000 00015',
        categories: ['hvac'],
        skills: ['ac_diagnostics', 'refrigerant_recharge', 'compressor_repair'],
        experienceYears: 9,
        coords: [72.9060, 19.1176], // Powai
        radiusKm: 10,
        vehicleType: 'van',
        packageCapacityKg: 100,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'hvac_full',
      },
      {
        email: 'farhan.ansari@dispatchly.com',
        name: 'Farhan Ansari',
        phone: '90000 00016',
        categories: ['hvac'],
        skills: ['ac_diagnostics', 'refrigerant_recharge', 'compressor_repair'],
        experienceYears: 5,
        coords: [72.8512, 19.1136], // Andheri
        radiusKm: 9,
        vehicleType: 'motorcycle',
        packageCapacityKg: 25,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'hvac_low_part',
      },
      {
        email: 'suresh.nair@dispatchly.com',
        name: 'Suresh Nair',
        phone: '90000 00017',
        categories: ['hvac'],
        skills: ['ac_diagnostics'],
        experienceYears: 4,
        coords: [73.0297, 19.0330], // Navi Mumbai
        radiusKm: 12,
        vehicleType: 'none',
        packageCapacityKg: 0,
        verificationStatus: 'rejected',
        rejectionReason: 'Submitted HVAC trade license expired and address proof is illegible.',
        isAvailable: false,
        stockMode: 'none',
      },
      {
        email: 'rahul.jadhav@dispatchly.com',
        name: 'Rahul Jadhav',
        phone: '90000 00018',
        categories: ['delivery'],
        skills: ['express_courier'],
        experienceYears: 4,
        coords: [72.8400, 19.0544], // Bandra
        radiusKm: 10,
        vehicleType: 'motorcycle',
        packageCapacityKg: 20,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'none',
      },
      {
        email: 'mohammed.siddiqui@dispatchly.com',
        name: 'Mohammed Siddiqui',
        phone: '90000 00019',
        categories: ['delivery'],
        skills: ['heavy_freight', 'cold_chain'],
        experienceYears: 7,
        coords: [72.8478, 19.0213], // Dadar
        radiusKm: 12,
        vehicleType: 'van',
        packageCapacityKg: 750,
        verificationStatus: 'approved',
        isAvailable: true,
        stockMode: 'none',
      },
      {
        email: 'prakash.more@dispatchly.com',
        name: 'Prakash More',
        phone: '90000 00020',
        categories: ['delivery'],
        skills: ['express_courier'],
        experienceYears: 2,
        coords: [72.9685, 19.2094], // Thane
        radiusKm: 8,
        vehicleType: 'motorcycle',
        packageCapacityKg: 20,
        verificationStatus: 'pending',
        isAvailable: false,
        stockMode: 'none',
      },
    ];

    const accountSummary = [
      { email: adminUser.email, role: adminUser.role, name: adminUser.name },
      { email: customerUser.email, role: customerUser.role, name: customerUser.name },
    ];

    console.log('[Reset Demo] Creating 10 Mumbai Technician accounts & inventory...');
    for (const spec of techSpecs) {
      const techUser = await User.create({
        name: spec.name,
        email: spec.email,
        passwordHash: passwords.techPassword,
        role: 'technician',
        phone: spec.phone,
      });

      const profile = await TechnicianProfile.create({
        user: techUser._id,
        serviceCategories: spec.categories,
        skills: spec.skills,
        experienceYears: spec.experienceYears,
        currentLocation: {
          type: 'Point',
          coordinates: spec.coords,
          updatedAt: now,
        },
        serviceArea: {
          center: {
            type: 'Point',
            coordinates: spec.coords,
          },
          radiusKm: spec.radiusKm,
        },
        vehicleType: spec.vehicleType,
        packageCapacityKg: spec.packageCapacityKg,
        verificationStatus: spec.verificationStatus,
        ...(spec.rejectionReason ? { rejectionReason: spec.rejectionReason } : {}),
        ...(spec.verificationStatus === 'approved' ? { verifiedBy: adminUser._id, verifiedAt: now } : {}),
        isAvailable: spec.isAvailable,
      });

      if (spec.stockMode === 'plumbing_full') {
        await InventoryItem.create([
          { technician: profile._id, name: 'Brass Ball Valve 3/4"', category: 'Plumbing', partCode: 'VALVE_BALL_34', quantity: 10, unitCost: 350 },
          { technician: profile._id, name: 'Teflon Thread Sealant Tape', category: 'Plumbing', partCode: 'TAPE_TEFLON_1', quantity: 15, unitCost: 40 },
          { technician: profile._id, name: 'Copper Coupling 1/2"', category: 'Plumbing', partCode: 'PIPE_COPPER_12', quantity: 12, unitCost: 120 },
        ]);
      } else if (spec.stockMode === 'plumbing_partial') {
        await InventoryItem.create([
          { technician: profile._id, name: 'Brass Ball Valve 3/4"', category: 'Plumbing', partCode: 'VALVE_BALL_34', quantity: 3, unitCost: 350 },
        ]);
      } else if (spec.stockMode === 'hvac_full') {
        await InventoryItem.create([
          { technician: profile._id, name: 'R-410A Refrigerant Cylinder', category: 'HVAC', partCode: 'REF_R410A_25', quantity: 6, unitCost: 1800 },
          { technician: profile._id, name: 'Run Capacitor 45/5 uF', category: 'HVAC', partCode: 'CAP_RUN_455', quantity: 10, unitCost: 450 },
          { technician: profile._id, name: 'Contactor Relay 30A 24V', category: 'HVAC', partCode: 'RELAY_CONT_30A', quantity: 10, unitCost: 380 },
        ]);
      } else if (spec.stockMode === 'hvac_low_part') {
        await InventoryItem.create([
          { technician: profile._id, name: 'R-410A Refrigerant Cylinder', category: 'HVAC', partCode: 'REF_R410A_25', quantity: 3, unitCost: 1800 },
          // Deliberately 0 stock for CAP_RUN_455 so eligibility filtering is observable on Capacitor Replacement
          { technician: profile._id, name: 'Run Capacitor 45/5 uF', category: 'HVAC', partCode: 'CAP_RUN_455', quantity: 0, unitCost: 450 },
          { technician: profile._id, name: 'Contactor Relay 30A 24V', category: 'HVAC', partCode: 'RELAY_CONT_30A', quantity: 4, unitCost: 380 },
        ]);
      }

      accountSummary.push({ email: techUser.email, role: techUser.role, name: techUser.name });
    }

    console.log('\n==========================================');
    console.log(' DEMO RESET COMPLETE (MUMBAI / INR)');
    console.log('==========================================');
    console.log(`Target DB: ${connectedDbName}`);
    console.log('Created Accounts:');
    console.table(accountSummary);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  resetDemoDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(redactSecrets(err));
      process.exit(1);
    });
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  validateEnvironment,
  parseResetArgs,
  validateSeedPasswords,
  assertDatabaseMatch,
  resetDemoDatabase,
};
