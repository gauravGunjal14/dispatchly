require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB, disconnectDB } = require('../config/db');
const { redactSecrets } = require('../utils/redact');

const ask = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
};

const createFirstAdmin = async () => {
  try {
    console.log('==================================================');
    console.log('  Dispatchly - Production Initial Admin Setup     ');
    console.log('==================================================\n');

    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      console.error('[Fatal] Database is not connected. Check MONGODB_URI.');
      process.exit(1);
    }

    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.warn(`[Safe Guard] An admin account already exists in this database: ${existingAdmin.email}`);
      console.warn('For security reasons, this script only bootstraps the FIRST admin account.');
      await disconnectDB();
      process.exit(0);
    }

    // Read credentials from env or prompt
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;
    let name = process.env.ADMIN_NAME || 'Platform Administrator';
    let phone = process.env.ADMIN_PHONE || '+1 415-555-0100';

    if (!email) {
      email = await ask('Enter Administrator Email Address: ');
    }
    if (!password) {
      password = await ask('Enter Administrator Password (min 8 characters): ');
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      console.error('[Error] A valid email address is required.');
      await disconnectDB();
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('[Error] Password must be at least 8 characters long.');
      await disconnectDB();
      process.exit(1);
    }

    console.log(`\nCreating initial administrator (${email})...`);
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'admin',
      phone,
      isActive: true,
    });

    console.log('\n[Success] Administrator account created successfully!');
    console.log(`ID:    ${admin._id}`);
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log('\nYou can now log in at your Vercel frontend /login page.\n');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Error creating admin]:', redactSecrets(err));
    await disconnectDB();
    process.exit(1);
  }
};

createFirstAdmin();
