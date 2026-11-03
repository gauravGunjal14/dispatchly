require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

// Safety guard: Strictly block seeding in production
if (process.env.NODE_ENV === 'production') {
  console.error('[Seed Fatal] Seeding is blocked in production environment!');
  process.exit(1);
}

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

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await TechnicianProfile.deleteMany({});
    await TechnicianDocument.deleteMany({});
    await InventoryItem.deleteMany({});
    await PlatformSettings.deleteMany({});
    await ServiceCatalog.deleteMany({});
    await Booking.deleteMany({});
    await DispatchOffer.deleteMany({});
    await ReassignmentRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await Quote.deleteMany({});
    await Payment.deleteMany({});
    await PlatformFee.deleteMany({});
    await Payout.deleteMany({});
    await Review.deleteMany({});
    await Dispute.deleteMany({});
    await Notification.deleteMany({});

    console.log('[Seed] Creating Administrator...');
    const adminUser = await User.create({
      name: 'Operations Dispatcher',
      email: 'admin@dispatchly.com',
      passwordHash: 'password123',
      role: 'admin',
      phone: '+1 415-555-0100',
    });

    console.log('[Seed] Creating Platform Settings...');
    const settings = await PlatformSettings.create({
      platformFeePerTicket: 1.5,
      currency: 'USD',
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
        deliveryPricePerKm: 1.5,
      },
    });

    console.log('[Seed] Creating Customers...');
    const [custAlice, custBob, custSarah, custMike] = await User.create([
      {
        name: 'Alice Customer',
        email: 'customer@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
        phone: '+1 415-555-0101',
      },
      {
        name: 'Bob Customer',
        email: 'bob.customer@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
        phone: '+1 415-555-0102',
      },
      {
        name: 'Sarah Jenkins',
        email: 'sarah.customer@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
        phone: '+1 415-555-0103',
      },
      {
        name: 'Mike Vance',
        email: 'mike.customer@dispatchly.com',
        passwordHash: 'password123',
        role: 'customer',
        phone: '+1 415-555-0104',
      },
    ]);

    console.log('[Seed] Creating Technicians...');
    // 1. Approved Plumber with Inventory
    const plumberUser = await User.create({
      name: 'David Miller',
      email: 'plumber@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0201',
    });

    const plumberProfile = await TechnicianProfile.create({
      user: plumberUser._id,
      serviceCategories: ['plumbing'],
      skills: ['pipe_repair', 'leak_detection', 'drain_cleaning', 'copper_soldering'],
      qualifications: ['California Master Plumber C-36', 'Backflow Prevention Certified'],
      experienceYears: 8,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4194, 37.7749] }, // SF Downtown
        radiusKm: 30,
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.418, 37.7755],
        updatedAt: new Date(),
      },
      vehicleType: 'van',
      packageCapacityKg: 300,
      verificationStatus: 'approved',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 15 * 86400000),
      isAvailable: true,
      rating: 4.9,
      reliabilityScore: 98,
      totalEarnings: 2450.0,
    });

    // 2. Pending Plumber
    const pendingPlumberUser = await User.create({
      name: 'Sam Taylor',
      email: 'sam.plumber@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0202',
    });

    const pendingPlumberProfile = await TechnicianProfile.create({
      user: pendingPlumberUser._id,
      serviceCategories: ['plumbing'],
      skills: ['pipe_repair', 'unclogging'],
      qualifications: ['Apprentice Plumber Certificate'],
      experienceYears: 2,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.2711, 37.8044] }, // Oakland
        radiusKm: 25,
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.2711, 37.8044],
        updatedAt: new Date(),
      },
      vehicleType: 'pickup',
      packageCapacityKg: 150,
      verificationStatus: 'pending',
      isAvailable: false,
      rating: 5.0,
      reliabilityScore: 100,
    });

    // 3. Approved HVAC Specialist with Inventory
    const hvacUser = await User.create({
      name: 'Carlos Mendez',
      email: 'hvac@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0301',
    });

    const hvacProfile = await TechnicianProfile.create({
      user: hvacUser._id,
      serviceCategories: ['hvac'],
      skills: ['ac_diagnostics', 'compressor_repair', 'refrigerant_recharge', 'thermostat_wiring'],
      qualifications: ['EPA 608 Universal Certification', 'NATE Certified Heat Pump & AC'],
      experienceYears: 6,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4183, 37.7599] }, // SF Mission
        radiusKm: 35,
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.417, 37.7605],
        updatedAt: new Date(),
      },
      vehicleType: 'van',
      packageCapacityKg: 400,
      verificationStatus: 'approved',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 30 * 86400000),
      isAvailable: true,
      rating: 4.8,
      reliabilityScore: 95,
      totalEarnings: 3100.0,
    });

    // 4. Rejected HVAC Technician
    const rejectedHvacUser = await User.create({
      name: 'Elena Rostova',
      email: 'elena.hvac@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0302',
    });

    const rejectedHvacProfile = await TechnicianProfile.create({
      user: rejectedHvacUser._id,
      serviceCategories: ['hvac'],
      skills: ['heater_maintenance'],
      qualifications: ['HVAC Level 1 Certificate'],
      experienceYears: 1,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4312, 37.7694] },
        radiusKm: 15,
      },
      verificationStatus: 'rejected',
      rejectionReason: 'EPA 608 Universal certificate expired. Please upload renewed credential.',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 2 * 86400000),
      isAvailable: false,
      rating: 5.0,
      reliabilityScore: 100,
    });

    // 5. Approved Courier (Urgent Delivery)
    const courierUser = await User.create({
      name: 'Marcus Ross',
      email: 'courier@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0401',
    });

    const courierProfile = await TechnicianProfile.create({
      user: courierUser._id,
      serviceCategories: ['delivery'],
      skills: ['freight_courier', 'express_delivery', 'pallet_jack', 'liftgate_handling'],
      qualifications: ['Commercial Driver License (Class B)', 'DOT Medical Card'],
      experienceYears: 5,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4014, 37.7925] }, // SF Financial Dist
        radiusKm: 45,
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.402, 37.793],
        updatedAt: new Date(),
      },
      vehicleType: 'van',
      packageCapacityKg: 850,
      verificationStatus: 'approved',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 10 * 86400000),
      isAvailable: true,
      rating: 4.95,
      reliabilityScore: 99,
      totalEarnings: 1820.0,
    });

    // 6. Pending Courier (Motorcycle)
    const pendingCourierUser = await User.create({
      name: 'Jordan Lee',
      email: 'jordan.courier@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0402',
    });

    const pendingCourierProfile = await TechnicianProfile.create({
      user: pendingCourierUser._id,
      serviceCategories: ['delivery'],
      skills: ['rapid_dispatch', 'small_package'],
      qualifications: ['Motorcycle Endorsement (M1)'],
      experienceYears: 2,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4111, 37.6547] }, // South SF
        radiusKm: 20,
      },
      vehicleType: 'motorcycle',
      packageCapacityKg: 25,
      verificationStatus: 'pending',
      isAvailable: false,
      rating: 5.0,
      reliabilityScore: 100,
    });

    // 7. Approved Plumber without Inventory (demonstrates parts eligibility filter)
    const plumberNoStockUser = await User.create({
      name: 'Lisa Chen',
      email: 'lisa.plumber@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0205',
    });

    const plumberNoStockProfile = await TechnicianProfile.create({
      user: plumberNoStockUser._id,
      serviceCategories: ['plumbing'],
      skills: ['pipe_repair', 'drain_cleaning'],
      qualifications: ['Journeyman Plumber'],
      experienceYears: 4,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.4862, 37.7601] }, // SF Sunset
        radiusKm: 25,
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.485, 37.761],
        updatedAt: new Date(),
      },
      vehicleType: 'van',
      packageCapacityKg: 200,
      verificationStatus: 'approved',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 5 * 86400000),
      isAvailable: true,
      rating: 4.7,
      reliabilityScore: 92,
    });

    // 8. Approved Plumber outside Service Area (demonstrates service area filter)
    const plumberOaklandUser = await User.create({
      name: 'Kevin Park',
      email: 'kevin.plumber@dispatchly.com',
      passwordHash: 'password123',
      role: 'technician',
      phone: '+1 415-555-0206',
    });

    const plumberOaklandProfile = await TechnicianProfile.create({
      user: plumberOaklandUser._id,
      serviceCategories: ['plumbing'],
      skills: ['pipe_repair', 'leak_detection'],
      qualifications: ['Licensed Plumber'],
      experienceYears: 5,
      serviceArea: {
        center: { type: 'Point', coordinates: [-122.2711, 37.8044] }, // Oakland Center
        radiusKm: 5, // Small radius, cannot service SF
      },
      currentLocation: {
        type: 'Point',
        coordinates: [-122.2711, 37.8044],
        updatedAt: new Date(),
      },
      vehicleType: 'van',
      packageCapacityKg: 200,
      verificationStatus: 'approved',
      verifiedBy: adminUser._id,
      verifiedAt: new Date(Date.now() - 8 * 86400000),
      isAvailable: true,
      rating: 4.8,
      reliabilityScore: 94,
    });

    console.log('[Seed] Seeding Technician Verification Documents...');
    await TechnicianDocument.create([
      {
        technician: plumberProfile._id,
        docType: 'trade_license',
        filePath: 'documents/trade_license_miller.pdf',
        originalName: 'California_Master_Plumber_License.pdf',
        mimeType: 'application/pdf',
        size: 245000,
        status: 'verified',
      },
      {
        technician: pendingPlumberProfile._id,
        docType: 'trade_license',
        filePath: 'documents/apprentice_license_sam.pdf',
        originalName: 'Apprentice_Plumber_Certificate_2026.pdf',
        mimeType: 'application/pdf',
        size: 198000,
        status: 'pending',
      },
      {
        technician: pendingPlumberProfile._id,
        docType: 'id_proof',
        filePath: 'documents/driver_license_sam.jpg',
        originalName: 'CA_Driver_License_SamTaylor.jpg',
        mimeType: 'image/jpeg',
        size: 345000,
        status: 'pending',
      },
      {
        technician: courierProfile._id,
        docType: 'vehicle_registration',
        filePath: 'documents/van_registration_marcus.pdf',
        originalName: 'Commercial_Van_Registration.pdf',
        mimeType: 'application/pdf',
        size: 154000,
        status: 'verified',
      },
      {
        technician: pendingCourierProfile._id,
        docType: 'vehicle_registration',
        filePath: 'documents/scooter_permit_jordan.pdf',
        originalName: 'City_Courier_Scooter_Permit.pdf',
        mimeType: 'application/pdf',
        size: 112000,
        status: 'pending',
      },
    ]);

    console.log('[Seed] Populating Spare-Parts Inventory...');
    await InventoryItem.create([
      {
        technician: plumberProfile._id,
        name: 'Copper Pipe Fitting 1/2"',
        partCode: 'PIPE_COPPER_12',
        category: 'Plumbing',
        quantity: 25,
        reservedQuantity: 0,
        unit: 'pcs',
        unitCost: 4.5,
        lowStockThreshold: 5,
      },
      {
        technician: plumberProfile._id,
        name: 'PVC Drain Trap 1.5"',
        partCode: 'PVC_TRAP_15',
        category: 'Plumbing',
        quantity: 15,
        reservedQuantity: 0,
        unit: 'pcs',
        unitCost: 8.0,
        lowStockThreshold: 3,
      },
      {
        technician: plumberProfile._id,
        name: 'Brass Ball Valve 3/4"',
        partCode: 'VALVE_BALL_34',
        category: 'Plumbing',
        quantity: 12,
        reservedQuantity: 0,
        unit: 'pcs',
        unitCost: 14.0,
        lowStockThreshold: 2,
      },
      {
        technician: plumberProfile._id,
        name: 'Teflon Thread Sealant Tape',
        partCode: 'TAPE_TEFLON_1',
        category: 'Plumbing',
        quantity: 40,
        reservedQuantity: 0,
        unit: 'rolls',
        unitCost: 2.0,
        lowStockThreshold: 10,
      },
      {
        technician: pendingPlumberProfile._id,
        name: 'Pipe Snake Cable 25ft',
        partCode: 'SNAKE_CABLE_25',
        category: 'Plumbing',
        quantity: 2,
        reservedQuantity: 0,
        unit: 'units',
        unitCost: 45.0,
        lowStockThreshold: 1,
      },
      {
        technician: hvacProfile._id,
        name: 'R-410A Refrigerant Tank 25lb',
        partCode: 'REF_R410A_25',
        category: 'HVAC',
        quantity: 6,
        reservedQuantity: 0,
        unit: 'tanks',
        unitCost: 180.0,
        lowStockThreshold: 2,
      },
      {
        technician: hvacProfile._id,
        name: 'Run Capacitor 45/5 uF',
        partCode: 'CAP_RUN_455',
        category: 'HVAC',
        quantity: 18,
        reservedQuantity: 0,
        unit: 'pcs',
        unitCost: 22.0,
        lowStockThreshold: 4,
      },
      {
        technician: hvacProfile._id,
        name: 'Smart Programmable Thermostat',
        partCode: 'THERM_SMART_V2',
        category: 'HVAC',
        quantity: 5,
        reservedQuantity: 0,
        unit: 'units',
        unitCost: 110.0,
        lowStockThreshold: 2,
      },
      {
        technician: hvacProfile._id,
        name: 'Contactor Relay 30A 24V',
        partCode: 'RELAY_CONT_30A',
        category: 'HVAC',
        quantity: 14,
        reservedQuantity: 0,
        unit: 'pcs',
        unitCost: 18.5,
        lowStockThreshold: 3,
      },
      {
        technician: rejectedHvacProfile._id,
        name: 'Thermostat Wire 18/5 50ft',
        partCode: 'WIRE_THERM_50',
        category: 'HVAC',
        quantity: 4,
        reservedQuantity: 0,
        unit: 'spools',
        unitCost: 16.0,
        lowStockThreshold: 1,
      },
    ]);

    console.log('[Seed] Populating Service Catalogue...');
    const services = await ServiceCatalog.create([
      // Plumbing
      {
        category: 'plumbing',
        name: 'Emergency Pipe Leak Repair',
        code: 'PLUMB_PIPE_LEAK',
        description: 'Rapid repair of leaking water pipes, copper soldering, and fitting replacements.',
        pricingType: 'range',
        basePrice: 110,
        minPrice: 85,
        maxPrice: 160,
        estimatedDurationMin: 60,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair', 'copper_soldering'],
          requiredParts: [{ partCode: 'PIPE_COPPER_12', name: 'Copper Pipe Fitting 1/2"', quantity: 2 }],
        },
      },
      {
        category: 'plumbing',
        name: 'Drain Cleaning & Snake Unblocking',
        code: 'PLUMB_DRAIN_UNCLOG',
        description: 'Clearing clogged sinks, shower drains, and main sewer line blockages.',
        pricingType: 'fixed',
        basePrice: 95,
        estimatedDurationMin: 45,
        isActive: true,
        requirements: {
          requiredSkills: ['drain_cleaning'],
        },
      },
      {
        category: 'plumbing',
        name: 'Main Shutoff Ball Valve Replacement',
        code: 'PLUMB_VALVE_REPLACE',
        description: 'Replacement of seized or corroded main home water shutoff valve.',
        pricingType: 'fixed',
        basePrice: 145,
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
        name: 'Custom Bathroom Plumbing Remodel',
        code: 'PLUMB_COMPLEX_REMODEL',
        description: 'Extensive multi-line relocation, fixtures, and rough-in plumbing inspection.',
        pricingType: 'quotation',
        basePrice: 0,
        estimatedDurationMin: 180,
        isActive: true,
        requirements: {
          requiredSkills: ['pipe_repair', 'copper_soldering'],
        },
      },
      // HVAC
      {
        category: 'hvac',
        name: 'AC Diagnostic & Filter Tune-Up',
        code: 'HVAC_AC_TUNEUP',
        description: 'Comprehensive cooling diagnostic, airflow measurement, and electrical inspection.',
        pricingType: 'fixed',
        basePrice: 120,
        estimatedDurationMin: 60,
        isActive: true,
        requirements: {
          requiredSkills: ['ac_diagnostics'],
        },
      },
      {
        category: 'hvac',
        name: 'Refrigerant Recharge & Leak Detection',
        code: 'HVAC_REFRIG_REFILL',
        description: 'R-410A pressure test, leak detection, and precision system refrigerant top-up.',
        pricingType: 'range',
        basePrice: 195,
        minPrice: 150,
        maxPrice: 280,
        estimatedDurationMin: 75,
        isActive: true,
        requirements: {
          requiredSkills: ['refrigerant_recharge', 'ac_diagnostics'],
          requiredParts: [{ partCode: 'REF_R410A_25', name: 'R-410A Refrigerant Tank 25lb', quantity: 1 }],
        },
      },
      {
        category: 'hvac',
        name: 'AC Capacitor & Contactor Replacement',
        code: 'HVAC_CAPACITOR_REPLACE',
        description: 'Replacement of burned condenser fan run capacitors and dual relays.',
        pricingType: 'fixed',
        basePrice: 115,
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
        name: 'Central Heat Pump System Replacement',
        code: 'HVAC_CUSTOM_FURNACE',
        description: 'Full heat pump, air handler, and condenser unit replacement consultation.',
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
        name: 'Express Legal Document Courier',
        code: 'DELIV_EXPRESS_DOC',
        description: 'Time-critical door-to-door transit for legal contracts and escrow deeds.',
        pricingType: 'fixed',
        basePrice: 35,
        estimatedDurationMin: 30,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['motorcycle', 'car', 'bicycle'],
          minPackageCapacityKg: 2,
        },
      },
      {
        category: 'delivery',
        name: 'Priority On-Demand Parcel Transit',
        code: 'DELIV_PARCEL_MEDIUM',
        description: 'Same-day urgent parcel delivery across the metro area.',
        pricingType: 'fixed',
        basePrice: 55,
        estimatedDurationMin: 45,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['car', 'van', 'pickup'],
          minPackageCapacityKg: 25,
        },
      },
      {
        category: 'delivery',
        name: 'Commercial Freight & Machinery Transit',
        code: 'DELIV_CARGO_FREIGHT',
        description: 'Heavy equipment cargo transport requiring van or pickup bed.',
        pricingType: 'range',
        basePrice: 160,
        minPrice: 120,
        maxPrice: 250,
        estimatedDurationMin: 90,
        isActive: true,
        requirements: {
          allowedVehicleTypes: ['van', 'pickup'],
          minPackageCapacityKg: 250,
        },
      },
      {
        category: 'delivery',
        name: 'Custom Cold-Chain / Specialized Freight',
        code: 'DELIV_CUSTOM_LOGISTICS',
        description: 'High-value sensitive logistics requiring temperature monitoring or escort.',
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

    console.log('[Seed] Seeding Sample Bookings in Different Statuses...');
    const leakService = services.find((s) => s.code === 'PLUMB_PIPE_LEAK');
    const drainService = services.find((s) => s.code === 'PLUMB_DRAIN_UNCLOG');
    const hvacService = services.find((s) => s.code === 'HVAC_REFRIG_REFILL');
    const acGasService = hvacService;
    const parcelService = services.find((s) => s.code === 'DELIV_PARCEL_MEDIUM');
    const docService = services.find((s) => s.code === 'DELIV_EXPRESS_DOC');

    const now = Date.now();

    // 1. Searching Ticket (Alice)
    await Booking.create({
      ticketNumber: 'BK-202611-1001',
      customer: custAlice._id,
      service: leakService._id,
      category: 'plumbing',
      description: 'Kitchen sink pipe joint is spraying water under high pressure.',
      priority: 'normal',
      contactPhone: '+1 415-555-0101',
      location: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
        address: '750 Market Street, San Francisco, CA',
      },
      requirementSnapshot: leakService.requirements,
      pricing: {
        type: 'range',
        estimatedMin: 85,
        estimatedMax: 160,
        baseAmount: 110,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now + 30 * 60000),
        arrivalDeadline: new Date(now + 120 * 60000),
        completionDeadline: new Date(now + 240 * 60000),
      },
      status: 'searching',
      statusHistory: [
        {
          status: 'searching',
          at: new Date(now - 5 * 60000),
          by: custAlice._id,
          note: 'Customer created booking; matching engine searching.',
        },
      ],
      idempotencyKey: 'seed_idemp_alice_leak_01',
    });

    // 2. Assigned & Active Ticket (Alice - Delivery)
    await Booking.create({
      ticketNumber: 'BK-202611-1002',
      customer: custAlice._id,
      service: parcelService._id,
      category: 'delivery',
      description: 'Rush delivery of dental lab molds to clinic downtown.',
      priority: 'urgent',
      contactPhone: '+1 415-555-0101',
      location: {
        type: 'Point',
        coordinates: [-122.4014, 37.7925],
        address: '50 California Street, San Francisco, CA',
      },
      pickupLocation: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
        address: '750 Market St, SF',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [-122.4014, 37.7925],
        address: '50 California St, SF',
      },
      packageWeightKg: 8,
      packageDescription: 'Dental molds and lab samples',
      requirementSnapshot: parcelService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 69.5, // 55 base + distance fee + urgent
        distanceKm: 2.1,
        urgentSurcharge: 11.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now + 5 * 60000),
        arrivalDeadline: new Date(now + 20 * 60000),
        completionDeadline: new Date(now + 45 * 60000),
      },
      status: 'assigned',
      assignedTechnician: courierProfile._id,
      statusHistory: [
        { status: 'searching', at: new Date(now - 12 * 60000), by: custAlice._id, note: 'Request initiated' },
        { status: 'offered', at: new Date(now - 10 * 60000), note: 'Offer delivered to Marcus Ross' },
        { status: 'assigned', at: new Date(now - 8 * 60000), by: courierUser._id, note: 'Marcus Ross accepted offer' },
      ],
      idempotencyKey: 'seed_idemp_alice_parcel_02',
    });

    // 3. Urgent Offered Ticket (Sarah - HVAC)
    const sarahBooking = await Booking.create({
      ticketNumber: 'BK-202611-1003',
      customer: custSarah._id,
      service: hvacService._id,
      category: 'hvac',
      description: 'Commercial server room AC stopped blowing cold air; server temperature rising rapidly!',
      priority: 'urgent',
      contactPhone: '+1 415-555-0102',
      location: {
        type: 'Point',
        coordinates: [-122.4089, 37.7836],
        address: '300 4th Street, San Francisco, CA',
      },
      requirementSnapshot: hvacService.requirements,
      pricing: {
        type: 'range',
        estimatedMin: 180,
        estimatedMax: 336,
        baseAmount: 234, // includes 20% urgent surcharge
        urgentSurcharge: 39,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now + 15 * 60000),
        arrivalDeadline: new Date(now + 60 * 60000),
        completionDeadline: new Date(now + 180 * 60000),
      },
      status: 'offered',
      dispatch: {
        state: 'awaiting_response',
        attempts: 1,
        excludedTechnicians: [],
      },
      statusHistory: [
        { status: 'searching', at: new Date(now - 2 * 60000), by: custSarah._id, note: 'Urgent emergency HVAC requested.' },
        { status: 'offered', at: new Date(now - 10000), note: 'Sequential offer #1 dispatched to Carlos Mendez.' },
      ],
      dispatchHistory: [
        {
          event: 'started',
          at: new Date(now - 2 * 60000),
        },
        {
          event: 'offered',
          technician: hvacProfile._id,
          at: new Date(now - 10000),
          meta: { attempt: 1, totalScore: 94.5, etaMinutes: 12, distanceKm: 2.8 },
        },
      ],
      idempotencyKey: 'seed_idemp_sarah_hvac_03',
    });

    const activeOffer = await DispatchOffer.create({
      booking: sarahBooking._id,
      technician: hvacProfile._id,
      attempt: 1,
      rank: 1,
      totalScore: 94.5,
      scoreBreakdown: {
        sla: 92,
        location: 95,
        skills: 100,
        workload: 100,
        inventory: 90,
        reliability: 95,
      },
      etaMinutes: 12,
      distanceKm: 2.8,
      status: 'pending',
      expiresAt: new Date(now + 180 * 1000), // 3 minutes remaining countdown
    });

    sarahBooking.dispatch.currentOffer = activeOffer._id;
    await sarahBooking.save();

    // 4. Completed Ticket (Mike - Drain)
    await Booking.create({
      ticketNumber: 'BK-202611-1004',
      customer: custMike._id,
      service: drainService._id,
      category: 'plumbing',
      description: 'Bathroom shower drain completely clogged with slow drainage.',
      priority: 'normal',
      contactPhone: '+1 415-555-0103',
      location: {
        type: 'Point',
        coordinates: [-122.4284, 37.7597],
        address: '3800 17th Street, San Francisco, CA',
      },
      requirementSnapshot: drainService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 95.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now - 24 * 3600000),
        arrivalDeadline: new Date(now - 23 * 3600000),
        completionDeadline: new Date(now - 21 * 3600000),
      },
      status: 'completed',
      assignedTechnician: plumberProfile._id,
      statusHistory: [
        { status: 'searching', at: new Date(now - 25 * 3600000), by: custMike._id },
        { status: 'assigned', at: new Date(now - 24 * 3600000), by: plumberUser._id },
        { status: 'in_progress', at: new Date(now - 23 * 3600000), by: plumberUser._id },
        { status: 'completed', at: new Date(now - 22 * 3600000), by: plumberUser._id, note: 'Drain successfully cleared.' },
      ],
      idempotencyKey: 'seed_idemp_mike_drain_04',
    });

    // 5. Cancelled Ticket (Mike - Document)
    await Booking.create({
      ticketNumber: 'BK-202611-1005',
      customer: custMike._id,
      service: docService._id,
      category: 'delivery',
      description: 'Escrow paperwork delivery - no longer needed as party signed electronically.',
      priority: 'normal',
      contactPhone: '+1 415-555-0103',
      location: {
        type: 'Point',
        coordinates: [-122.435, 37.765],
        address: '500 Castro St, San Francisco, CA',
      },
      requirementSnapshot: docService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 35.0,
        currency: 'USD',
      },
      status: 'cancelled',
      cancellationReason: 'Party signed electronically via DocuSign.',
      statusHistory: [
        { status: 'searching', at: new Date(now - 48 * 3600000), by: custMike._id },
        { status: 'cancelled', at: new Date(now - 47 * 3600000), by: custMike._id, note: 'Cancelled before assignment.' },
      ],
      idempotencyKey: 'seed_idemp_mike_doc_05',
    });

    // 6. En Route Ticket for Live GPS Tracking Simulation
    const enRouteTicket = await Booking.create({
      ticketNumber: 'BK-202611-1006',
      customer: custAlice._id,
      service: leakService._id,
      category: 'plumbing',
      description: 'Kitchen sink pipe dripping onto cabinet floor.',
      priority: 'urgent',
      contactPhone: '+1 415-555-0101',
      location: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749], // SF City Hall
        address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA',
      },
      requirementSnapshot: leakService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 120.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now + 20 * 60000),
        arrivalDeadline: new Date(now + 35 * 60000),
        completionDeadline: new Date(now + 120 * 60000),
        state: 'ok',
      },
      eta: {
        minutes: 12,
        distanceKm: 4.2,
        updatedAt: new Date(),
      },
      status: 'en_route',
      assignedTechnician: plumberProfile._id,
      assignedAt: new Date(now - 15 * 60000),
      enRouteAt: new Date(now - 10 * 60000),
      statusHistory: [
        { status: 'searching', at: new Date(now - 20 * 60000), by: custAlice._id },
        { status: 'assigned', at: new Date(now - 15 * 60000), by: plumberUser._id },
        { status: 'en_route', at: new Date(now - 10 * 60000), by: plumberUser._id },
      ],
      idempotencyKey: 'seed_idemp_alice_leak_06',
    });

    // 7. In Progress Ticket with Approved Quotation
    const hvacQuoteBooking = await Booking.create({
      ticketNumber: 'BK-202611-1007',
      customer: custBob._id,
      service: acGasService._id,
      category: 'hvac',
      description: 'Compressor check and refrigerant recharge.',
      priority: 'normal',
      contactPhone: '+1 415-555-0102',
      location: {
        type: 'Point',
        coordinates: [-122.4089, 37.7836],
        address: '845 Market St, San Francisco, CA',
      },
      requirementSnapshot: acGasService.requirements,
      pricing: {
        type: 'quotation',
        baseAmount: 180.0,
        currency: 'USD',
        quotationRequired: false,
      },
      sla: {
        responseDeadline: new Date(now - 60 * 60000),
        arrivalDeadline: new Date(now - 30 * 60000),
        completionDeadline: new Date(now + 90 * 60000),
        state: 'ok',
      },
      status: 'in_progress',
      assignedTechnician: hvacProfile._id,
      assignedAt: new Date(now - 75 * 60000),
      enRouteAt: new Date(now - 60 * 60000),
      arrivedAt: new Date(now - 35 * 60000),
      startedAt: new Date(now - 20 * 60000),
      statusHistory: [
        { status: 'searching', at: new Date(now - 90 * 60000), by: custBob._id },
        { status: 'assigned', at: new Date(now - 75 * 60000), by: hvacUser._id },
        { status: 'en_route', at: new Date(now - 60 * 60000), by: hvacUser._id },
        { status: 'arrived', at: new Date(now - 35 * 60000), by: hvacUser._id },
        { status: 'in_progress', at: new Date(now - 20 * 60000), by: hvacUser._id },
      ],
      idempotencyKey: 'seed_idemp_bob_hvac_07',
    });

    const approvedQuote = await Quote.create({
      booking: hvacQuoteBooking._id,
      technician: hvacProfile._id,
      lineItems: [
        { description: 'R410A Refrigerant Recharge (2 lbs)', qty: 2, unitPrice: 40.0, total: 80.0 },
        { description: 'Compressor Valve Labor & System Pressure Test', qty: 1, unitPrice: 100.0, total: 100.0 },
      ],
      total: 180.0,
      notes: 'Checked refrigerant leak, valve replacement completed, pressure stable.',
      status: 'approved',
      decidedAt: new Date(now - 22 * 60000),
    });
    hvacQuoteBooking.quote = approvedQuote._id;
    await hvacQuoteBooking.save();

    // 8. Completed - Awaiting Customer Verification
    const awaitingVerifyBooking = await Booking.create({
      ticketNumber: 'BK-202611-1008',
      customer: custAlice._id,
      service: drainService._id,
      category: 'plumbing',
      description: 'Main laundry drain backflow clearing.',
      priority: 'urgent',
      contactPhone: '+1 415-555-0101',
      location: {
        type: 'Point',
        coordinates: [-122.4201, 37.7654],
        address: '2200 Mission St, San Francisco, CA',
      },
      requirementSnapshot: drainService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 110.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now - 120 * 60000),
        arrivalDeadline: new Date(now - 90 * 60000),
        completionDeadline: new Date(now + 30 * 60000),
        state: 'ok',
      },
      status: 'in_progress',
      assignedTechnician: plumberProfile._id,
      assignedAt: new Date(now - 120 * 60000),
      enRouteAt: new Date(now - 100 * 60000),
      arrivedAt: new Date(now - 70 * 60000),
      startedAt: new Date(now - 60 * 60000),
      completion: {
        status: 'submitted',
        submittedAt: new Date(now - 10 * 60000),
        notes: 'Hydro-jetting completed, line clear of debris. Flow test passed.',
        partsUsed: [{ partCode: 'VALVE-01', name: 'Pressure Valve', quantity: 1 }],
        finalPrice: 110.0,
        evidencePhotos: [],
      },
      statusHistory: [
        { status: 'searching', at: new Date(now - 130 * 60000), by: custAlice._id },
        { status: 'assigned', at: new Date(now - 120 * 60000), by: plumberUser._id },
        { status: 'en_route', at: new Date(now - 100 * 60000), by: plumberUser._id },
        { status: 'arrived', at: new Date(now - 70 * 60000), by: plumberUser._id },
        { status: 'in_progress', at: new Date(now - 60 * 60000), by: plumberUser._id },
      ],
      idempotencyKey: 'seed_idemp_alice_drain_08',
    });

    // 9. Completed & Paid (Full settlement, PlatformFee, Payout, 5-Star Review)
    const paidBooking = await Booking.create({
      ticketNumber: 'BK-202611-1009',
      customer: custBob._id,
      service: leakService._id,
      category: 'plumbing',
      description: 'Emergency basement water line repair.',
      priority: 'urgent',
      contactPhone: '+1 415-555-0102',
      location: {
        type: 'Point',
        coordinates: [-122.44, 37.77],
        address: '1500 Haight St, San Francisco, CA',
      },
      requirementSnapshot: leakService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 140.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now - 6 * 3600000),
        arrivalDeadline: new Date(now - 5 * 3600000),
        completionDeadline: new Date(now - 3 * 3600000),
        state: 'ok',
        finalResult: { response: 'met', arrival: 'met', completion: 'met' },
      },
      status: 'completed',
      assignedTechnician: plumberProfile._id,
      assignedAt: new Date(now - 6 * 3600000),
      enRouteAt: new Date(now - 5.5 * 3600000),
      arrivedAt: new Date(now - 5.1 * 3600000),
      startedAt: new Date(now - 5 * 3600000),
      completedAt: new Date(now - 3.5 * 3600000),
      completion: {
        status: 'verified',
        submittedAt: new Date(now - 3.6 * 3600000),
        verifiedAt: new Date(now - 3.5 * 3600000),
        verifiedBy: custBob._id,
        notes: 'Replaced burst copper connector, pressurized line to 60 PSI without drop.',
        finalPrice: 140.0,
      },
      inventorySettled: true,
      statusHistory: [
        { status: 'searching', at: new Date(now - 6.2 * 3600000), by: custBob._id },
        { status: 'assigned', at: new Date(now - 6 * 3600000), by: plumberUser._id },
        { status: 'en_route', at: new Date(now - 5.5 * 3600000), by: plumberUser._id },
        { status: 'arrived', at: new Date(now - 5.1 * 3600000), by: plumberUser._id },
        { status: 'in_progress', at: new Date(now - 5 * 3600000), by: plumberUser._id },
        { status: 'completed', at: new Date(now - 3.5 * 3600000), by: custBob._id },
      ],
      idempotencyKey: 'seed_idemp_bob_burst_09',
    });

    await Payment.create({
      booking: paidBooking._id,
      customer: custBob._id,
      technician: plumberProfile._id,
      amount: 140.0,
      currency: 'USD',
      status: 'captured',
      gatewayRef: 'txn_mock_seed_1009',
      idempotencyKey: 'pay_idemp_1009',
      ledger: [{ status: 'captured', amount: 140.0, note: 'Payment captured at completion' }],
    });

    await PlatformFee.create({
      booking: paidBooking._id,
      amount: 1.5,
      currency: 'USD',
      feePayer: 'technician',
      capturedAt: new Date(now - 3.5 * 3600000),
    });

    await Payout.create({
      technician: plumberProfile._id,
      booking: paidBooking._id,
      amount: 138.5,
      feeDeducted: 1.5,
      currency: 'USD',
      status: 'paid',
      paidAt: new Date(now - 3.5 * 3600000),
    });

    await Review.create({
      booking: paidBooking._id,
      customer: custBob._id,
      technician: plumberProfile._id,
      rating: 5,
      comment: 'Super fast response for an emergency burst pipe! Clean, professional, and explained everything.',
      tags: ['Fast Response', 'Professional', 'Clean Work'],
    });

    plumberProfile.totalEarnings = 138.5;
    plumberProfile.ratingCount = 1;
    plumberProfile.ratingSum = 5;
    plumberProfile.rating = 5.0;
    await plumberProfile.save();

    // 10. Disputed Ticket (Mike - Delivery damaged package)
    const disputedBooking = await Booking.create({
      ticketNumber: 'BK-202611-1010',
      customer: custMike._id,
      service: parcelService._id,
      category: 'delivery',
      description: 'Electronics delivery arrived with water damage to carton.',
      priority: 'urgent',
      contactPhone: '+1 415-555-0103',
      location: {
        type: 'Point',
        coordinates: [-122.414, 37.788],
        address: '400 Post St, San Francisco, CA',
      },
      requirementSnapshot: parcelService.requirements,
      pricing: {
        type: 'fixed',
        baseAmount: 45.0,
        currency: 'USD',
      },
      sla: {
        responseDeadline: new Date(now - 10 * 3600000),
        arrivalDeadline: new Date(now - 9 * 3600000),
        completionDeadline: new Date(now - 7 * 3600000),
        state: 'ok',
      },
      status: 'in_progress',
      assignedTechnician: courierProfile._id,
      assignedAt: new Date(now - 10 * 3600000),
      enRouteAt: new Date(now - 9.5 * 3600000),
      arrivedAt: new Date(now - 9 * 3600000),
      startedAt: new Date(now - 8.8 * 3600000),
      completion: {
        status: 'disputed',
        submittedAt: new Date(now - 8.5 * 3600000),
        notes: 'Package dropped off at lobby front desk as requested.',
        finalPrice: 45.0,
      },
      statusHistory: [
        { status: 'searching', at: new Date(now - 11 * 3600000), by: custMike._id },
        { status: 'assigned', at: new Date(now - 10 * 3600000), by: courierUser._id },
        { status: 'en_route', at: new Date(now - 9.5 * 3600000), by: courierUser._id },
        { status: 'arrived', at: new Date(now - 9 * 3600000), by: courierUser._id },
        { status: 'in_progress', at: new Date(now - 8.8 * 3600000), by: courierUser._id },
      ],
      idempotencyKey: 'seed_idemp_mike_delivery_10',
    });

    await Dispute.create({
      booking: disputedBooking._id,
      raisedBy: custMike._id,
      reason: 'Package was left outdoors in heavy rain and the electronic components inside were damaged.',
      status: 'open',
    });

    console.log('[Seed] Seeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Seed Summary:');
    console.log('Services:    12 services across Plumbing, HVAC, Delivery');
    console.log('Settings:    Platform settings initialized ($1.50 fee, 60s timeout, 100% weights)');
    console.log('Bookings:    10 sample tickets seeded across all lifecycle states:');
    console.log('             - Searching, Assigned, En Route (Live GPS), In Progress (Quotation),');
    console.log('             - Completed (Awaiting Verification), Completed & Paid (Settled + 5-Star Review),');
    console.log('             - Disputed (Open Customer Complaint), Cancelled');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('[Seed Error]', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
