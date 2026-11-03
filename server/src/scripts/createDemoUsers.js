require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');
const InventoryItem = require('../models/InventoryItem');

async function createDemoData() {
  try {
    console.log('[Setup] Connecting to MongoDB...');
    await connectDB();

    const PASSWORD = 'Password123!';

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. Create / Upsert Admin User
    console.log('[1/3] Creating Admin account...');
    let admin = await User.findOne({ email: 'alex.admin@dispatchly.com' });
    if (admin) {
      admin.name = 'Alex Admin';
      admin.passwordHash = PASSWORD;
      admin.role = 'admin';
      admin.phone = '+1 415-555-0199';
      await admin.save();
    } else {
      admin = await User.create({
        name: 'Alex Admin',
        email: 'alex.admin@dispatchly.com',
        passwordHash: PASSWORD,
        role: 'admin',
        phone: '+1 415-555-0199',
      });
    }

    // 2. Create / Upsert Customer User
    console.log('[2/3] Creating Customer account...');
    let customer = await User.findOne({ email: 'claire.customer@dispatchly.com' });
    if (customer) {
      customer.name = 'Claire Customer';
      customer.passwordHash = PASSWORD;
      customer.role = 'customer';
      customer.phone = '+1 415-555-0188';
      await customer.save();
    } else {
      customer = await User.create({
        name: 'Claire Customer',
        email: 'claire.customer@dispatchly.com',
        passwordHash: PASSWORD,
        role: 'customer',
        phone: '+1 415-555-0188',
      });
    }

    // 3. Create / Upsert Technician User, Profile, Inventory & Dummy Document
    console.log('[3/3] Creating Technician account & uploading dummy document...');
    let technician = await User.findOne({ email: 'tom.technician@dispatchly.com' });
    if (technician) {
      technician.name = 'Tom Technician';
      technician.passwordHash = PASSWORD;
      technician.role = 'technician';
      technician.phone = '+1 415-555-0177';
      await technician.save();
    } else {
      technician = await User.create({
        name: 'Tom Technician',
        email: 'tom.technician@dispatchly.com',
        passwordHash: PASSWORD,
        role: 'technician',
        phone: '+1 415-555-0177',
      });
    }

    // Technician Profile
    let techProfile = await TechnicianProfile.findOne({ user: technician._id });
    if (!techProfile) {
      techProfile = await TechnicianProfile.create({
        user: technician._id,
        serviceCategories: ['plumbing', 'hvac'],
        skills: ['pipe_soldering', 'leak_detection', 'ac_diagnostics', 'drain_cleaning'],
        qualifications: ['State Master Plumber License #MP-98214', 'EPA 608 Universal Certified'],
        experienceYears: 7,
        serviceArea: {
          center: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          radiusKm: 30,
        },
        currentLocation: {
          type: 'Point',
          coordinates: [-122.418, 37.776],
        },
        verificationStatus: 'pending', // Pending admin verification
        isAvailable: false,
        vehicleType: 'van',
        packageCapacityKg: 500,
        rating: 5.0,
        reliabilityScore: 100,
      });
    } else {
      techProfile.verificationStatus = 'pending';
      techProfile.isAvailable = false;
      await techProfile.save();
    }

    // Create real dummy PDF/text document file on disk in /uploads/documents
    const docFilename = `dummy_license_${Date.now()}.pdf`;
    const docFullPath = path.join(uploadsDir, docFilename);
    const dummyPdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF'
    );
    fs.writeFileSync(docFullPath, dummyPdfContent);

    // Save Technician Document Record
    await TechnicianDocument.deleteMany({ technician: techProfile._id });
    const techDoc = await TechnicianDocument.create({
      technician: techProfile._id,
      docType: 'trade_license',
      filePath: `documents/${docFilename}`,
      originalName: 'Master_Plumber_License_CA_2026.pdf',
      mimeType: 'application/pdf',
      size: dummyPdfContent.length,
      status: 'pending',
    });

    // Seed spare parts inventory for Tom so he can fulfill plumbing & HVAC jobs
    await InventoryItem.deleteMany({ technician: techProfile._id });
    await InventoryItem.create([
      {
        technician: techProfile._id,
        name: 'Brass Pressure Relief Valve 3/4"',
        category: 'Plumbing',
        partCode: 'VALVE-01',
        quantity: 8,
        reservedQuantity: 0,
        lowStockThreshold: 2,
        unit: 'piece',
      },
      {
        technician: techProfile._id,
        name: 'R410A Refrigerant Cylinder 25lb',
        category: 'HVAC',
        partCode: 'R410A-CYL',
        quantity: 4,
        reservedQuantity: 0,
        lowStockThreshold: 1,
        unit: 'piece',
      },
    ]);

    console.log('\n========================================================');
    console.log(' Successfully Created Accounts & Uploaded Dummy Document!');
    console.log('========================================================');
    console.log('Common Password for all 3 accounts: Password123!\n');
    console.log('1. ADMIN ACCOUNT:');
    console.log('   Email:    alex.admin@dispatchly.com');
    console.log('   Role:     admin');
    console.log('   Action:   Can review & approve Tom\'s document, monitor dispatch, manage settings');
    console.log('\n2. CUSTOMER ACCOUNT:');
    console.log('   Email:    claire.customer@dispatchly.com');
    console.log('   Role:     customer');
    console.log('   Action:   Can browse services, request emergency plumbing/HVAC, live-track tech');
    console.log('\n3. TECHNICIAN ACCOUNT:');
    console.log('   Email:    tom.technician@dispatchly.com');
    console.log('   Role:     technician');
    console.log('   Status:   Pending Verification');
    console.log('   Document: ' + techDoc.originalName + ' (' + techDoc.docType + ')');
    console.log('   Inventory: Stocked with VALVE-01 (8 pcs) & R410A-CYL (4 pcs)');
    console.log('========================================================\n');
  } catch (err) {
    console.error('[Setup Error]', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

createDemoData();
